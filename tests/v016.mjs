// Test 0.1.6. A) Node : pour N graines, résout les 12 étapes par la logique, à partir des seuls textes et données
// affichés (suite, trappes, badges, indices, fils, grille), et compare aux réponses de la partie. Vérifie aussi :
// textes courts sans formule, paliers ~50/50 dans leurs bandes, déterminisme.
// B) Navigateur 412x915 : une partie complète par palier en lisant SEULEMENT l'écran, console propre, 3 captures.
// Usage : node tests/v016.mjs [base] [N]
import * as P from '../js/puzzles.js';
const base = process.argv[2] || 'http://localhost:8792/';
const N = +(process.argv[3] || 3000);
const fail = [], tiers = {}, bad = /[÷=+()→]|mod\b|reste|chiffre|pair|somme/;
const texts = new Set();
for (let s = 1; s <= N; s++) {
  const r = P.makeRun(s);
  if (JSON.stringify(P.makeRun(s)) !== JSON.stringify(r)) fail.push([s, 'non déterministe']);
  (tiers[r.tier] ??= []).push(r.score.total);
  const [lo, hi] = P.TIERS[r.tier].band; if (r.score.total < lo || r.score.total > hi) fail.push([s, 'hors bande']);
  // ce que voit le joueur
  const shown = {
    s0: P.SEQ_TEXT, s1: P.trapClue(r.trapTrue), rule1: P.trapRuleText(r.trapTrue), stmts: r.trapStmts.map(P.trapText),
    s2: P.badgeText(r.badgeRule), badges: r.badges, keys1: r.keyClues.map(P.keyClueText), s4: P.wireText(r.wireRule, false),
    s5: P.code1Text(r.rev1), s6: P.SEQ2_TEXT, keys2: r.keyClues2.map(P.keyClueText), s9: P.wireText(r.wireRule2, true), s10: P.CODE2_TEXT,
  };
  for (const k of ['s0', 's1', 's2', 's4', 's5', 's6', 's9', 's10']) texts.add(shown[k]);
  // résolution
  const nTrue = /DIT VRAI/.test(shown.rule1) ? 1 : 2;
  const got = {
    first: P.solveSeq(r.seq1)?.val, croix: P.solveTraps(shown.stmts.map(P.parseTrap), nTrue),
    badge: P.solveBadges(shown.badges, P.parseBadgeText(shown.s2)), order: P.solveKeys(shown.keys1.map(P.parseKeyClue))?.join(),
    wire: P.solveWires(r.wires, P.parseWireText(shown.s4)), first2: P.solveSeq(r.seq2)?.val,
    order2: P.solveKeys(shown.keys2.map(P.parseKeyClue))?.join(), wire2: P.solveWires(r.wires2, P.parseWireText(shown.s9)),
  };
  const realBadge = shown.badges[got.badge], rev = /droite à gauche/.test(shown.s5);
  got.code = P.solveCode(realBadge, r.grid1, rev); got.code2 = P.solveCode(realBadge, r.grid2, !rev);
  const want = { first: r.first, croix: r.trapOf.croix, badge: r.badgeIdx, order: r.order.join(), wire: r.wireIdx, first2: r.first2, order2: r.order2.join(), wire2: r.wireIdx2, code: r.code, code2: r.code2 };
  for (const k in want) if (got[k] !== want[k]) fail.push([s, k, got[k], want[k]]);
  if (r.code === r.code2 || r.order.join() === r.order2.join()) fail.push([s, 'couche 2 identique']);
}
const st = (a) => { const h = {}; a.forEach((v) => { h[v] = (h[v] || 0) + 1; }); return h; };
const longest = [...texts].sort((a, b) => b.length - a.length)[0];
const formula = [...texts].filter((t) => bad.test(t));
const A = { seeds: N, fails: fail.length, firstFails: fail.slice(0, 5), tiers: Object.fromEntries(Object.entries(tiers).map(([t, a]) => [t, { n: a.length, pct: +(a.length / N * 100).toFixed(1), notes: st(a) }])), longestClue: longest, longestLen: longest.length, formula };
console.log(JSON.stringify({ A }, null, 1));
if (process.argv.includes('--node')) process.exit(fail.length || formula.length ? 1 : 0);

// ---------------- B) navigateur ----------------
const { chromium } = await import('/home/box/.npm/_npx/9833c18b2d85bc59/node_modules/playwright-core/index.mjs');
const shots = '/workspace/qa/entite-mallette/v0.1.6/';
await (await import('node:fs')).promises.mkdir(shots, { recursive: true });
const seeds = { 'moyen-difficile': null, difficile: null };
for (let s = 1; s < 100 && (!seeds['moyen-difficile'] || !seeds.difficile); s++) { const t = P.makeRun(s).tier; seeds[t] ??= s; }
const b = await chromium.launch({ executablePath: '/opt/google/chrome/chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
const results = [];
// VP=915x412 : même partie en paysage (une seule graine, captures dans /tmp)
const VP = (process.env.VP || '412x915').split('x').map(Number), land = VP[0] > VP[1];
let shot = !land;
for (const [tier, SEED] of Object.entries(seeds)) {
  if (process.env.TIER && tier !== process.env.TIER) continue;
  if (land && tier !== 'difficile') continue;
  const ctx = await b.newContext({ viewport: { width: VP[0], height: VP[1] }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const logs = [];
  p.on('console', (m) => { if ((m.type() === 'error' || m.type() === 'warning') && !/Service Worker registration blocked by Playwright/.test(m.text())) logs.push(m.type() + ': ' + m.text()); });
  p.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
  const W = (ms) => p.waitForTimeout(ms);
  const text = (sel) => p.evaluate((x) => document.querySelector(x)?.textContent ?? '', sel);
  const press = (id) => p.evaluate((k) => document.querySelector(`[data-key="${k}"] button`).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })), id);
  const liar = () => p.evaluate(() => ({ glitch: document.querySelector('#caption').classList.contains('glitch'), red: document.querySelector('#stage').classList.contains('liar') }));
  const readSeq = () => p.evaluate(() => document.querySelector('#cyd2 .seq').getAttribute('aria-label').replace('Suite : ', '').split(', ').map((c) => (c === 'case vide' ? null : c)));
  // mensonge de l'ordre des clés : tant que le faux ordre est affiché, l'œil doit être rouge (stage.liar + filtre sur #eye)
  const orderLie = () => p.evaluate(() => new Promise((res) => {
    const out = { samples: 0, flagged: 0 }, t0 = performance.now();
    const iv = setInterval(() => {
      const big = document.querySelector('#cyd2 [data-big]');
      if (big && big.classList.contains('glitch') && !/[█▓▒░]/.test(big.textContent)) {
        out.samples++;
        if (document.querySelector('#stage').classList.contains('liar') && getComputedStyle(document.querySelector('#eye')).filter !== 'none') out.flagged++;
      }
      if (performance.now() - t0 > 2600) { clearInterval(iv); out.ok = out.samples > 0 && out.flagged === out.samples; res(out); }
    }, 50);
  }));
  const clean = async (sel) => { await p.waitForFunction((x) => { const e = document.querySelector(x); return e && !e.classList.contains('glitch') && !/[█▓▒░]/.test(e.textContent); }, sel, { timeout: 8000 }); return text(sel); };
  const flip = async (first) => { for (const c of first === 'bleu' ? ['blue', 'red'] : ['red', 'blue']) { await p.tap(`.guard-${c} .cover`); await W(250); await p.tap(`.guard-${c} .lever`); await W(250); } };
  const S = {}, checks = { lies: {} };
  await p.goto(`${base}?seed=${SEED}&debug=1`); await p.waitForFunction(() => !document.querySelector('#btnStart').disabled); await p.tap('#btnStart'); await W(900);
  // 1 suite
  checks.t1 = await text('#status');
  S.first = P.solveSeq(await readSeq()).val;
  if (shot && process.env.SHOTS) await p.screenshot({ path: shots + `01-suite-interrupteurs-412-s${SEED}.png` });
  await flip(S.first); await W(700);
  // 2 trappes
  checks.t2 = await text('#status');
  const rule = await text('#cyd2 .c2-center > .c2-msg');
  const stmts = await p.evaluate(() => [...document.querySelectorAll('#cyd2 [data-stmt]')].map((e) => e.textContent));
  S.croix = P.solveTraps(stmts.map(P.parseTrap), /DIT VRAI/.test(rule) ? 1 : 2);
  if (shot && process.env.SHOTS) await p.screenshot({ path: shots + `02-trappes-cle-en-croix-412-s${SEED}.png` });
  await p.tap(`.trap[data-trap="${S.croix}"] .trap-pick`); await W(900);
  await p.tap(`.trap[data-trap="${S.croix}"] .trap-key`); await W(300);
  await press('xa'); await press('xb'); await W(1300);
  // 3 badges
  checks.t3 = await text('#status');
  await p.tap(`.trap[data-trap="${+checks.t3.match(/Trappe (\d)/)[1]}"] .trap-key`); await W(700);
  const badges = await p.evaluate(() => [...document.querySelectorAll('#cyd2 .badge')].map((e) => e.textContent.replace(/ /g, '')));
  S.badge = P.solveBadges(badges, P.parseBadgeText(checks.t3));
  checks.badges44 = await p.evaluate(() => [...document.querySelectorAll('#cyd2 .badge')].every((e) => { const r = e.getBoundingClientRect(); return r.height >= 44 && r.top >= 0 && r.bottom <= innerHeight; }));
  checks.wiresView = null;
  await p.tap(`#cyd2 .badge[data-i="${S.badge}"]`); await W(400); await p.tap('#rfid'); await W(1200);
  checks.lies.badgeLu = await liar();
  // 4 clés
  checks.t4 = await text('#status');
  await p.tap(`.trap[data-trap="${+checks.t4.match(/Trappe (\d)/)[1]}"] .trap-key`); await W(300);
  await p.waitForFunction(() => window.__game.c2 === 'order', null, { polling: 20, timeout: 8000 });
  const lieP = orderLie(); await W(500);
  if (shot) await p.screenshot({ path: shots + 'fix-ordre-liar.png' });
  checks.ordreLie = await lieP;
  const clues = (await clean('#cyd2 [data-big]')).split('\n');
  S.order = P.solveKeys(clues.map(P.parseKeyClue));
  for (const i of S.order) await press('k' + (i + 1));
  await W(1300);
  // 5 fils
  checks.t5 = await text('#status');
  const wn = () => p.evaluate(() => [...document.querySelectorAll('#cyd2 .wire .wire-name')].map((e) => e.textContent.toLowerCase()));
  S.wire = P.solveWires(await wn(), P.parseWireText(checks.t5));
  checks.wiresView = await p.evaluate(() => [...document.querySelectorAll('#cyd2 .wire')].every((e) => { const r = e.getBoundingClientRect(); return r.height >= 44 && r.top >= 0 && r.bottom <= innerHeight; }));
  checks.keypadInView = null;
  checks.lies.fil = await liar();
  await p.tap(`#cyd2 .wire[data-i="${S.wire}"]`); await W(900);
  // 6 code 1
  checks.t6 = await text('#status');
  const readGrid = () => p.evaluate(() => [...document.querySelectorAll('#cyd2 .kgrid span')].map((e) => e.textContent));
  const head = (await text('#cyd2 [data-code]')).replace('BADGE ', '');
  const rev = /droite à gauche/.test(checks.t6);
  S.code = P.solveCode(head, await readGrid(), rev);
  if (shot && process.env.SHOTS) await p.screenshot({ path: shots + `03-grille-code-412-s${SEED}.png` });
  if (land) await p.screenshot({ path: `/tmp/land-grille-s${SEED}.png` });
  checks.keys44 = await p.evaluate(() => [...document.querySelectorAll('.kp')].every((e) => { const r = e.getBoundingClientRect(); return r.width >= 36 && r.top >= 0 && r.bottom <= innerHeight; })); // 38 px + 3 px de marge tactile de chaque côté
  for (const c of S.code) await p.tap(`.kp:text-is("${c}")`);
  await W(2900); checks.lies.mentFini = await liar(); await W(3300);
  // couche 2 : 7 suite
  checks.t7 = await text('#status');
  await p.waitForFunction(() => window.__game.c2 === 'suite', null, { timeout: 6000 });
  S.first2 = P.solveSeq(await readSeq()).val;
  if (tier === 'difficile') { await W(3800); checks.lies.couleur = await liar(); }
  await flip(S.first2); await W(500);
  await press('xa'); await press('xb'); await W(900);
  // 9 clés couche 2
  checks.ordreLie2 = await orderLie();
  const clues2 = (await clean('#cyd2 [data-big]')).split('\n');
  S.order2 = P.solveKeys(clues2.map(P.parseKeyClue));
  for (const i of S.order2) await press('k' + (i + 1));
  await W(1300);
  checks.t10 = await text('#status');
  S.wire2 = P.solveWires(await wn(), P.parseWireText(checks.t10));
  checks.lies.fil2 = await liar();
  await p.tap(`#cyd2 .wire[data-i="${S.wire2}"]`); await W(900);
  checks.t11 = await text('#status');
  await W(500); checks.lies.code2 = await liar();
  S.code2 = P.solveCode(head, await readGrid(), !rev);
  for (const c of S.code2) await p.tap(`.kp:text-is("${c}")`);
  await W(3000); checks.lies.sceller = await liar();
  const box = await p.locator('#bigbtn').boundingBox();
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.mouse.down(); await W(1700); await p.mouse.up();
  await W(1500);
  const g = await p.evaluate(() => { const x = window.__game; return { tier: x.tier, score: x.score.total, result: x.result ?? null, left: Math.round((x.endAt - x.endT) / 1000), seedTxt: document.querySelector('#seed').textContent }; });
  results.push({ seed: SEED, ...g, solved: S, checks, logs });
  shot = false;
  await ctx.close();
}
await b.close();
console.log(JSON.stringify({ B: results }, null, 1));
process.exit(fail.length || formula.length || results.some((r) => r.result !== 'win' || r.logs.length || !r.checks.ordreLie.ok || !r.checks.ordreLie2.ok) ? 1 : 0);
