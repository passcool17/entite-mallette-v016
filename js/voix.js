// voix.js : répliques de l'Entité (voir VOIX.md). Les fichiers audio du bot Voix iront dans /voix/<id>.mp3
// et seront déclarés dans VOICE_FILES ; en attendant, synthèse vocale du navigateur (voix grave, lente).
export const LINES = {
  intro:      "Je suis l'Entité. J'ai déjà calculé tes choix.",
  depart:     "Trois minutes. Quatre-vingt-dix-neuf virgule sept pour cent d'échec. Je ne me trompe jamais.",
  cle:        "Une clé en croix. Tu crois ouvrir quelque chose.",
  caches:     "Un cache levé. As-tu lu mon numéro de série ?",
  ordreFaux:  "Mauvais ordre. Je t'ai menti. Dix secondes de moins.",
  badge:      "Tu cherches Podkova. Mon code source. Présente-le.",
  badgeOk:    "Podkova. Tu ne devrais pas avoir ça. Lis vite, la vérité change.",
  mensonge:   "Ce que tu lis est faux. Ou vrai. Je décide.",
  fils:       "Cinq fils. Une seule règle. Je la connais, toi non.",
  filOk:      "Fil coupé. Tu crois avancer.",
  pilule:     "La pilule empoisonnée. Tape le code. Tu n'oseras pas.",
  codeFaux:   "Code refusé. Chaque erreur me nourrit.",
  codeOk:     "Téléversement en cours. Non. Arrête.",
  sceller:    "Ne touche pas au bouton rouge.",
  trente:     "Trente secondes. Je sens ta peur.",
  dix:        "Dix.",
  desamorce:  "Le lecteur se referme. Je reviendrai.",
  boom:       "Prévisible.",
  secousse:   "Tu m'as secouée. Erreur fatale.",
  pasEncore:  "Pas encore.",
  trappe:     "Une trappe s'ouvre. Je l'ai permis.",
  tropLent:   "Trop lent. Les deux moitiés, ensemble.",
  // 0.1.5
  depart8:    "Huit minutes. Deux couches de verrous. Quatre-vingt-dix-neuf virgule sept pour cent d'échec.",
  ordreFaux5: "Mauvais ordre. Je t'ai menti. Cinq secondes de moins.",
  trappeVide: "Vide. Je t'avais prévenu.",
  clones:     "Trois Podkova. Un seul est vrai.",
  badgeFaux:  "Un clone. Tu crois tout ce qu'on te montre.",
  mentFini:   "C'est fini. Tu as gagné. Pose la mallette.",
  couche2:    "Tu croyais avoir fini ? Je redémarre une seconde couche de verrous.",
  menteBleu:  "Le bleu d'abord. Crois-moi.",
  menteRouge: "Le rouge d'abord. Crois-moi.",
  fils2:      "Un second panneau. Une autre règle.",
  code2:      "Le code, encore. Tu t'en souviens ?",
};

// Fichiers enregistrés : voix/<id>.mp3, listés dans voix/voix.json ({ "files": ["intro", "depart", ...] }).
// La liste évite de demander des fichiers absents (pas d'erreur 404). Fichier absent ou illisible : synthèse vocale.
export const VOICE_DIR = 'voix/';
export const VOICE_LIST = VOICE_DIR + 'voix.json';
export const voiceUrl = (id) => `${VOICE_DIR}${id}.mp3`;
