# Voix de l'Entité : répliques à enregistrer

Pour le bot Voix. Ton : froid, grave, lent, sans émotion, légèrement métallique. L'Entité tutoie le joueur.
Elle parle comme une machine qui a déjà calculé la suite. Pas de nom de film, d'acteur ni de personnage.

## Livraison

- Un fichier par réplique : `voix/<id>.mp3` (mono, 44,1 kHz, environ -16 LUFS, silence de 100 ms au début et à la fin).
- Déclarer chaque fichier dans `js/voix.js`, objet `VOICE_FILES` : `{ intro: 'voix/intro.mp3', ... }`.
- Le fichier passe alors dans l'`AnalyserNode` : l'œil pulse sur la vraie voix.
- Sans fichier, l'app utilise la synthèse vocale du navigateur (fr, hauteur 0,15, débit 0,82) et un grondement grave synthétisé.

## Répliques

| id | Quand | Texte |
|---|---|---|
| `intro` | Ouverture de la mallette | Je suis l'Entité. J'ai déjà calculé tes choix. |
| `depart` | 3,6 s après l'intro | Trois minutes. Quatre-vingt-dix-neuf virgule sept pour cent d'échec. Je ne me trompe jamais. |
| `caches` | (0.1.6 : en attente du nouveau texte, voir plus bas) | Un cache levé. As-tu compris ma suite ? |
| `trappe` | Une trappe (servo) s'ouvre | Une trappe s'ouvre. Je l'ai permis. |
| `tropLent` | Clés en croix pas tournées ensemble | Trop lent. Les deux moitiés, ensemble. |
| `cle` | Clés en croix réussies | Une clé en croix. Tu crois ouvrir quelque chose. |
| `badge` | (réserve) | Tu cherches Podkova. Mon code source. Présente-le. |
| `badgeOk` | Badge Podkova lu | Podkova. Tu ne devrais pas avoir ça. Lis vite, la vérité change. |
| `mensonge` | (réserve, moments de faux texte) | Ce que tu lis est faux. Ou vrai. Je décide. |
| `ordreFaux` | Mauvais ordre (interrupteurs ou clés I-III) | Mauvais ordre. Je t'ai menti. Dix secondes de moins. |
| `fils` | Écran des fils affiché | Cinq fils. Une seule règle. Je la connais, toi non. |
| `filOk` | (réserve) | Fil coupé. Tu crois avancer. |
| `pilule` | Bon fil coupé | La pilule empoisonnée. Tape le code. Tu n'oseras pas. |
| `codeFaux` | Code refusé | Code refusé. Chaque erreur me nourrit. |
| `codeOk` | Code accepté, téléversement | Téléversement en cours. Non. Arrête. |
| `sceller` | Gros bouton armé | Ne touche pas au bouton rouge. |
| `trente` | 30 s restantes | Trente secondes. Je sens ta peur. |
| `dix` | 10 s restantes | Dix. |
| `desamorce` | Victoire : piégée dans le lecteur 5D | Le lecteur se referme. Je reviendrai. |
| `boom` | Explosion (temps, mauvais fil) | Prévisible. |
| `secousse` | Explosion par secousse | Tu m'as secouée. Erreur fatale. |
| `pasEncore` | 0.1.6 : premier interrupteur basculé | Pas encore. |

### Nouvelles répliques 0.1.5 (seconde couche)

`depart8` et `ordreFaux5` remplacent `depart` (« Trois minutes ») et `ordreFaux` (« Dix secondes ») qui ne sont plus
dites. Les répliques marquées *mensonge* s'affichent avec l'œil rouge et le sous-titre qui grésille.

| id | Quand | Texte |
|---|---|---|
| `depart8` | 3,6 s après l'intro | Huit minutes. Deux couches de verrous. Quatre-vingt-dix-neuf virgule sept pour cent d'échec. |
| `ordreFaux5` | Mauvais ordre (interrupteurs ou clés) | Mauvais ordre. Je t'ai menti. Cinq secondes de moins. |
| `trappeVide` | Mauvaise trappe touchée (étape 2) | Vide. Je t'avais prévenu. |
| `clones` | Badges pris : 3 clones à l'écran 2 | Trois Podkova. Un seul est vrai. |
| `badgeFaux` | Faux badge présenté au lecteur | Un clone. Tu crois tout ce qu'on te montre. |
| `mentFini` | Code 1 accepté (*mensonge*) | C'est fini. Tu as gagné. Pose la mallette. |
| `couche2` | Début de la seconde couche | Tu croyais avoir fini ? Je redémarre une seconde couche de verrous. |
| `menteBleu` | Palier difficile, interrupteurs (*mensonge*, quand c'est le rouge d'abord) | Le bleu d'abord. Crois-moi. |
| `menteRouge` | Palier difficile, interrupteurs (*mensonge*, quand c'est le bleu d'abord) | Le rouge d'abord. Crois-moi. |
| `fils2` | Second panneau de fils | Un second panneau. Une autre règle. |
| `code2` | Code 2 à taper | Un second code. Une nouvelle grille. |

### À réenregistrer pour la 0.1.6 (mêmes ids, nouveau texte)

Les énigmes ne passent plus par le n° de série ni par « le code 1 à l'envers ». Le fichier actuel reste lu tant que
le nouveau n'est pas livré.

| id | Quand | Ancien texte | Nouveau texte |
|---|---|---|---|
| `caches` | (plus dite en 0.1.6 : remplacée par `pasEncore` au 1er interrupteur) | Un cache levé. As-tu lu mon numéro de série ? | Un cache levé. As-tu compris ma suite ? |
| `code2` | Code 2 à taper | Le code, encore. Tu t'en souviens ? | Un second code. Une nouvelle grille. |

## Signature sonore

L'Entité a une signature : un grondement grave (deux dents de scie à 55 et 82 Hz, filtre passe-bande 260-640 Hz)
modulé par syllabe. Le bot Voix peut la remplacer par une nappe enregistrée ; garder le même rôle : elle passe
dans l'analyseur pour animer l'œil.
