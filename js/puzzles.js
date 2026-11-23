// puzzles.js : énigmes de la mallette 0.1.6, sans DOM (testables dans Node).
// Plus d'arithmétique : suites de couleurs, trappes qui mentent, symboles, indices d'ordre, règles de fils, grille du clavier.
// Tout vient d'une seule graine (mulberry32) : même ?seed = même partie. Les fonctions solve* ne lisent que ce qui est
// affiché (elles servent aux tests et prouvent que chaque énigme a une seule réponse).
export function mulberry32(a) {
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const rng = (seed) => {
  const r = mulberry32(seed), ri = (n) => Math.floor(r() * n);
  const sh = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = ri(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  return { r, ri, sh, pick: (a) => a[ri(a.length)] };
};

export const COLORS = ['rouge', 'bleu', 'jaune', 'vert', 'blanc']; // fils
export const SEQ_COLORS = ['rouge', 'bleu', 'jaune', 'vert']; // suites (interrupteurs)
export const SYMS = ['▲', '●', '■', '◆', '★'];
export const SYM_NAME = { '▲': 'triangle', '●': 'rond', '■': 'carré', '◆': 'losange', '★': 'étoile' };
export const KEYN = ['I', 'II', 'III'];
export const KEYPAD = ['1', '2', '3', 'A', '4', '5', '6', 'B', '7', '8', '9', 'C', '*', '0', '#', 'D'];
export const TIERS = {
  // mensonges au même rythme qu'en 0.1.5 : 8 (moyen-difficile) ou 12 (difficile), toujours signalés (œil rouge)
  'moyen-difficile': { band: [30, 32], lies: 8 },
  difficile: { band: [37, 39], lies: 12 },
};

// ================= 1. Suites de couleurs (interrupteurs) =================
// 'periode' : un motif qui se répète ; 'croissante' : a b c, a b b c, a b b b c…
const growSeq = (a, b, c, L) => { const s = []; for (let k = 1; s.length < L; k++) { s.push(a); for (let j = 0; j < k; j++) s.push(b); s.push(c); } return s.slice(0, L); };
export function solveSeq(seq) {
  const L = seq.length, h = seq.indexOf(null);
  for (let p = 2; p <= L >> 1; p++) {
    let ok = true;
    for (let c = 0; c < p && ok; c++) { const v = new Set(); for (let i = c; i < L; i += p) if (seq[i]) v.add(seq[i]); if (v.size > 1) ok = false; }
    if (ok) { const v = seq.find((x, i) => x && i % p === h % p); if (v) return { val: v, kind: 'periode', p }; }
  }
  const fits = SEQ_COLORS.filter((col) => { const s = seq.map((x) => x ?? col); return s[0] !== s[1] && s[1] !== s[2] && s[0] !== s[2] && growSeq(s[0], s[1], s[2], L).every((x, i) => x === s[i]); });
  return fits.length === 1 ? { val: fits[0], kind: 'croissante' } : null;
}
function genSeq(R, kind) {
  for (let t = 0; t < 2000; t++) {
    let full, hole;
    if (kind[0] === 'p') {
      const p = +kind[1], pat = Array.from({ length: p }, () => R.pick(SEQ_COLORS));
      const L = kind.endsWith('fin') ? 2 * p + 1 : 2 * p + 2;
      full = Array.from({ length: L }, (_, i) => pat[i % p]);
      hole = kind.endsWith('fin') ? L - 1 : 1 + R.ri(L - 2);
    } else {
      const [a, b, c] = R.sh([...SEQ_COLORS]).slice(0, 3), L = 10 + R.ri(2);
      full = growSeq(a, b, c, L);
      hole = kind.endsWith('fin') ? L - 1 : 4 + R.ri(L - 5);
    }
    const answer = full[hole];
    if ((answer !== 'rouge' && answer !== 'bleu') || !full.includes('rouge') || !full.includes('bleu')) continue;
    const seq = full.map((c, i) => (i === hole ? null : c));
    const s = solveSeq(seq);
    if (!s || s.val !== answer || s.kind !== (kind[0] === 'p' ? 'periode' : 'croissante') || (s.p && s.p !== +kind[1])) continue;
    return { kind, seq, answer };
  }
  throw new Error('suite introuvable');
}

// ================= 2. Trappes qui mentent (clé en croix) =================
const trapTrue = (s, i, k) => (s.t === 'ici' ? k === i : s.t === 'pasIci' ? k !== i : s.t === 'en' ? k === s.j : k !== s.j);
export const trapText = (s) => (s.t === 'ici' ? 'ICI' : s.t === 'pasIci' ? 'PAS ICI' : s.t === 'en' ? `EN T${s.j}` : `PAS EN T${s.j}`);
export const parseTrap = (txt) => { const m = txt.match(/^(PAS )?(ICI|EN T(\d))$/); return m[2] === 'ICI' ? { t: m[1] ? 'pasIci' : 'ici' } : { t: m[1] ? 'pasEn' : 'en', j: +m[3] }; };
export function solveTraps(stmts, nTrue) {
  const ok = [1, 2, 3].filter((k) => stmts.filter((s, i) => trapTrue(s, i + 1, k)).length === nTrue);
  return ok.length === 1 ? ok[0] : null;
}
function genTraps(R, nTrue) {
  for (;;) {
    const stmts = [1, 2, 3].map((i) => { const t = R.pick(['ici', 'pasIci', 'en', 'pasEn']); return t === 'en' || t === 'pasEn' ? { t, j: R.pick([1, 2, 3].filter((j) => j !== i)) } : { t }; });
    if (new Set(stmts.map((s) => s.t)).size < 2) continue;
    const k = solveTraps(stmts, nTrue);
    if (k) return { stmts, croix: k };
  }
}

// ================= 3. Badges Podkova : 3 clones, une règle de symboles =================
const countOf = (b, x) => [...b].filter((c) => c === x).length;
const apart = (b, x) => { const p = [...b].map((c, i) => (c === x ? i : -1)).filter((i) => i >= 0); return p.length === 2 && p[1] - p[0] > 1; };
export function badgeOk(b, rule) { return countOf(b, rule.x) === 2 && apart(b, rule.x) && (!rule.y || !b.includes(rule.y)); }
export function solveBadges(badges, rule) { const ok = badges.map((b, i) => (badgeOk(b, rule) ? i : -1)).filter((i) => i >= 0); return ok.length === 1 ? ok[0] : null; }
function genBadges(R, hard) {
  const [x, y] = R.sh([...SYMS]);
  const fillers = SYMS.filter((s) => s !== x && (!hard || s !== y));
  const mk = (xs, extra = []) => { const b = Array(4).fill(null); xs.forEach((i) => { b[i] = x; }); const free = b.map((c, i) => (c ? -1 : i)).filter((i) => i >= 0); free.forEach((i) => { b[i] = R.pick(fillers); }); extra.forEach((s) => { b[R.pick(free)] = s; }); return b.join(''); };
  for (;;) {
    const real = mk(R.pick([[0, 2], [0, 3], [1, 3]]));
    const cloneA = mk(R.pick([[0, 1], [1, 2], [2, 3]])); // deux X, mais côte à côte
    const cloneB = hard ? mk(R.pick([[0, 2], [0, 3], [1, 3]]), [y]) : mk(R.pick([[0], [1], [2], [3], [0, 2, 3], [0, 1, 3]])); // un ou trois X / un Y
    const badges = R.sh([real, cloneA, cloneB]);
    if (new Set(badges).size < 3 || new Set(real).size < 3) continue;
    const rule = { x, y: hard ? y : null };
    if (solveBadges(badges, rule) === badges.indexOf(real)) return { badges, rule, idx: badges.indexOf(real), real };
  }
}

// ================= 4. Ordre des clés I, II, III : indices logiques =================
const PERMS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
const clueTrue = (o, c) => (c.t === 'avant' ? o.indexOf(c.a) < o.indexOf(c.b) : c.t === 'juste' ? o.indexOf(c.b) - o.indexOf(c.a) === 1 : c.t === 'pas1' ? o[0] !== c.a : o[2] !== c.a);
export const keyClueText = (c) => (c.t === 'avant' ? `${KEYN[c.a]} avant ${KEYN[c.b]}` : c.t === 'juste' ? `${KEYN[c.a]} juste avant ${KEYN[c.b]}` : `${KEYN[c.a]} pas en ${c.t === 'pas1' ? 'premier' : 'dernier'}`);
export function parseKeyClue(txt) {
  const n = (s) => KEYN.indexOf(s); let m;
  if ((m = txt.match(/^(I+) juste avant (I+)$/))) return { t: 'juste', a: n(m[1]), b: n(m[2]) };
  if ((m = txt.match(/^(I+) avant (I+)$/))) return { t: 'avant', a: n(m[1]), b: n(m[2]) };
  m = txt.match(/^(I+) pas en (premier|dernier)$/); return { t: m[2] === 'premier' ? 'pas1' : 'pas3', a: n(m[1]) };
}
export function solveKeys(clues) { const ok = PERMS.filter((o) => clues.every((c) => clueTrue(o, c))); return ok.length === 1 ? ok[0] : null; }
function genKeys(R, n, hard, avoid = []) {
  for (;;) {
    const order = R.pick(PERMS);
    if (avoid.some((a) => a.join() === order.join())) continue;
    const all = [];
    for (let a = 0; a < 3; a++) {
      all.push({ t: 'pas1', a }, { t: 'pas3', a });
      for (let b = 0; b < 3; b++) if (a !== b) { all.push({ t: 'avant', a, b }); if (!hard) all.push({ t: 'juste', a, b }); }
    }
    const pool = all.filter((c) => clueTrue(order, c));
    for (let t = 0; t < 60; t++) {
      const clues = R.sh([...pool]).slice(0, n);
      if (new Set(clues.map((c) => c.a)).size < 2) continue; // indices sur au moins deux clés
      if (solveKeys(clues)?.join() !== order.join()) continue;
      if (clues.some((_, i) => solveKeys(clues.filter((__, j) => j !== i)))) continue; // chaque indice compte
      return { order, clues };
    }
  }
}

// ================= 5. Fils : règle logique « ni … ni … » =================
const wHas = (w, i, c) => (cd) => (cd.t === 'col' ? w[i] === cd.c : cd.t === 'adj' ? w[i - 1] === cd.c || w[i + 1] === cd.c : cd.t === 'bout' ? i === 0 || i === w.length - 1 : i > 0 && i < w.length - 1 && w[i - 1] === w[i + 1]);
const cands = (w, rule) => w.map((_, i) => i).filter((i) => (!rule.pos || wHas(w, i)(rule.pos)) && rule.neg.every((cd) => !wHas(w, i)(cd)));
export function solveWires(w, rule) { const c = cands(w, rule); return c.length === 1 ? c[0] : null; }
const negText = (cd) => (cd.t === 'col' ? cd.c : cd.t === 'adj' ? `à côté d'un ${cd.c}` : 'au bout');
export function wireText(rule, second) {
  if (!second) return `Fils : coupe celui qui n'est ${rule.neg.map((cd) => 'ni ' + negText(cd)).join(', ')}.`;
  const pos = rule.pos.t === 'adj' ? `celui à côté d'un ${rule.pos.c}` : 'celui entre deux fils pareils';
  const neg = rule.neg.length === 1 ? `mais pas ${negText(rule.neg[0])}` : `mais ni ${rule.neg.map(negText).join(' ni ')}`;
  return `Fils 2 : coupe ${pos}, ${neg}.`;
}
export function parseWireText(txt) {
  const one = (s) => { s = s.trim(); let m; if (s === 'au bout') return { t: 'bout' }; if ((m = s.match(/^à côté d'un (\w+)$/))) return { t: 'adj', c: m[1] }; return { t: 'col', c: s }; };
  let m = txt.match(/^Fils : coupe celui qui n'est (.+)\.$/);
  if (m) return { pos: null, neg: m[1].split(', ').map((p) => one(p.replace(/^ni /, ''))) };
  m = txt.match(/^Fils 2 : coupe (celui à côté d'un (\w+)|celui entre deux fils pareils), mais (pas|ni) (.+)\.$/);
  const pos = m[2] ? { t: 'adj', c: m[2] } : { t: 'entre' };
  return { pos, neg: m[3] === 'pas' ? [one(m[4])] : m[4].split(' ni ').map(one) };
}
function genWires(R, nNeg, second) {
  for (;;) {
    const w = Array.from({ length: 5 }, () => R.pick(COLORS));
    if (new Set(w).size < 3 || new Set(w).size > 4) continue;
    const present = [...new Set(w)];
    const types = R.sh(['col', 'adj', 'bout']).slice(0, nNeg).sort((a, b) => ['col', 'adj', 'bout'].indexOf(a) - ['col', 'adj', 'bout'].indexOf(b));
    const neg = types.map((t) => (t === 'bout' ? { t } : { t, c: R.pick(present) }));
    const rule = { pos: second ? (R.ri(3) ? { t: 'adj', c: R.pick(present) } : { t: 'entre' }) : null, neg };
    const idx = solveWires(w, rule);
    if (idx === null) continue;
    const parts = [...(rule.pos ? ['pos'] : []), ...neg.map((_, i) => i)];
    const drop = (p) => ({ pos: p === 'pos' ? null : rule.pos, neg: neg.filter((_, i) => i !== p) });
    if (parts.some((p) => cands(w, drop(p)).length < 2)) continue; // chaque condition compte
    if (second && rule.pos.t === 'adj' && neg.some((cd) => cd.t === 'adj' && cd.c === rule.pos.c)) continue;
    const near = w.map((_, i) => i).filter((i) => i !== idx && parts.filter((p) => !cands(w, drop(p)).includes(i) === false).length === 1).length; // fils qui ratent d'une seule condition
    return { wires: w, rule, idx, near };
  }
}

// ================= 6. Codes : symboles du vrai badge sur une grille du clavier =================
export function solveCode(badge, grid, reverse) { const s = [...badge]; if (reverse) s.reverse(); return s.map((x) => KEYPAD[grid.indexOf(x)]).join(''); }
function genGrid(R) { const g = Array(16).fill(''); const cells = R.sh(KEYPAD.map((k, i) => (/\d/.test(k) ? i : -1)).filter((i) => i >= 0)); SYMS.forEach((s, i) => { g[cells[i]] = s; }); return g; }

// ================= Textes (courts, sans formule) =================
export const SEQ_TEXT = 'Interrupteurs : complète la suite de l\'écran 2. Sa couleur d\'abord.';
export const SEQ2_TEXT = 'Seconde couche : nouvelle suite. Sa couleur d\'abord.';
export const trapRuleText = (nTrue) => (nTrue === 1 ? 'UNE SEULE DIT VRAI' : 'UNE SEULE MENT');
export const trapClue = (nTrue) => `Clé en croix : sur l'écran 2, une seule trappe ${nTrue === 1 ? 'dit vrai' : 'ment'}. Touche la bonne.`;
export const badgeText = (rule) => `Le vrai badge : deux ${rule.x}, pas côte à côte${rule.y ? `, et aucun ${rule.y}` : ''}.`;
export const parseBadgeText = (txt) => { const m = txt.match(/deux (\S), pas côte à côte(?:, et aucun (\S))?\./); return { x: m[1], y: m[2] || null }; };
export const code1Text = (rev) => `Code : les touches des symboles du badge, ${rev ? 'de droite à gauche' : 'dans l\'ordre'}.`;
export const CODE2_TEXT = 'Code 2 : nouvelle grille, badge lu à l\'inverse du code 1.';

// ================= Partie =================
const LET = 'ABCDEFGHJKLMNPRSTUVWXYZ';
export function draw(sub, tier) {
  const hard = tier === 'difficile', R = rng(sub);
  // plaque : n° de série et lot gardés comme leurres (plus aucune règle ne s'en sert)
  const serial = `${R.ri(10)}${R.pick([...LET])}${R.ri(10)}-${R.ri(10)}${R.ri(10)}${R.pick([...LET])}`, lot = 100 + R.ri(900);
  // moyen-difficile : motif de 4 (case à la fin ou au milieu), puis suite croissante ou motif de 5 ; difficile : plus long, case au milieu
  const k1 = hard ? R.pick(['p5mil', 'cmil']) : R.pick(['p4fin', 'p4mil']);
  const seq1 = genSeq(R, k1);
  const seq2 = genSeq(R, hard ? (k1 === 'cmil' ? 'p5mil' : 'cmil') : R.pick(['cfin', 'p5fin']));
  const nTrue = hard ? 1 : 2, tr = genTraps(R, nTrue);
  const rest = R.sh([1, 2, 3].filter((n) => n !== tr.croix));
  const bd = genBadges(R, hard);
  const kk1 = genKeys(R, hard ? 3 : 2, hard, [[0, 1, 2]]);
  const k2 = genKeys(R, hard ? 3 : 2, hard, [kk1.order, [0, 1, 2]]);
  const w1 = genWires(R, hard ? 3 : 2, false);
  const w2 = genWires(R, hard ? 2 : 1, true);
  const grid1 = genGrid(R); let grid2; do { grid2 = genGrid(R); } while (grid2.join() === grid1.join());
  const rev1 = hard;
  const code = solveCode(bd.real, grid1, rev1), code2 = solveCode(bd.real, grid2, !rev1);
  const run = {
    serial, lot, hard,
    seq1: seq1.seq, seqKind1: seq1.kind, first: seq1.answer, seq2: seq2.seq, seqKind2: seq2.kind, first2: seq2.answer,
    trapStmts: tr.stmts, trapTrue: nTrue, trapOf: { croix: tr.croix, badge: rest[0], cles: rest[1] },
    badges: bd.badges, badgeIdx: bd.idx, badgeRule: bd.rule, badgeReal: bd.real,
    order: kk1.order, keyClues: kk1.clues, order2: k2.order, keyClues2: k2.clues,
    wires: w1.wires, wireRule: w1.rule, wireIdx: w1.idx, near1: w1.near, fakeWire: (w1.idx + 1 + R.ri(4)) % 5,
    wires2: w2.wires, wireRule2: w2.rule, wireIdx2: w2.idx, near2: w2.near, fakeWire2: (w2.idx + 1 + R.ri(4)) % 5,
    grid1, grid2, rev1, code, code2,
  };
  run.score = scoreRun(run, tier);
  return run;
}
// note de difficulté = inférences enchaînées + leurres + mensonges signalés + pièges variables
// recalage : la note 0.1.6 compte d'autres énigmes ; CALIB remet la médiane de chaque palier au centre de sa bande 0.1.5
const CALIB = { 'moyen-difficile': -9, difficile: -16 };
const SEQ_STEPS = { p4fin: 2, p4mil: 3, p5fin: 3, p5mil: 3, cfin: 3, cmil: 4 };
export function scoreRun(run, tier) {
  const hard = tier === 'difficile';
  const steps = SEQ_STEPS[run.seqKind1] + (hard ? 3 : 2) /* trappes */ + (hard ? 3 : 2) /* badge */ + run.keyClues.length
    + run.wireRule.neg.length + (run.rev1 ? 3 : 2) /* code 1 */ + SEQ_STEPS[run.seqKind2] + run.keyClues2.length
    + run.wireRule2.neg.length + 1 + 3 /* code 2 */;
  const decoys = 1 /* plaque */ + 2 /* clones */;
  const lies = TIERS[tier].lies;
  const dup = new Set(run.code).size < 4 ? 1 : 0;
  const indirect = run.trapStmts.filter((t) => t.t === 'en' || t.t === 'pasEn').length; // « EN T2 » oblige à croiser deux trappes
  const flags = Math.min(3, run.near1) + Math.min(3, run.near2) + dup + (run.wireRule2.pos.t === 'entre' ? 1 : 0) + indirect
    - run.keyClues.filter((c) => c.t === 'juste').length - run.keyClues2.filter((c) => c.t === 'juste').length + CALIB[tier];
  return { total: steps + decoys + lies + flags, steps, decoys, lies, flags };
}
export function accept(run, tier, lo, hi) { return run.score.total >= lo && run.score.total <= hi && run.code !== run.code2; }
export function makeRun(seed) {
  seed >>>= 0;
  const tier = mulberry32(seed ^ 0x9e3779b9)() < 0.5 ? 'moyen-difficile' : 'difficile';
  const [lo, hi] = TIERS[tier].band;
  let run, tries = 0;
  do { run = draw((seed + tries * 0x632be5ab) >>> 0, tier); tries++; } while (!accept(run, tier, lo, hi) && tries < 200);
  return { seed, tier, tries, ...run, lies: TIERS[tier].lies };
}
