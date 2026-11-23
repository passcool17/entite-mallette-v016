// app.js : la mallette (logique de désamorçage, panneau, minuterie) + l'aperçu CYD.
import { createEye } from './eye.js';
import { EYE, CYD, deepMerge } from './eye-config.js';
import { LAYOUT } from './panel-config.js';
import { initAudio, sfx, speak, voiceLevel, setMuted, isMuted, setCaptionHandler, stopVoice, voiceStats, startMusic, setMusicIntensity, stopMusic, musicStats } from './audio.js';
window.__musique = musicStats;
import { preloadAll } from './preload.js';
import { makeRun, draw, accept, TIERS, trapText, trapRuleText, trapClue, badgeText, keyClueText, wireText, code1Text, CODE2_TEXT, SEQ_TEXT, SEQ2_TEXT, KEYPAD, KEYN, SYM_NAME } from './puzzles.js';
window.__voix = voiceStats;

const VERSION = '0.1.6';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const q = new URLSearchParams(location.search);
const rand = (n) => Math.floor(Math.random() * n);
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
// Partie reproductible : ?seed=N rejoue les mêmes valeurs, ?debug=1 affiche la graine.
const SEED_Q = q.has('seed') && /^\d+$/.test(q.get('seed')) ? Number(q.get('seed')) >>> 0 : null;
const DEBUG = q.get('debug') === '1';
const newSeed = () => (SEED_Q ?? (crypto.getRandomValues?.(new Uint32Array(1))[0] ?? Math.floor(Math.random() * 2 ** 32))) >>> 0;
// Vibrations : no-op silencieux si l'API manque (iPhone)
const canVibrate = typeof navigator.vibrate === 'function';
let vibeOn = localStorage.getItem('entite.vibrations') !== '0';
function buzz(pattern) { if (canVibrate && vibeOn) { try { navigator.vibrate(pattern); } catch { /* rien */ } } }
const BUZZ = { faux: 70, boom: [500, 120, 300, 120, 700], victoire: [90, 90, 90] };
const TIME_S = 480; // 8 min : deux couches de verrous (partie ~2x plus longue)
const fmtPct = (v) => v.toFixed(1).replace('.', ',') + ' %';

if (q.has('cyd')) { bootDone(); registerSW(); initCyd(); } else initCase();

// ================= Écran de chargement =================
// Le cadre est dans index.html (visible avant tout JS) ; ici : pourcentage des médias, erreurs, fin.
function bootDone() {
  const el = document.getElementById('boot'), b = window.__boot;
  if (b) { b.ready = true; b.code = 1; b.asset = 1; b.paint(); }
  if (!el || el.hidden) return;
  el.classList.add('gone');
  setTimeout(() => { el.hidden = true; }, 380);
}
function runBoot(onReady) {
  const b = window.__boot || { paint() {}, problem() {} };
  b.ready = true; b.code = 1; b.paint();
  const $id = (id) => document.getElementById(id), t0 = performance.now();
  let finished = false;
  const finish = () => { if (finished) return; finished = true; clearTimeout(slow); bootDone(); onReady(); };
  const start = () => {
    $id('bootErr').hidden = true; $id('bootActions').hidden = true; $id('bootSub').textContent = 'musique et voix';
    preloadAll((f, done, n) => { b.asset = f; b.paint(); $id('bootSub').textContent = `musique, voix et polices · ${done}/${n}`; })
      .then(({ failed }) => {
        if (finished) return;
        if (!failed.length) { finish(); return; }
        $id('bootRetry').hidden = false;
        b.problem(`${failed.length} fichier${failed.length > 1 ? 's' : ''} n'${failed.length > 1 ? 'ont' : 'a'} pas pu être chargé${failed.length > 1 ? 's' : ''}. Tu peux réessayer, ou jouer sans (voix du téléphone, sans musique).`, true);
      });
  };
  $id('bootRetry').onclick = () => { b.asset = 0; b.shown = Math.min(b.shown, 0.15); start(); };
  $id('bootSkip').onclick = finish;
  // filet : après 8 s, on peut ouvrir sans attendre (le chargement continue en arrière-plan)
  const slow = setTimeout(() => {
    if (finished) return;
    if ($id('bootActions').hidden) { $id('bootSkip').textContent = 'Ouvrir sans attendre'; b.problem('Réseau lent : le chargement continue.', true); $id('bootRetry').hidden = true; }
  }, 8000);
  start();
  return () => performance.now() - t0;
}

// ================= Mallette =================
function initCase() {
  $('#ver').textContent = VERSION;
  $('#btnStart').disabled = true;
  // le service worker ne s'installe qu'après le préchargement : il ne lui vole pas la bande passante
  runBoot(() => { $('#btnStart').disabled = false; $('#btnStart').focus({ preventScroll: true }); registerSW(); });
  const eye = createEye($('#eye'), { config: deepMerge(EYE, { radiusOfMin: 0.25, center: { x: 0.5, y: 0.53 } }), reducedMotion: reduced });
  window.__eye = eye;
  eye.start();
  setCaptionHandler((t) => { $('#caption').textContent = t; });

  // ---------- panneau à l'échelle réelle ----------
  const panel = $('#panel');
  const landMQ = matchMedia('(orientation: landscape) and (min-width: 700px)');
  function layoutPanel() {
    const L = landMQ.matches ? LAYOUT.landscape : LAYOUT.portrait;
    panel.classList.toggle('land', L === LAYOUT.landscape);
    if (L === LAYOUT.landscape) {
      // paysage : le panneau entier tient dans la hauteur visible (barres du navigateur comprises), rapport 273:169 gardé
      const top = panel.getBoundingClientRect().top + scrollY;
      const avail = Math.max(160, innerHeight - top - 8);
      panel.style.width = `min(100%, ${Math.floor(avail * L.width / L.height)}px)`;
    } else panel.style.width = '';
    const mm = panel.clientWidth / L.width;
    panel.style.setProperty('--mm', mm + 'px');
    for (const el of $$('[data-part]', panel)) {
      const r = L[el.dataset.part];
      if (!r) continue;
      Object.assign(el.style, { left: r.x * mm + 'px', top: r.y * mm + 'px', width: r.w * mm + 'px', height: r.h * mm + 'px' });
      el.classList.toggle('rot', !!r.rot);
    }
  }
  layoutPanel();
  new ResizeObserver(layoutPanel).observe(panel);
  new ResizeObserver(layoutPanel).observe($('.status'));
  addEventListener('resize', layoutPanel);
  landMQ.addEventListener('change', () => { layoutPanel(); applyLoupe(); });

  // CYD 1 : miroir de l'œil, cadré comme l'écran réel (240x320)
  const c1 = $('#cyd1'), c1x = c1.getContext('2d', { alpha: false }), eyeCanvas = $('#eye');
  c1.width = 180; c1.height = 240;
  function mirrorCyd1() {
    const e = eye.center;
    let sw = Math.min(e.w, e.r * 4.4), sh = sw * 4 / 3;
    if (sh > e.h) { sh = e.h; sw = sh * 3 / 4; }
    c1x.drawImage(eyeCanvas, e.x - sw / 2, Math.max(0, Math.min(e.h - sh, e.y - sh / 2)), sw, sh, 0, 0, 180, 240);
  }

  // ---------- 7 segments ----------
  const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
  const h = (x0, x1, y) => `${x0 + 3},${y} ${x0 + 6},${y - 3} ${x1 - 6},${y - 3} ${x1 - 3},${y} ${x1 - 6},${y + 3} ${x0 + 6},${y + 3}`;
  const v = (x, y0, y1) => `${x},${y0 + 3} ${x + 3},${y0 + 6} ${x + 3},${y1 - 6} ${x},${y1 - 3} ${x - 3},${y1 - 6} ${x - 3},${y0 + 6}`;
  const segPts = { a: h(4, 30, 4), g: h(4, 30, 30), d: h(4, 30, 56), f: v(4, 4, 30), b: v(30, 4, 30), e: v(4, 30, 56), c: v(30, 30, 56) };
  const offs = [0, 36, 86, 122];
  let svg = '<svg viewBox="0 0 160 60" aria-hidden="true"><g transform="skewX(-6) translate(6 0)">';
  offs.forEach((ox, d) => { for (const k in segPts) svg += `<polygon data-d="${d}" data-s="${k}" transform="translate(${ox} 0)" points="${segPts[k]}" class="off"/>`; });
  svg += '<g class="colon"><circle cx="76" cy="20" r="3.2" class="on"/><circle cx="74" cy="42" r="3.2" class="on"/></g></g></svg>';
  $('#timer').innerHTML = svg; $('#tm1637').innerHTML = svg;
  const segEls = $$('#timer polygon, #tm1637 polygon');
  const colons = $$('#timer .colon, #tm1637 .colon');
  let shownTime = '';
  function showTime(sec) {
    sec = Math.max(0, Math.ceil(sec));
    const m = Math.floor(sec / 60), s = sec % 60, str = `${String(m).padStart(2, '0')}${String(s).padStart(2, '0')}`;
    if (str === shownTime) return;
    shownTime = str;
    for (const el of segEls) el.setAttribute('class', SEG[str[+el.dataset.d]].includes(el.dataset.s) ? 'on' : 'off');
    $('#timer').setAttribute('aria-label', `Temps restant ${m} minute${m > 1 ? 's' : ''} ${s} seconde${s > 1 ? 's' : ''}`);
  }

  // ---------- barres WS2812B ----------
  const mkBar = (b) => { for (let i = 0; i < 8; i++) { const l = document.createElement('span'); l.className = 'led'; b.append(l); } return [...b.children]; };
  const bars = [[mkBar($('#bar1')), mkBar($('#pbar1'))], [mkBar($('#bar2')), mkBar($('#pbar2'))]];
  function setBar(n, colors) { for (const leds of bars[n]) leds.forEach((l, i) => { const c = colors[i]; l.classList.toggle('lit', !!c); if (c) l.style.setProperty('--c', c); }); }

  // ---------- clés Gebildet ----------
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  defs.setAttribute('width', '0'); defs.setAttribute('height', '0'); defs.style.position = 'absolute';
  defs.innerHTML = '<defs><linearGradient id="keymetal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3f6f8"/><stop offset=".5" stop-color="#9aa6b0"/><stop offset="1" stop-color="#e2e8ec"/></linearGradient></defs>';
  document.body.prepend(defs);
  const CROSS = '<path class="bow" d="M24 6h12v18h18v12H36v18H24V36H6V24h18z"/><circle cx="30" cy="30" r="4" fill="#20262c"/>';
  const BLADE = '<rect class="bow" x="23" y="5" width="14" height="50" rx="6"/><circle cx="30" cy="13" r="2.6" fill="#20262c"/>';
  const KEYS = [
    { id: 'xa', label: 'Croix A', cross: true }, { id: 'xb', label: 'Croix B', cross: true },
    { id: 'k1', label: 'I' }, { id: 'k2', label: 'II' }, { id: 'k3', label: 'III' },
  ];
  const keyEl = {};
  for (const k of KEYS) {
    const w = document.createElement('div');
    w.className = 'keysw'; w.dataset.key = k.id; w.dataset.state = 'empty';
    w.innerHTML = `<button class="keysw-btn" type="button" role="switch" aria-checked="false" aria-label="Clé ${k.label}, vide">
      <span class="keysw-nut"></span><span class="keysw-face"></span><span class="keysw-slot${k.cross ? ' x' : ''}"></span>
      <span class="keysw-head"><svg viewBox="0 0 60 60">${k.cross ? CROSS : BLADE}</svg></span>
      <span class="keysw-dots"><span class="keysw-dot r"></span><span class="keysw-dot g"></span></span></button>
      <span class="part-label${k.cross ? ' x' : ''}">${k.label}</span>`;
    $('#keyrow').append(w);
    keyEl[k.id] = { w, btn: w.querySelector('button'), label: k.label };
    const btn = keyEl[k.id].btn;
    btn.addEventListener('pointerdown', (e) => { e.preventDefault(); lookAtEl(btn); onKey(k.id); });
    btn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onKey(k.id); } });
  }
  function setKey(id, state, extra = {}) {
    const k = keyEl[id];
    k.w.dataset.state = state;
    k.w.classList.toggle('locked', !!extra.locked);
    k.w.classList.toggle('pending', !!extra.pending);
    k.btn.setAttribute('aria-checked', state === 'on' ? 'true' : 'false');
    k.btn.setAttribute('aria-label', `Clé ${k.label}, ${state === 'empty' ? 'vide' : state === 'on' ? 'tournée (marche)' : 'insérée (arrêt)'}${extra.locked ? ', verrouillée' : ''}`);
  }
  function denyKey(id) { const w = keyEl[id].w; w.classList.remove('deny'); void w.offsetWidth; w.classList.add('deny'); sfx.error(); buzz(BUZZ.faux); }

  // ---------- trappes ----------
  const TRAP_ART = {
    croix: `<svg viewBox="0 0 120 52" aria-hidden="true"><g fill="url(#keymetal)" stroke="#1c2329"><path d="M12 14h8v8h8v8h-8v8h-8v-8H4v-8h8z"/><rect x="28" y="23" width="26" height="6" rx="2"/><path d="M66 14h8v8h8v8h-8v8h-8v-8h-8v-8h8z" transform="translate(18 0)"/><rect x="100" y="23" width="16" height="6" rx="2"/></g></svg>`,
    badge: `<svg viewBox="0 0 120 52" aria-hidden="true"><rect x="22" y="6" width="76" height="42" rx="5" fill="#0e2a3a" stroke="#62d6ff" stroke-width="1.5"/><rect x="30" y="16" width="16" height="12" rx="2" fill="#c6a76a"/><path d="M30 22h16M38 16v12" stroke="#7d6538" stroke-width="1"/><text x="54" y="26" font-family="JetBrains Mono" font-size="9" fill="#dce9f4">PODKOVA</text><path d="M54 36h34" stroke="#62d6ff" stroke-width="2" stroke-dasharray="3 2"/></svg>`,
    cles: `<svg viewBox="0 0 120 52" aria-hidden="true"><circle cx="20" cy="26" r="11" fill="none" stroke="#c6a76a" stroke-width="3"/><g fill="url(#keymetal)" stroke="#1c2329"><rect x="30" y="8" width="64" height="7" rx="3"/><rect x="30" y="22.5" width="80" height="7" rx="3"/><rect x="30" y="37" width="70" height="7" rx="3"/></g><g font-family="JetBrains Mono" font-size="7" fill="#1c2329"><text x="80" y="14">I</text><text x="96" y="28.5">II</text><text x="84" y="43">III</text></g></svg>`,
  };
  const TRAP_LABEL = { croix: 'Prendre les deux moitiés de la clé en croix', badge: 'Prendre les trois badges Podkova', cles: 'Prendre les clés I, II et III' };
  const traps = {};
  for (const t of $$('.trap')) {
    const n = t.dataset.trap, b = t.querySelector('.trap-key');
    // étape 2 : la trappe de la clé en croix se déduit ; chaque trappe fermée devient touchable
    const pick = document.createElement('button');
    pick.type = 'button'; pick.className = 'trap-pick'; pick.hidden = true; pick.setAttribute('aria-label', `Ouvrir la trappe ${n}`);
    pick.addEventListener('click', () => chooseTrap(+n));
    t.append(pick);
    traps[n] = { el: t, btn: b, pick, item: '' };
    b.addEventListener('click', () => pickTrap(+n));
  }
  function trapsChoosable(on) { for (const n in traps) traps[n].pick.hidden = !on || traps[n].el.classList.contains('taken'); $('#traps').classList.toggle('choose', on); }
  function chooseTrap(n) {
    if (!g.running || g.step !== 1) return;
    lookAtEl(traps[n].el);
    if (n === g.trapOf.croix) { trapsChoosable(false); openTrap('croix'); c2View('locked'); return; }
    const d = traps[n].el; d.classList.remove('deny'); void d.offsetWidth; d.classList.add('deny');
    penalty(PEN.ordre, 'trappeVide');
    setStatus(`Trappe ${n} vide. Moins cinq secondes. Une seule ${g.trapTrue === 1 ? 'dit vrai' : 'ment'}.`);
  }
  // chaque partie range la clé en croix, le badge et les clés I-III dans des trappes tirées au sort
  function fillTraps() {
    for (const item in g.trapOf) {
      const t = traps[g.trapOf[item]];
      t.item = item; t.btn.innerHTML = TRAP_ART[item]; t.btn.setAttribute('aria-label', TRAP_LABEL[item]);
    }
  }
  function openTrap(item) {
    const t = traps[g.trapOf[item]];
    t.el.classList.add('open');
    t.btn.hidden = false;
    sfx.servo();
    setTimeout(() => speak('trappe'), 700);
  }
  function pickTrap(n) {
    const t = traps[n];
    if (!g.running || t.btn.hidden) return;
    t.btn.hidden = true;
    t.el.classList.remove('open'); t.el.classList.add('taken');
    sfx.pickup();
    const item = t.item;
    if (item === 'badge') {
      g.badge = true; g.badgeSel = -1;
      c2View('badges');
      speak('clones');
      setStatus(`${badgeText(g.badgeRule)} Choisis-le sur l'écran 2, puis le lecteur RFID.`);
      return;
    }
    const ids = item === 'croix' ? ['xa', 'xb'] : ['k1', 'k2', 'k3'];
    ids.forEach((id) => setKey(id, 'off'));
    keyEl[ids[0]].btn.focus({ preventScroll: true });
    if (item === 'cles') { g.keysPicked3 = true; const sub = $('[data-sub]', c2); if (sub) sub.textContent = ''; }
    setStatus(item === 'croix' ? 'Clés insérées. Tourne Croix A et Croix B ensemble, à moins d\'une seconde.' : 'Clés insérées. Ordre : les indices de l\'écran 2.');
  }

  // ---------- clavier ----------
  const KP = ['1', '2', '3', 'A', '4', '5', '6', 'B', '7', '8', '9', 'C', '*', '0', '#', 'D'];
  for (const c of KP) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'kp' + (/[A-D]/.test(c) ? ' l' : /[*#]/.test(c) ? ' s' : ''); b.textContent = c;
    b.setAttribute('aria-label', c === '*' ? 'Effacer' : c === '#' ? 'Valider' : `Touche ${c}`);
    b.addEventListener('click', () => onKeypad(c));
    $('#keypad').append(b);
  }
  function showEntry() { const el = $('[data-entry]', c2); if (el) el.textContent = [0, 1, 2, 3].map((i) => g.entry[i] || '_').join(' '); }

  // ---------- écran 2 (CYD) ----------
  const c2 = $('#cyd2');

  // ---------- loupe (paysage) ----------
  // En paysage, l'écran 2 à l'échelle est trop petit pour les fils et le code : à ces étapes, l'écran 2 (et le clavier
  // pour le code) passent agrandis dans la colonne de l'œil, avec des zones de 44 px. Un fantôme reste à leur place.
  const LOUPE = { wires: ['#cyd2'], badges: ['#cyd2'], suite: ['#cyd2'], trappes: ['#cyd2'], order: ['#cyd2'], code: ['#cyd2'], pilule: ['#cyd2', '#keypad'] };
  const BIG = ['wires', 'badges', 'suite', 'trappes', 'order', 'code']; // vues agrandies aussi en portrait
  const loupe = $('#loupe'), home = new Map();
  function applyLoupe() {
    // portrait : seulement les fils, si la zone de l'œil peut contenir les 5 fils de 44 px (sinon, défilement vers l'écran 2)
    const big = BIG.includes(g.c2);
    // portrait : l'écran 2 (et, pour le code, le clavier à côté) passe dans la zone de l'œil si elle est assez haute
    const zoom = big || g.c2 === 'pilule';
    const portraitWires = !landMQ.matches && zoom && $('#stage').clientHeight >= 330;
    const want = g.running && (landMQ.matches || portraitWires) ? (LOUPE[g.c2] || []).map((sel) => $(sel)) : [];
    if (g.running && zoom && !landMQ.matches) {
      if (portraitWires) scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }); // règle (barre d'étape) + fils visibles ensemble
      else c2.scrollIntoView({ block: 'end', behavior: reduced ? 'auto' : 'smooth' });
    }
    for (const [el, h] of home) {
      if (want.includes(el)) continue;
      h.ghost.replaceWith(el); home.delete(el);
    }
    for (const el of want) {
      if (home.has(el)) continue;
      const ghost = el.cloneNode(false);
      ghost.removeAttribute('id'); ghost.removeAttribute('role'); ghost.removeAttribute('aria-live'); ghost.removeAttribute('aria-label');
      ghost.classList.add('ghost'); ghost.setAttribute('aria-hidden', 'true'); ghost.textContent = 'agrandi ◀';
      el.replaceWith(ghost); home.set(el, { ghost });
      loupe.append(el);
    }
    loupe.dataset.view = want.length ? g.c2 : '';
    loupe.hidden = !want.length;
    layoutPanel();
  }
  const WIRES = { rouge: '#ff3b30', bleu: '#3d8bff', jaune: '#ffd23d', vert: '#3dff95', blanc: '#e8eef2' };
  const SEQC = { rouge: '#ff3b30', bleu: '#3d8bff', jaune: '#ffd23d', vert: '#3dff95' };
  const symLabel = (b) => [...b].map((x) => SYM_NAME[x]).join(', ');
  function c2Head() { return `<div class="c2-head"><span>CYD2</span><span data-code${g.codeKnown ? ` aria-label="Badge lu : ${symLabel(g.badgeReal)}"` : ''}>${g.codeKnown ? 'BADGE ' + g.badgeReal : 'HORS LIGNE'}</span></div>`; }
  function seqHtml(seq) {
    return `<div class="seq" role="img" aria-label="Suite : ${seq.map((c) => c ?? 'case vide').join(', ')}">${seq.map((c) => (c ? `<span class="dot" style="--dc:${SEQC[c]}"><b>${c[0].toUpperCase()}</b></span>` : '<span class="dot hole"><b>?</b></span>')).join('')}</div>`;
  }
  function gridHtml(grid) {
    return `<div class="kgrid" role="img" aria-label="Grille du clavier : ${grid.map((x, i) => (x ? `${SYM_NAME[x]} en case ${i + 1}` : '')).filter(Boolean).join(', ')}">${grid.map((x, i) => `<span class="${x ? 'on' : /\d/.test(KEYPAD[i]) ? '' : 'off'}">${x}</span>`).join('')}</div>`;
  }
  const P2 = () => g.step >= 6; // seconde couche
  function c2View(view) {
    g.c2 = view;
    clearInterval(g.lieTimer);
    queueMicrotask(applyLoupe);
    if (view === 'locked') c2.innerHTML = `${c2Head()}<div class="c2-center"><span class="c2-msg">SYSTÈME VERROUILLÉ</span><span class="c2-msg c2-dim">attente du code source</span></div>`;
    if (view === 'suite') {
      c2.innerHTML = `${c2Head()}<div class="c2-center"><span class="c2-msg">SUITE${P2() ? ' · COUCHE 2' : ''}</span>${seqHtml(P2() ? g.seq2 : g.seq1)}<span class="c2-msg c2-dim">sa couleur d'abord</span></div>`;
    }
    if (view === 'trappes') {
      c2.innerHTML = `${c2Head()}<div class="c2-center"><span class="c2-msg">${trapRuleText(g.trapTrue)}</span><div class="tstmts">${g.trapStmts.map((t, i) => `<span><b>T${i + 1}</b><i data-stmt>${trapText(t)}</i></span>`).join('')}</div></div>`;
    }
    if (view === 'code') {
      // mensonge : un clone s'affiche d'abord, puis le vrai badge lu
      c2.innerHTML = `${c2Head()}<div class="c2-center"><span class="c2-msg">PODKOVA · LU</span><span class="c2-big" data-big></span><span class="c2-msg c2-dim">garde ces symboles</span></div>`;
      glitchSwap($('[data-big]', c2), [...g.badges[(g.badgeIdx + 1) % 3]].join(' '), [...g.badgeReal].join(' '), 1500);
    }
    if (view === 'order') {
      const p2 = P2(), cur = p2 ? g.order2 : g.order, st = g.step;
      c2.innerHTML = `${c2Head()}<div class="c2-center"><span class="c2-msg">ORDRE${p2 ? ' · COUCHE 2' : ''}</span><span class="c2-big c2-mid c2-lines" data-big></span><span class="c2-msg c2-dim" data-sub>${p2 ? 'nouveaux indices' : g.keysPicked3 ? '' : `trappe ${g.trapOf.cles} ouverte`}</span></div>`;
      const truth = (p2 ? g.keyClues2 : g.keyClues).map(keyClueText).join('\n');
      const lie = () => { let o; do { o = shuffle([0, 1, 2]); } while (o.join() === cur.join()); return o.map((i) => KEYN[i]).join(' · '); };
      glitchSwap($('[data-big]', c2), lie(), truth, 1800);
      if (g.hard) g.lieTimer = setInterval(() => { const el = $('[data-big]', c2); if (el && g.step === st) glitchSwap(el, lie(), truth, 700); }, 7000 + rand(3000));
    }
    if (view === 'badges') {
      c2.innerHTML = `${c2Head()}<span class="c2-msg">PODKOVA · 3 CLONES</span><div class="badges">${g.badges.map((b, i) => `<button class="badge" type="button" data-i="${i}" aria-pressed="false" aria-label="Badge ${i + 1} : ${symLabel(b)}">${[...b].join(' ')}</button>`).join('')}</div>`;
      $$('.badge', c2).forEach((bt) => bt.addEventListener('click', () => {
        if (!g.running || g.step !== 2) return;
        sfx.click(); g.badgeSel = +bt.dataset.i;
        $$('.badge', c2).forEach((o) => o.setAttribute('aria-pressed', String(o === bt)));
        $('#rfid').classList.add('ready');
        setStatus(`Badge ${g.badges[g.badgeSel]} en main. Présente-le au lecteur RFID.`);
        if (!landMQ.matches) $('#rfid').scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
      }));
    }
    if (view === 'reboot') c2.innerHTML = `${c2Head()}<div class="c2-center"><span class="c2-big">COUCHE 2</span><span class="c2-msg">redémarrage des verrous</span></div>`;
    if (view === 'fini') c2.innerHTML = `${c2Head()}<div class="c2-center"><span class="c2-big glitch">TERMINÉ</span><span class="c2-msg">tu as gagné</span></div>`;
    if (view === 'wires') {
      const ws = P2() ? g.wires2 : g.wires;
      let html = `${c2Head()}<span class="c2-msg" data-hint></span><div class="wires">`;
      ws.forEach((w, i) => {
        html += `<button class="wire" type="button" data-i="${i}" style="--wc:${WIRES[w]}" aria-label="Fil ${i + 1}, ${w}"><svg viewBox="0 0 130 22" preserveAspectRatio="none" aria-hidden="true"><path class="w-l" d="M2 11 C 20 ${rand(2) ? 3 : 19}, 40 ${rand(2) ? 3 : 19}, 63 11"/><path class="w-r" d="M67 11 C 88 ${rand(2) ? 3 : 19}, 108 ${rand(2) ? 3 : 19}, 128 11"/></svg><span class="wire-name">${w.toUpperCase()}</span></button>`;
      });
      c2.innerHTML = html + '</div>';
      const fake = P2() ? g.fakeWire2 : g.fakeWire; // un faux fil, jamais le bon
      glitchSwap($('[data-hint]', c2), `COUPE LE FIL ${fake + 1}`, 'APPLIQUE LA RÈGLE', 1500);
      $$('.wire', c2).forEach((b) => b.addEventListener('click', () => cutWire(+b.dataset.i, b)));
    }
    if (view === 'pilule') {
      c2.innerHTML = `${c2Head()}<div class="c2-center"><span class="c2-msg" data-hint>${P2() ? 'NOUVELLE GRILLE' : 'GRILLE DU CLAVIER'}</span><span class="c2-badge" aria-label="Badge lu : ${symLabel(g.badgeReal)}">BADGE ${[...g.badgeReal].join(' ')}</span>${gridHtml(P2() ? g.grid2 : g.grid1)}<span class="c2-big c2-entry" data-entry>_ _ _ _</span></div>`;
      if (P2()) glitchSwap($('[data-hint]', c2), `CODE 2 : ${fakeCode()}`, 'NOUVELLE GRILLE', 1600);
    }
    if (view === 'upload') {
      c2.innerHTML = `${c2Head()}<div class="c2-center"><span class="c2-msg">PILULE EMPOISONNÉE</span><span class="c2-big" data-pct>0 %</span><span class="c2-bar"><i data-bar></i></span><span class="c2-msg c2-dim">téléversement</span></div>`;
    }
    if (view === 'sealed') c2.innerHTML = `${c2Head()}<div class="c2-center"><span class="c2-big">LECTEUR 5D</span><span class="c2-msg">ENTITÉ CONFINÉE</span></div>`;
    if (view === 'boom') c2.innerHTML = `<div class="c2-center"><span class="c2-big glitch">ERREUR</span><span class="c2-msg">signal perdu</span></div>`;
  }
  function fakeCode() { let s; do { s = String(rand(10000)).padStart(4, '0'); } while (s === g.code || s === g.code2); return s; }
  // l'Entité ment : son œil grésille (rouge, saccadé) tant que le faux texte est affiché
  // un seul minuteur partagé, mais on ne le raccourcit jamais : l'œil reste rouge jusqu'à la fin du mensonge le plus long
  let lieT = 0, lieUntil = 0;
  function flagLie(ms, caption = false) {
    const st = $('#stage'), p1 = $('[data-part="cyd1"]'), cap = $('#caption');
    st.classList.add('liar'); p1.classList.add('liar');
    if (caption) cap.classList.add('glitch'); // la réplique elle-même est un mensonge
    const until = performance.now() + ms;
    if (until <= lieUntil) return;
    lieUntil = until;
    clearTimeout(lieT);
    lieT = setTimeout(() => { lieUntil = 0; st.classList.remove('liar'); p1.classList.remove('liar'); cap.classList.remove('glitch'); }, ms);
  }
  function glitchSwap(el, lie, truth, ms) {
    if (!el) return;
    el.textContent = lie; el.classList.add('glitch');
    flagLie((reduced ? Math.min(ms, 900) : ms) + 420); // + brouillage (6 x 60 ms) : rouge tant que le texte grésille
    const chars = '█▓▒░#%&@0123456789';
    const keep = (c) => c === ' ' || c === '·' || c === '\n';
    setTimeout(() => {
      let n = 0;
      const iv = setInterval(() => {
        n++;
        el.textContent = n > 5 ? truth : [...truth].map((c) => (keep(c) ? c : chars[rand(chars.length)])).join('');
        if (n > 5) { clearInterval(iv); el.classList.remove('glitch'); }
      }, 60);
    }, reduced ? Math.min(ms, 900) : ms);
  }

  // ---------- état ----------
  // 12 étapes : couche 1 (0-5) puis seconde couche (6-11)
  // textes courts, sans formule : chaque énigme est sur l'écran 2 (voir js/puzzles.js)
  const STEPS = [
    SEQ_TEXT,
    () => trapClue(g.trapTrue),
    () => `Trappe ${g.trapOf.badge} ouverte : prends les badges. ${badgeText(g.badgeRule)}`,
    () => `Trappe ${g.trapOf.cles} ouverte : prends les clés. Ordre : les indices de l'écran 2.`,
    () => wireText(g.wireRule, false),
    () => code1Text(g.rev1),
    SEQ2_TEXT,
    'Ramène Croix A et Croix B à l\'arrêt, ensemble, à moins d\'une seconde.',
    'Clés, couche 2 : nouveaux indices sur l\'écran 2.',
    () => wireText(g.wireRule2, true),
    CODE2_TEXT,
    'Maintiens le gros bouton rouge pour sceller le lecteur 5D.',
  ];
  const NSTEPS = STEPS.length;
  const PEN = { ordre: 5, code: 8, jump: 3.2 }; // pénalités allégées (0.1.4 : 10 s, 15 s, +6,4 %)
  const PROB = [99.7, 94.1, 87.6, 80.2, 72.5, 64.3, 55.8, 47.0, 38.1, 28.6, 19.4, 9.7, 0];
  const g = window.__game = { running: false, ended: false, step: -1, endAt: 0, code: '', codeKnown: false, entry: '', order: [], orderPos: 0, wires: [], trapOf: { croix: 1, badge: 2, cles: 3 }, seed: 0, crossT: 0, lastSec: -1, errUntil: 0, said30: false, said10: false };

  function setStatus(text) {
    const el = $('#status');
    el.textContent = text;
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
  }
  function setProb(val, lie = false) {
    const box = $('#probBox'), out = $('#prob');
    out.textContent = fmtPct(val);
    out.classList.toggle('glitch', lie);
    const o2 = $('#prob2'); o2.textContent = fmtPct(val); o2.classList.toggle('glitch', lie);
  }
  function goStep(n) {
    g.step = n;
    $('#stepNo').textContent = `Étape ${Math.min(n + 1, NSTEPS)}/${NSTEPS}`;
    setProb(PROB[n]);
    if (n < NSTEPS) setStatus(typeof STEPS[n] === 'function' ? STEPS[n]() : STEPS[n]);
    lookAtEl(null);
  }
  function penalty(sec, line) {
    g.endAt -= sec * 1000;
    g.errUntil = performance.now() + 2200;
    sfx.error();
    buzz(BUZZ.faux);
    $('#probBox').classList.add('up');
    setProb(Math.min(99.9, PROB[Math.floor(g.step)] + PEN.jump));
    setTimeout(() => { $('#probBox').classList.remove('up'); if (g.running) setProb(PROB[Math.floor(g.step)]); }, 1600);
    if (line) speak(line);
  }

  function resetBoard() {
    for (const k of KEYS) setKey(k.id, 'empty');
    for (const n in traps) { traps[n].el.classList.remove('open', 'taken'); traps[n].btn.hidden = true; }
    $$('.guard').forEach((gd) => {
      const c = gd.querySelector('.cover'), l = gd.querySelector('.lever');
      c.setAttribute('aria-expanded', 'false'); c.hidden = false; l.disabled = true; l.setAttribute('aria-checked', 'false');
    });
    $('#rfid').classList.remove('scan', 'done', 'ready');
    $('#bigbtn').classList.remove('armed', 'holding');
    resetHold();
    g.entry = ''; showEntry();
  }

  // valeurs d'une partie : js/puzzles.js (une seule graine, deux paliers cachés ~50/50, note de difficulté + retirage)
  window.__makeRun = makeRun; window.__puzzle = { draw, accept, TIERS };

  function startGame() {
    initAudio();
    const run = makeRun(newSeed());
    Object.assign(g, run, {
      running: true, ended: false, codeKnown: false, entry: '', orderPos: 0,
      lastSec: -1, errUntil: 0, said30: false, said10: false, crossT: 0, endAt: performance.now() + TIME_S * 1000, keysPicked3: false, badge: false, badgeSel: -1, code1Done: false,
    });
    resetBoard();
    fillTraps();
    $('[data-part="label"]').textContent = `N° DE SÉRIE ${g.serial} · LOT ${g.lot}`;
    if (DEBUG) { $('#seed').hidden = false; $('#seed').textContent = ` · graine ${g.seed} · ${g.tier} · note ${g.score.total}`; console.info('[entite] graine', g.seed, run); }
    startMusic();
    $('#intro').hidden = true; $('#end').hidden = true;
    eye.setMood('watching');
    c2View('suite');
    goStep(0);
    trapsChoosable(false);
    speak('intro');
    setTimeout(() => g.running && g.step === 0 && speak('depart8'), 3600);
    if (g.hard) { scheduleProbLie(); colorLie(0, 9500); } // palier difficile : fausse probabilité + mensonge parlé
  }
  // mensonge parlé (palier difficile) : l'Entité annonce la mauvaise couleur d'abord ; œil rouge + sous-titre qui grésille
  function colorLie(step, ms) {
    clearTimeout(g.vTimer);
    g.vTimer = setTimeout(() => {
      if (!g.running || g.step !== step) return;
      const truth = step === 0 ? g.first : g.first2;
      speak(truth === 'bleu' ? 'menteRouge' : 'menteBleu'); flagLie(2600, true);
    }, ms);
  }

  function scheduleProbLie() {
    clearTimeout(g.probLie);
    g.probLie = setTimeout(() => {
      if (!g.running) return;
      setProb(99.9 - Math.random() * 3, true);
      flagLie(800);
      setTimeout(() => g.running && setProb(PROB[Math.floor(g.step)]), 800);
      scheduleProbLie();
    }, 9000 + rand(6000));
  }

  function endGame(win, reason) {
    if (g.ended) return;
    g.running = false; g.ended = true;
    clearTimeout(g.probLie); clearInterval(g.lieTimer); clearTimeout(g.crossTimer); clearTimeout(g.vTimer);
    const left = Math.max(0, (g.endAt - performance.now()) / 1000);
    if (win) {
      eye.setMood('defused');
      sfx.defused();
      stopMusic('fade');
      buzz(BUZZ.victoire);
      setProb(0);
      $('#stepNo').textContent = `Étape ${NSTEPS}/${NSTEPS}`;
      setStatus('Lecteur scellé. L\'Entité est confinée.');
      c2View('sealed');
      setTimeout(() => speak('desamorce'), 900);
    } else {
      stopVoice();
      eye.setMood('boom');
      sfx.boom();
      stopMusic('cut');
      setProb(100);
      c2View('boom');
      setStatus(reason);
      if (!reduced) { document.body.classList.add('shake'); setTimeout(() => document.body.classList.remove('shake'), 700); }
      buzz(BUZZ.boom);
      setTimeout(() => speak(reason.startsWith('Secousse') ? 'secousse' : 'boom'), 1300);
    }
    g.result = win ? 'win' : 'boom'; g.endT = performance.now();
    setTimeout(() => {
      const end = $('#end');
      end.classList.toggle('lose', !win);
      $('#endTitle').textContent = win ? 'Entité piégée' : 'Explosion';
      const m = Math.floor(left / 60), s = Math.floor(left % 60);
      $('#endText').textContent = win
        ? `Elle s'est repliée dans le lecteur optique 5D, avec ${m}:${String(s).padStart(2, '0')} au compteur. Elle avait calculé l'inverse.`
        : `${reason} La probabilité d'échec était juste, cette fois.`;
      end.hidden = false;
      $('#btnAgain').focus({ preventScroll: true });
    }, win ? 3400 : 2600);
  }

  // ---------- actions ----------
  function notYet() { sfx.error(); $('#status').classList.remove('flash'); void $('#status').offsetWidth; $('#status').classList.add('flash'); }

  function onKey(id) {
    if (!g.running) return;
    const st = keyEl[id].w.dataset.state;
    if (st === 'empty') { denyKey(id); return; }
    if (keyEl[id].w.classList.contains('locked')) { denyKey(id); return; }
    const cross = id === 'xa' || id === 'xb';
    if (cross && (g.step === 1 || g.step === 7)) {
      const tgt = g.step === 1 ? 'on' : 'off', back = g.step === 1 ? 'off' : 'on';
      if (st === tgt) return;
      sfx.keyTurn();
      const other = id === 'xa' ? 'xb' : 'xa';
      setKey(id, tgt, { pending: true });
      if (keyEl[other].w.dataset.state === tgt && performance.now() - g.crossT <= 1000) {
        clearTimeout(g.crossTimer);
        setKey('xa', tgt, { locked: true }); setKey('xb', tgt, { locked: true });
        sfx.ok(); speak('cle');
        if (g.step === 1) { goStep(2); setTimeout(() => openTrap('badge'), 400); }
        else { goStep(8); ['k1', 'k2', 'k3'].forEach((k) => setKey(k, 'off')); g.orderPos = 0; c2View('order'); }
        return;
      }
      g.crossT = performance.now();
      clearTimeout(g.crossTimer);
      g.crossTimer = setTimeout(() => {
        setKey('xa', back); setKey('xb', back);
        denyKey(id);
        speak('tropLent');
        setStatus("Trop lent : les deux moitiés ensemble, à moins d'une seconde.");
      }, 1000);
      return;
    }
    if (!cross && (g.step === 3 || g.step === 8)) {
      if (st === 'on') return;
      const idx = ['k1', 'k2', 'k3'].indexOf(id), p2 = g.step === 8, cur = p2 ? g.order2 : g.order;
      sfx.keyTurn();
      if (idx === cur[g.orderPos]) {
        setKey(id, 'on');
        g.orderPos++;
        if (g.orderPos === 3) {
          ['k1', 'k2', 'k3'].forEach((k) => setKey(k, 'on', { locked: true }));
          sfx.ok();
          goStep(p2 ? 9 : 4);
          c2View('wires');
          speak(p2 ? 'fils2' : 'fils');
        }
      } else {
        setKey(id, 'on');
        setTimeout(() => { ['k1', 'k2', 'k3'].forEach((k) => setKey(k, 'off')); }, 350);
        g.orderPos = 0;
        penalty(PEN.ordre, 'ordreFaux5');
        setStatus('Mauvais ordre : les clés reviennent. Moins cinq secondes. Relis les indices.');
      }
      return;
    }
    denyKey(id);
  }

  $$('.guard').forEach((gd) => {
    const color = gd.dataset.guard, cover = gd.querySelector('.cover'), lever = gd.querySelector('.lever');
    cover.addEventListener('click', () => {
      if (!g.running) return;
      lookAtEl(cover);
      const open = cover.getAttribute('aria-expanded') !== 'true';
      cover.setAttribute('aria-expanded', String(open));
      cover.setAttribute('aria-label', `${open ? 'Refermer' : 'Lever'} le cache ${color}`);
      lever.disabled = !open;
      sfx.cover();
    });
    lever.addEventListener('click', () => {
      if (!g.running) return;
      lookAtEl(lever);
      if (lever.getAttribute('aria-checked') === 'true') { sfx.error(); return; }
      if (g.step !== 0 && g.step !== 6) { notYet(); return; }
      const p2 = g.step === 6, want = p2 ? g.first2 : g.first;
      sfx.click();
      lever.setAttribute('aria-checked', 'true');
      const firstLever = $(`.guard-${want === 'rouge' ? 'red' : 'blue'} .lever`);
      if (color !== want && firstLever.getAttribute('aria-checked') !== 'true') {
        setTimeout(() => lever.setAttribute('aria-checked', 'false'), 260);
        penalty(PEN.ordre, 'ordreFaux5');
        setStatus('Mauvais ordre. Moins cinq secondes. Relis la suite de l\'écran 2.');
        return;
      }
      if (color !== want) {
        sfx.ok();
        if (p2) { goStep(7); setKey('xa', 'on'); setKey('xb', 'on'); }
        else { goStep(1); trapsChoosable(true); c2View('trappes'); }
      } else if (!p2) {
        speak('pasEncore'); // « caches » parle du n° de série, devenu un simple leurre : réplique à réenregistrer (VOIX.md)
      }
    });
  });

  $('#rfid').addEventListener('click', () => {
    if (!g.running) return;
    const pad = $('#rfid');
    lookAtEl(pad);
    if (g.step !== 2 || pad.classList.contains('scan')) { notYet(); return; }
    if (!g.badge) { notYet(); setStatus(`Il te faut un badge Podkova : ils sont dans la trappe ${g.trapOf.badge}.`); return; }
    if (g.badgeSel < 0) { notYet(); setStatus(`Choisis d'abord sur l'écran 2. ${badgeText(g.badgeRule)}`); return; }
    if (g.badgeSel !== g.badgeIdx) {
      const bad = g.badges[g.badgeSel];
      g.badgeSel = -1; pad.classList.remove('ready'); c2View('badges');
      penalty(PEN.ordre, 'badgeFaux');
      setStatus(`${bad} : un clone. Moins cinq secondes. ${badgeText(g.badgeRule)}`);
      return;
    }
    pad.classList.add('scan');
    sfx.scan();
    setTimeout(() => {
      if (!g.running) return;
      pad.classList.remove('scan'); pad.classList.add('done');
      sfx.rfid();
      g.codeKnown = true;
      goStep(3);
      c2View('code');
      speak('badgeOk');
      setTimeout(() => openTrap('cles'), 900);
      setTimeout(() => { if (g.running && g.step === 3) c2View('order'); }, 4600);
    }, 900);
  });


  function cutWire(i, btn) {
    if (!g.running || (g.step !== 4 && g.step !== 9) || btn.classList.contains('cut')) return;
    lookAtEl(btn);
    btn.classList.add('cut');
    sfx.snip();
    if (i === (g.step === 9 ? g.wireIdx2 : g.wireIdx)) {
      sfx.ok();
      const nx = g.step === 9 ? 10 : 5;
      g.entry = '';
      goStep(nx);
      speak(nx === 10 ? 'code2' : 'pilule');
      setTimeout(() => { if (g.running && g.step === nx) { c2View('pilule'); showEntry(); } }, 600);
    } else {
      setTimeout(() => endGame(false, 'Mauvais fil coupé.'), 250);
    }
  }

  function onKeypad(c) {
    if (!g.running) return;
    sfx.key();
    if (g.step !== 5 && g.step !== 10) { if (/\d/.test(c)) notYet(); return; }
    if (c === '*') { g.entry = ''; showEntry(); return; }
    if (/[A-D]/.test(c)) return;
    if (c === '#') { if (g.entry.length === 4) checkCode(); return; }
    if (g.entry.length >= 4) return;
    g.entry += c; showEntry();
    if (g.entry.length === 4) setTimeout(checkCode, 180);
  }
  function checkCode() {
    if (g.step !== 5 && g.step !== 10) return;
    const p2 = g.step === 10;
    if (g.entry === (p2 ? g.code2 : g.code)) {
      sfx.ok();
      g.step += 0.5;
      speak('codeOk');
      c2View('upload');
      const t0 = performance.now(), dur = 2400;
      const tick = () => {
        if (!g.running) return;
        const p = Math.min(1, (performance.now() - t0) / dur);
        const pct = $('[data-pct]', c2), bar = $('[data-bar]', c2);
        if (pct) pct.textContent = Math.round(p * 100) + ' %';
        if (bar) bar.style.width = p * 100 + '%';
        if (p < 1) requestAnimationFrame(tick);
        else if (p2) { goStep(11); $('#bigbtn').classList.add('armed'); speak('sceller'); flagLie(3200, true); }
        else secondLayer();
      };
      tick();
    } else {
      const lcd = $('[data-entry]', c2) || document.createElement('span');
      lcd.classList.remove('bad'); void lcd.offsetWidth; lcd.classList.add('bad');
      penalty(PEN.code, 'codeFaux');
      setStatus(`Code refusé. Moins huit secondes. ${p2 ? CODE2_TEXT : code1Text(g.rev1)}`);
      setTimeout(() => { g.entry = ''; showEntry(); lcd.classList.remove('bad'); }, 700);
    }
  }

  // fin de la couche 1 : l'Entité ment (« c'est fini »), puis redémarre une seconde couche de verrous
  function secondLayer() {
    g.code1Done = true;
    c2View('fini');
    speak('mentFini'); flagLie(2800, true);
    setTimeout(() => {
      if (!g.running) return;
      goStep(6);
      $$('.guard').forEach((gd) => {
        const c = gd.querySelector('.cover'), l = gd.querySelector('.lever');
        c.setAttribute('aria-expanded', 'false'); c.setAttribute('aria-label', `Lever le cache ${gd.dataset.guard}`); l.disabled = true; l.setAttribute('aria-checked', 'false');
      });
      $('#rfid').classList.remove('done');
      c2View('reboot');
      setTimeout(() => { if (g.running && g.step === 6) c2View('suite'); }, 1800);
      sfx.servo();
      speak('couche2');
      if (g.hard) colorLie(6, 5200);
    }, 3000);
  }

  // gros bouton : maintenir 1,5 s
  const big = $('#bigbtn'), prog = $('.bigbtn-prog');
  let holdT = 0;
  function resetHold() { clearTimeout(holdT); prog.style.transition = 'stroke-dashoffset 0.25s'; prog.style.strokeDashoffset = '289'; big.classList.remove('holding'); }
  function startHold() {
    if (!g.running) return;
    lookAtEl(big);
    if (g.step !== 11) { notYet(); return; }
    big.classList.add('holding');
    sfx.hold();
    prog.style.transition = 'stroke-dashoffset 1.5s linear';
    prog.style.strokeDashoffset = '0';
    holdT = setTimeout(() => { big.classList.remove('armed'); endGame(true); }, 1500);
  }
  big.addEventListener('pointerdown', (e) => { e.preventDefault(); big.setPointerCapture?.(e.pointerId); startHold(); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => big.addEventListener(ev, () => { if (!g.ended) resetHold(); }));
  big.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); startHold(); } });
  big.addEventListener('keyup', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !g.ended) resetHold(); });
  big.addEventListener('contextmenu', (e) => e.preventDefault());

  // secousse
  $('#btnShake').addEventListener('click', () => { if (g.running) endGame(false, 'Secousse détectée.'); else notYet(); });
  function onMotion(e) {
    if (!g.running) return;
    const a = e.acceleration;
    let m = 0;
    if (a && a.x != null) m = Math.hypot(a.x, a.y, a.z);
    else if (e.accelerationIncludingGravity) { const b = e.accelerationIncludingGravity; m = Math.abs(Math.hypot(b.x, b.y, b.z) - 9.81); }
    if (m > 24) endGame(false, 'Secousse détectée.');
  }

  // plein écran (+ verrouillage paysage si permis)
  const fsEl = document.documentElement;
  const fsSupported = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
  const fsActive = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
  const standalone = matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches || navigator.standalone;
  const btnFs = $('#btnFs');
  if (fsSupported) btnFs.hidden = false;
  else if (!standalone) $('#fsHint').hidden = false;
  async function enterFs() {
    if (!fsSupported || fsActive()) return;
    try {
      if (fsEl.requestFullscreen) await fsEl.requestFullscreen({ navigationUI: 'hide' });
      else if (fsEl.webkitRequestFullscreen) fsEl.webkitRequestFullscreen();
    } catch { return; }
    try { await screen.orientation?.lock?.('landscape'); } catch { /* orientation actuelle conservée */ }
  }
  async function exitFs() {
    try { screen.orientation?.unlock?.(); } catch { /* rien */ }
    try { if (document.exitFullscreen) await document.exitFullscreen(); else document.webkitExitFullscreen?.(); } catch { /* rien */ }
  }
  function syncFs() {
    const on = fsActive();
    btnFs.setAttribute('aria-pressed', String(on));
    btnFs.setAttribute('aria-label', on ? 'Quitter le plein écran' : 'Plein écran');
    if (!on) { try { screen.orientation?.unlock?.(); } catch { /* rien */ } }
  }
  document.addEventListener('fullscreenchange', syncFs);
  document.addEventListener('webkitfullscreenchange', syncFs);
  btnFs.addEventListener('click', () => (fsActive() ? exitFs() : enterFs()));

  // son
  $('#btnSon').addEventListener('click', () => {
    const m = !isMuted();
    setMuted(m);
    $('#btnSon').setAttribute('aria-pressed', String(m));
    $('#btnSon').setAttribute('aria-label', m ? 'Rétablir le son' : 'Couper le son');
  });

  // vibrations (réglage gardé dans localStorage)
  const btnVib = $('#btnVib');
  if (canVibrate) {
    btnVib.hidden = false;
    const syncVib = () => btnVib.setAttribute('aria-pressed', String(vibeOn));
    syncVib();
    btnVib.addEventListener('click', () => {
      vibeOn = !vibeOn;
      try { localStorage.setItem('entite.vibrations', vibeOn ? '1' : '0'); } catch { /* navigation privée */ }
      syncVib();
      buzz(40);
    });
  }

  $('#btnStart').addEventListener('click', async () => {
    initAudio();
    const fs = enterFs();
    if (typeof DeviceMotionEvent !== 'undefined') {
      try {
        if (typeof DeviceMotionEvent.requestPermission === 'function') {
          const r = await DeviceMotionEvent.requestPermission();
          if (r === 'granted') addEventListener('devicemotion', onMotion);
        } else addEventListener('devicemotion', onMotion);
      } catch { /* bouton de secours */ }
    }
    await fs;
    startGame();
  });
  $('#btnAgain').addEventListener('click', startGame);

  // regard : l'œil suit le dernier geste
  let lookUntil = 0;
  function lookAtEl(el) {
    if (!el) { lookUntil = 0; return; }
    const r = el.getBoundingClientRect(), s = $('#stage').getBoundingClientRect();
    const x = ((r.left + r.width / 2) - (s.left + s.width / 2)) / (s.width / 2);
    const y = ((r.top + r.height / 2) - (s.top + s.height * 0.53)) / (s.height * 0.8);
    eye.lookAt(x, Math.min(1, y));
    lookUntil = performance.now() + 2600;
  }

  // ---------- boucle ----------
  let ledT = 0;
  showTime(TIME_S);
  function loop(now) {
    requestAnimationFrame(loop);
    eye.setVoice(voiceLevel());
    mirrorCyd1();
    if (now > lookUntil) eye.lookAt(Math.sin(now / 2300) * 0.5, Math.sin(now / 3100) * 0.35);
    let tl = TIME_S;
    if (g.running) {
      tl = (g.endAt - now) / 1000;
      showTime(tl);
      const sec = Math.ceil(tl);
      if (sec !== g.lastSec) {
        g.lastSec = sec;
        colons.forEach((c) => c.classList.toggle('blink', sec % 2 === 0));
        if (sec > 0) sfx.tick(sec <= 10);
        if (sec <= 30 && !g.said30) { g.said30 = true; speak('trente'); sfx.alarm(); }
        if (sec <= 10 && !g.said10) { g.said10 = true; speak('dix'); }
      }
      if (tl <= 0) { showTime(0); endGame(false, 'Temps écoulé.'); }
      eye.setMood(tl <= 30 || now < g.errUntil ? 'angry' : 'watching');
      // tension : 0 au départ, 1 à la fin du compte à rebours (courbe qui accélère sous 60 s)
      setMusicIntensity(Math.pow(Math.min(1, Math.max(0, 1 - tl / TIME_S)), 1.8));
    } else if (!g.ended) eye.setMood('idle');
    if (now - ledT > 66) {
      ledT = now;
      const b1 = [], b2 = [];
      if (g.running) {
        const done = Math.round((Math.floor(g.step) / NSTEPS) * 8);
        for (let i = 0; i < 8; i++) b1[i] = i < done ? '#62d6ff' : i === done && Math.floor(now / 300) % 2 ? '#ffb020' : null;
        const lit = Math.ceil((tl / TIME_S) * 8), col = tl > 60 ? '#3dff95' : tl > 30 ? '#ffb020' : '#ff3b30';
        const blink = tl <= 30 && Math.floor(now / 180) % 2;
        for (let i = 0; i < 8; i++) b2[i] = i < lit && !blink ? col : null;
      } else if (g.ended && g.result === 'win') {
        const a = Math.floor(((Math.sin(now / 500) + 1) / 2) * 8);
        for (let i = 0; i < 8; i++) { b1[i] = i <= a ? '#62d6ff' : null; b2[i] = i <= a ? '#62d6ff' : null; }
      } else if (g.ended) {
        const age = now - g.endT;
        for (let i = 0; i < 8; i++) { const on = age < 1500 ? Math.floor(now / 90) % 2 : Math.random() < 0.04; b1[i] = on ? '#ff3b30' : null; b2[i] = on ? '#ff3b30' : null; }
      } else {
        const p = Math.floor(now / 110) % 14, pos = p < 8 ? p : 14 - p;
        for (let i = 0; i < 8; i++) { b1[i] = Math.abs(i - pos) < 1 ? '#3d8bff' : Math.abs(i - pos) < 2 ? '#123a7a' : null; b2[i] = b1[7 - i] ? b1[i] && null : null; }
        for (let i = 0; i < 8; i++) b2[i] = b1[7 - i];
      }
      setBar(0, b1); setBar(1, b2);
    }
  }
  requestAnimationFrame(loop);
}

// ================= Aperçu CYD 240x320 =================
function initCyd() {
  document.body.classList.add('cyd');
  document.title = 'Aperçu CYD · Entité';
  $('#cydView').hidden = false;
  const cfg = deepMerge(EYE, CYD.overrides);
  const eye = createEye($('#cydCanvas'), { config: cfg, fixedSize: { w: CYD.width, h: CYD.height }, fpsCap: CYD.fps, reducedMotion: reduced });
  window.__eye = eye;
  eye.start();
  setCaptionHandler(() => {});
  $$('.cyd-moods button').forEach((b) => b.addEventListener('click', () => {
    initAudio();
    eye.setMood(b.dataset.mood);
    $$('.cyd-moods button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  }));
  $('#cydSpeak').addEventListener('click', () => { initAudio(); speak('intro'); });
  setInterval(() => {
    $('#cydMeta').textContent = `ILI9341 240×320 · ${eye.stats.fps} i/s (max ${CYD.fps}) · ${eye.stats.dots} points`;
  }, 1000);
  (function loop() { requestAnimationFrame(loop); eye.setVoice(voiceLevel()); eye.lookAt(Math.sin(performance.now() / 2300) * 0.5, Math.sin(performance.now() / 3100) * 0.35); })();
}

// ================= Service worker =================
function registerSW() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  // recharger seulement pour une MISE À JOUR (il y avait déjà un SW) ; à la 1re visite, clients.claim() déclenchait
  // un controllerchange qui rechargeait la page au milieu du chargement (cause du « plus rien ne bouge »)
  const hadController = !!navigator.serviceWorker.controller;
  const go = async () => {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js');
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        w?.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) w.postMessage('SKIP_WAITING'); });
      });
      let reloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!hadController || reloaded || window.__game?.running) return;
        reloaded = true; location.reload();
      });
    } catch { /* hors ligne non disponible */ }
  };
  if (document.readyState === 'complete') go(); else addEventListener('load', go, { once: true });
}
