// panel-config.js : dimensions réelles de la mallette et du panneau (pour le simulateur ET le futur panneau imprimé en 3D).
// Toutes les valeurs sont en millimètres. Origine = coin haut-gauche de la zone utile du panneau.

export const CASE = {
  model: 'Lykus HC-3010',
  panel: { width: 273, height: 169 },   // zone utile du panneau (paysage), rapport ≈ 1,615
  baseDepth: 83,                        // profondeur de la base
  lidDepth: 17,                         // profondeur du couvercle
  servos: { available: 5, used: 3 },    // SG90 : 3 trappes, 2 en réserve
};

// Encombrement des pièces (largeur x hauteur, vue de face).
export const PARTS = {
  cyd:      { w: 86, h: 50, screen: { w: 57.6, h: 43.2 }, note: 'ESP32-2432S028 (CYD) 2,8 po ILI9341 240x320' },
  tm1637:   { w: 42, h: 24, note: 'afficheur 4 chiffres 0,56 po' },
  ledBar:   { w: 53, h: 10, leds: 8, note: 'barrette WS2812B 8 LED' },
  keySwitch:{ hole: 12, w: 20.6, h: 26, note: 'Gebildet 12 mm métal, 2 positions à verrouillage, points rouge/vert' },
  toggle:   { w: 22, h: 46, note: 'interrupteur à levier + cache basculant (rouge, bleu)' },
  rfid:     { w: 46, h: 40, note: 'zone de lecture RC522 (module 60x40 sous le panneau)' },
  bigButton:{ d: 44, note: 'gros bouton rouge lumineux' },
  keypad:   { w: 69, h: 77, note: 'clavier membrane 4x4' },
  trap:     { w: 32.3, h: 27, note: 'trappe sur servo SG90' },
  speaker:  { note: 'grille haut-parleur / buzzer' },
};

// Implantations. x, y, w, h en mm. 'paysage' = panneau réel 273 x 169.
// 'portrait' = même panneau tourné de 90° (169 x 273) pour le téléphone : mêmes pièces, même échelle, replacées.
export const LAYOUT = {
  landscape: {
    width: 273, height: 169,
    cyd1:    { x: 5,   y: 5,   w: 50,  h: 86, rot: true },  // écran de l'œil, monté en portrait
    tm1637:  { x: 61,  y: 5,   w: 42,  h: 24 },
    bar1:    { x: 108, y: 6,   w: 53,  h: 10 },
    bar2:    { x: 108, y: 19,  w: 53,  h: 10 },
    keys:    { x: 61,  y: 34,  w: 103, h: 26 },
    traps:   { x: 61,  y: 64,  w: 103, h: 27 },
    toggleR: { x: 5,   y: 100, w: 22,  h: 46 },
    toggleB: { x: 33,  y: 100, w: 22,  h: 46 },
    rfid:    { x: 61,  y: 102, w: 46,  h: 40 },
    bigbtn:  { x: 117, y: 99,  w: 44,  h: 44 },
    cyd2:    { x: 176, y: 5,   w: 86,  h: 50 },             // écran des fils, monté en paysage
    keypad:  { x: 172, y: 62,  w: 69,  h: 77 },
    speaker: { x: 247, y: 62,  w: 21,  h: 77 },
    label:   { x: 5,   y: 152, w: 263, h: 12 },
  },
  portrait: {
    width: 169, height: 273,
    cyd1:    { x: 5,   y: 5,   w: 50,  h: 86, rot: true },
    tm1637:  { x: 61,  y: 5,   w: 42,  h: 24 },
    bar1:    { x: 108, y: 6,   w: 53,  h: 10 },
    bar2:    { x: 108, y: 19,  w: 53,  h: 10 },
    keys:    { x: 61,  y: 34,  w: 103, h: 26 },
    traps:   { x: 61,  y: 64,  w: 103, h: 27 },
    toggleR: { x: 5,   y: 99,  w: 22,  h: 46 },
    toggleB: { x: 31,  y: 99,  w: 22,  h: 46 },
    rfid:    { x: 60,  y: 102, w: 46,  h: 40 },
    bigbtn:  { x: 115, y: 99,  w: 44,  h: 44 },
    keypad:  { x: 5,   y: 154, w: 69,  h: 77 },
    cyd2:    { x: 80,  y: 152, w: 50,  h: 86, rot: true },  // tourné : écran des fils en portrait
    speaker: { x: 137, y: 154, w: 27,  h: 77 },
    label:   { x: 5,   y: 252, w: 159, h: 16 },
  },
};
