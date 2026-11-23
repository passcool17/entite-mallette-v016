# Entité · Mallette (v0.1.6, archive figée)

Simulateur web (PWA, téléphone d'abord) de la mallette de désamorçage ESP32 de Pascal, sous l'œil de l'Entité.

**Ceci est une archive figée de la v0.1.6** (commit `25979a331fe2d38fb7b784c29dc8a89b9a59811b`, avec les 33 voix Piper v2). Elle n'est pas destinée à recevoir de nouvelles versions.

- Lien de cette archive : https://passcool17.github.io/entite-mallette-v016/
- Dépôt : https://github.com/passcool17/entite-mallette-v016
- Version en cours (base v0.1.5, voix ElevenLabs) : https://passcool17.github.io/entite-mallette/

Le service worker utilise le cache `entite-mallette-v016-0.1.6` et, à l'activation, ne supprime que les caches dont le nom commence par `entite-mallette-v016-`. Il ne touche jamais aux caches de l'app principale (`entite-mallette-…`) sur le même origine `passcool17.github.io`.

## État

Version 0.1.6 (archive figée, publiée le 23 nov. 2026).

- 0.1.6 : plus aucun calcul. Les énigmes du n° de série (reste, parité, poids des chiffres, fragments de code) sont
  remplacées par des énigmes de logique visuelle sur l'écran 2 : suites de couleurs, trappes qui mentent, symboles des
  badges, indices d'ordre des clés, règles de fils « ni … ni … », grille du clavier pour les codes. Textes d'une ou deux
  lignes, sans formule. Pas plus facile : chaque énigme demande au moins deux déductions enchaînées, leurres gardés
  (clones, plaque, symboles en trop, fils qui ratent d'une seule condition), mensonges au même rythme (8 / 12).
  Voir « Règles 0.1.6 » plus bas. Le cache du service worker change de nom, ce qui recharge aussi les voix v2.

- 0.1.5 : partie ~2x plus longue mais pas plus difficile : 12 étapes en deux couches de verrous, 8 minutes.
  Le début demande maintenant de vraies déductions (interrupteurs à deux indices, trappe à trouver, vrai badge Podkova
  parmi 3 clones). Moins de leurres et pénalités allégées (5 s / 8 s, +3,2 %) ; mensonges de l'Entité gardés au même
  rythme (8 ou 12 par partie, toujours signalés par l'œil rouge). Voir « Règles 0.1.5 » plus bas.

- 0.1.4 : plus difficile, par la réflexion : tout se déduit du n° de série et des écrans, l'Entité ment (œil qui
  grésille), 4 minutes. Un seul mode (pas de mode facile).

- 0.1.3 : correctif paysage (téléphone couché, avec ou sans barres du navigateur) : panneau entier toujours visible,
  fils et code agrandis dans une loupe, bouton son qui n'est plus coupé. Écran de chargement avec vrai pourcentage,
  et correction du blocage à la 1re visite (rechargement provoqué par le service worker).

- 0.1.2 : musique de tension qui accélère avec le compte à rebours, parties tirées au sort (code, ordre des clés,
  bon fil, trappes) avec graine reproductible, vibrations (réglage à côté du son).

- 0.1.1 : plein écran (bouton + automatique à « Ouvrir la mallette », verrouillage paysage si le navigateur le permet),
  voix enregistrées lues depuis `voix/` avec repli sur la synthèse vocale, zones tactiles agrandies (serrures, clavier).
- 0.1.0 : première version (QA PASS).

## Fonctions

- **L'œil de l'Entité** (Canvas2D, `js/eye.js`) : anneaux de points lumineux qui tournent par groupes, ondes de lumière,
  iris à pétales lumineux, pupille noire à stries, blocs de données à la dérive. Il pulse avec la voix (`AnalyserNode`),
  suit du regard le dernier geste et a 5 humeurs : repos, regard, colère (moins de 30 s ou erreur), piégée (victoire :
  l'œil se replie en disque lumineux, le lecteur optique 5D), explosion.
- **Panneau à l'échelle réelle** d'une mallette Lykus HC-3010 : CYD 1 (l'œil), afficheur 4 chiffres TM1637,
  2 barrettes WS2812B de 8 LED, 5 serrures Gebildet 12 mm (points rouge/vert), 3 trappes à servo SG90,
  2 interrupteurs à cache (rouge, bleu), lecteur RFID, gros bouton rouge lumineux (maintenir), clavier membrane 4x4,
  CYD 2 (fils à couper, code, téléversement), grille de haut-parleur.
- **Probabilité d'échec** affichée en % : elle baisse à chaque étape et remonte à chaque erreur.
- **Mensonges de l'Entité** : l'écran 2 montre d'abord un faux code, un faux ordre de clés ou un faux fil, puis la vérité
  revient ; le % ment parfois une fraction de seconde.
- **Sons** synthétisés (WebAudio) : tic-tac, bips, clés, servos, cisaille, alarme, explosion, accord final.
- **Musique de tension** (`audio/tension.mp3`, 16 s en boucle, MP3 96 kb/s, 193 Ko) : générée gratuitement sur la box
  avec MusicGen (modèle small), prompt « suspense thriller underscore loop, relentless pulsing analog synth bass
  sixteenth notes, metallic clock ticking, dark drone, cinematic tension, steady 120 bpm, no melody », puis bouclée
  sans couture (fondu enchaîné de 1,5 s de la fin dans le début). Elle démarre au toucher « Ouvrir la mallette »,
  passe par le bouton son, baisse sous chaque réplique, fond à la victoire et se coupe net à l'explosion.
  Intensité de 0 à 1 selon le temps restant (courbe qui accélère sous 60 s) : boucle jusqu'à +14 % de vitesse,
  filtre passe-bas qui s'ouvre de 1,4 à 10,4 kHz, et une basse synthétisée (WebAudio) hachée de 2 à 8 Hz qui monte.
- **Vibrations** : courte sur une erreur, longue à l'explosion, double à la victoire. Bouton à côté du son,
  réglage gardé dans le téléphone. Sans vibreur (iPhone) : bouton masqué, rien ne se passe.
- **Voix** : répliques froides en français (synthèse vocale du navigateur en attendant le bot Voix, voir `VOIX.md`),
  sous-titrées sous l'œil, avec un grondement grave qui passe dans l'analyseur.
- **Secousse = explosion** (DeviceMotion, permission demandée sur iPhone), bouton « Simuler une secousse » en secours.
- **Aperçu CYD** `?cyd=1` : rendu natif 240x320, 20 i/s max, particules réduites, boutons d'humeur. Voir `PORTAGE-CYD.md`.
- **Plein écran** : bouton en haut à droite, et automatique au toucher « Ouvrir la mallette ». Une fois en plein écran,
  l'app demande `screen.orientation.lock('landscape')` ; si c'est refusé, elle garde l'orientation actuelle.
  Sans API plein écran (Safari iPhone), le bouton est masqué et l'accueil propose d'installer l'app sur l'écran d'accueil.
- **Zones tactiles** agrandies sans changer le dessin à l'échelle : serrures 48 px, touches du clavier jusqu'à l'espace
  entre les touches (environ 40 px en portrait, limité par le pas réel de 17 mm du clavier membrane).
- PWA installable, hors ligne (service worker versionné écrit à la main), `prefers-reduced-motion` respecté,
  zones sûres, libellés accessibles. Le son ne démarre qu'après un toucher.

## Séquence de désamorçage (ordre final)

Minuterie : 4:00. Erreurs : -10 s (ordre) ou -15 s (code), et la probabilité d'échec remonte.

### Règles 0.1.6 : logique visuelle, 12 étapes (énigmes dans `js/puzzles.js`)

Couche 1
1. Interrupteurs : compléter la suite de couleurs de l'écran 2 ; sa couleur se lève d'abord. Moyen : motif de 4
   (case vide à la fin ou au milieu) ; difficile : motif de 5 ou suite croissante (a b c, a b b c…), case au milieu.
2. Clé en croix : 3 phrases sur l'écran 2 (« T1 PAS ICI », « T3 EN T2 »…). Moyen : une seule ment ; difficile : une
   seule dit vrai. Mauvaise trappe : vide, −5 s. Puis Croix A + B ensemble.
3. Badges : 3 clones de 4 symboles. Moyen : « deux ▲, pas côte à côte » ; difficile : « …, et aucun ● ».
4. Clés I-III : 2 indices (moyen) ou 3 indices tous utiles (difficile) : « II avant I », « III pas en premier »…
5. Fils : « celui qui n'est ni rouge, ni à côté d'un bleu » (2 conditions ; difficile : 3, avec « ni au bout »).
6. Code 1 : la grille de l'écran 2 a la forme du clavier ; chaque symbole du vrai badge donne une touche. Moyen : dans
   l'ordre ; difficile : de droite à gauche. Puis le faux « C'est fini. Tu as gagné. » (mensonge signalé).

Couche 2 : 7. nouvelle suite (autre type). 8. Croix A + B à l'arrêt ensemble. 9. Clés : nouveaux indices, autre ordre.
10. Fils 2 : « celui à côté d'un jaune, mais pas vert » (difficile : « mais ni vert ni au bout » ; ou « entre deux
fils pareils »). 11. Code 2 : nouvelle grille, badge lu dans l'autre sens. 12. Gros bouton.

Chaque énigme a une seule réponse et chaque condition sert (vérifié par `node tests/v016.mjs`, 3000 graines, par
des solveurs qui ne lisent que l'écran). Le n° de série et le lot restent sur la plaque comme leurres.
Note de difficulté 0.1.6 = déductions + leurres + mensonges + pièges variables (fils qui ratent d'une seule condition,
chiffre en double dans le code, phrases « EN T2 » à croiser…), recalée sur les bandes 0.1.5 : moyen 30–32,
difficile 37–39 (`node tests/paliers.mjs`).

### Règles 0.1.5 : deux couches, 12 étapes (remplacées en 0.1.6)

Couche 1
1. Interrupteurs : n° avec une voyelle (A, E, U, Y) → bleu d'abord ; sinon dernier chiffre pair → bleu, impair → rouge.
2. Clé en croix : trappe = (reste de 1er chiffre ÷ 3) + 1 (mauvaise trappe : vide, −5 s). Puis Croix A + B ensemble.
3. Badges : 3 clones Podkova sur l'écran 2 (agrandi) ; le vrai porte une lettre du n° de série (clone : −5 s).
4. Clés I-III : de la plus légère à la plus lourde (poids = 1er, 2e, 3e chiffre). Fragment de code noté.
5. Fils : règle du palier (2 ou 3 cas). 6. Code 1 : comme en 0.1.4. L'Entité ment : « C'est fini. Tu as gagné. »

Couche 2 (« je redémarre une seconde couche »)
7. Interrupteurs : 1er chiffre pair → bleu d'abord ; impair → rouge. 8. Croix A + B ramenées à l'arrêt ensemble.
9. Clés I-III à l'envers (de la plus lourde à la plus légère). 10. Fils, panneau 2 : moyen = le sans-jumeau ;
   difficile = plus d'un bleu → le 1er bleu, sinon le sans-jumeau. 11. Code 2 = code 1 (affiché en haut de l'écran 2)
   à l'envers. 12. Gros bouton (« Ne touche pas au bouton rouge » : mensonge signalé).

Mensonges (œil rouge) : moyen 8 = par couche faux fragment/code, faux ordre, faux fil, 1 mensonge parlé ; difficile 12
= + « Le bleu/rouge d'abord. Crois-moi. » à chaque couche, faux ordres répétés, fausse probabilité. Bandes de note :
moyen 30–32, difficile 37–39 (`node tests/paliers.mjs`). Partie complète : `node tests/v015.mjs [base] [graine]`
(`tests/v014.mjs` suit l'ancien déroulé 0.1.4 et ne s'applique plus).

### Règles à déduire (0.1.4, mode unique)

Tout vient du panneau : la plaque affiche `N° DE SÉRIE 4K7-29B · LOT 316` (tiré de la graine ; le lot est un leurre).
Les règles sont dans le texte d'étape ; aucune réponse n'est affichée telle quelle.

- **Interrupteurs** : dernier chiffre du n° pair → bleu d'abord ; impair → rouge d'abord.
- **Clés I, II, III** : chaque clé pèse un chiffre du n° (I = 1er, II = 2e, III = 3e, toujours différents) ;
  tourner de la plus légère à la plus lourde.
- **Fils** : plus d'un fil rouge → le dernier rouge ; sinon, dernier chiffre pair → le 2e fil ; sinon → le fil
  sans jumeau. Mauvais fil = explosion.
- **Code (pilule)** : 1er chiffre = dernier chiffre du n° ; 3e = somme des 4 chiffres du n°, unités seules ;
  2e et 4e = fragment montré par l'écran 2 après le badge (`CODE _6_2` reste en haut de l'écran 2).
- **Mensonges** : l'écran 2 affiche parfois un faux code, un faux ordre ou un faux fil ; à chaque mensonge
  (et quand le % ment), l'œil et le CYD 1 grésillent en rouge. Ce qui s'affiche pendant le grésillement est faux.
- Croix A et B : toujours à moins d'une seconde d'écart.
- **Deux paliers cachés**, tirés ~50/50 par la graine (jamais affichés, sauf avec `?debug=1`) :
  - *moyen-difficile* : fils « plus d'un rouge → le dernier rouge ; sinon → le sans-jumeau » ; 3e chiffre du code = 1er
    chiffre du n° ; 4 mensonges (faux code, faux ordre une fois, faux fil, « ne touche pas »).
  - *difficile* : chaîne des fils complète (+ « dernier chiffre pair → le 2e ») et réponse toujours en branche 2 ou 3 ;
    3e chiffre = somme des 4 chiffres (unités) ; n° de lot fait des chiffres du n° de série (leurre) ; faux fil le plus
    tentant ; 6 mensonges (+ faux ordres répétés, fausse probabilité).
  - Chaque tirage est noté (étapes de déduction + leurres + mensonges + pièges non triviaux). Bandes : moyen 13–15,
    difficile 19–21 ; l'ordre des clés n'est jamais I II III. Hors bande : on retire avec une sous-graine dérivée,
    donc même `?seed` = même partie. `node tests/paliers.mjs` vérifie 1000 graines (répartition, bandes, temps).
- Le n° de série est aussi rappelé dans chaque texte d'étape qui s'en sert (la plaque peut être sous le pli).
- Clés : on compte les **chiffres** du n° (les lettres sont ignorées). Le code part dès le 4e chiffre (pas de #).
- Au gros bouton, l'Entité dit « Ne touche pas au bouton rouge » : c'est un mensonge, signalé (œil rouge + sous-titre
  qui grésille).
- Portrait : à l'étape des fils, l'écran 2 passe agrandi dans la zone de l'œil (5 fils de 44 px) et la page remonte,
  pour voir la règle et les fils ensemble (si la zone de l'œil fait moins de 330 px : défilement jusqu'à l'écran 2).

| # | Étape | Pièce | Ouvre | Échec |
|---|---|---|---|---|
| 1 | Lever le cache rouge, basculer ; puis le bleu | interrupteurs à cache | **Trappe A** : les 2 moitiés de la clé en croix | 88,4 % |
| 2 | Tourner Croix A et Croix B ensemble (moins de 1 s d'écart : deux doigts, ou l'une puis l'autre très vite) | 2 serrures | **Trappe B** : badge Podkova (le code source) | 75,1 % |
| 3 | Présenter le badge Podkova | lecteur RFID | code sur l'écran 2 (faux puis vrai) + **Trappe C** : clés I, II, III | 61,8 % |
| 4 | Tourner I, II, III dans l'ordre de l'écran 2 (il ment d'abord) | 3 serrures | écran des fils | 44,6 % |
| 5 | Couper le seul fil sans jumeau (mauvais fil = explosion) | CYD 2 | saisie du code | 29,3 % |
| 6 | Taper le code Podkova : téléversement de la pilule empoisonnée | clavier 4x4 | arme le gros bouton | 11,2 % |
| 7 | Maintenir le gros bouton rouge 1,5 s : sceller le lecteur 5D | gros bouton | victoire | 0,0 % |

Trappes A, B et C : à chaque partie, elles tombent au hasard sur T1, T2 et T3 (le texte d'étape dit laquelle s'ouvre).

### Parties tirées au sort

Chaque partie tire d'une seule graine (générateur mulberry32) : le code de la pilule (4 chiffres), l'ordre des clés
I, II, III, les couleurs des fils et le fil sans jumeau, et la trappe de chaque objet. Les écrans, les faux indices et
les textes d'étape suivent ces valeurs.

- `?seed=12345` : rejoue toujours la même partie (aussi après « Recommencer »).
- `?debug=1` : affiche la graine à côté du numéro de version, et la journalise dans la console.
- `?cyd=1` (aperçu CYD) n'est pas touché.

Tant qu'une clé n'est pas ramassée dans sa trappe, sa serrure est vide et refuse le geste.
Explosion : temps écoulé, mauvais fil ou secousse.

## Chargement (0.1.3)

- L'écran de chargement est en HTML/CSS dans `index.html` : il s'affiche dès le premier octet, avant la feuille de style,
  le JS, les polices et le service worker. Anneaux de points cyan et balayage de la barre animés en continu (CSS,
  sur le compositeur) : rien ne paraît figé même si le réseau cale ou si le JS calcule.
- **Pourcentage réel**, en deux phases : code (CSS + modules, 15 %), mesuré en octets par `PerformanceObserver` ;
  puis médias (85 %) : `audio/tension.mp3`, les voix listées dans `voix/voix.json` et les 3 polices, en octets reçus
  (flux `fetch`) sur octets attendus (`Content-Length`). Le % ne recule jamais. `role="progressbar"` + `aria-valuenow`.
- « Ouvrir la mallette » reste désactivé jusqu'à 100 %. Après 8 s : bouton « Ouvrir sans attendre » (le chargement
  continue). Fichier en échec : message + **Réessayer** (ou jouer sans). Code qui n'arrive pas en 25 s : message + Réessayer.
- Pas de double téléchargement : `js/preload.js` garde les fichiers, `audio.js` les reprend (décodage seulement au
  toucher) ; le service worker précache les médias depuis le cache HTTP.
- **Cause du « plus rien ne bouge » à la 1re visite** : le service worker s'installait pendant le chargement
  (il re-téléchargeait tout, musique comprise, en concurrence), puis `clients.claim()` déclenchait `controllerchange`
  et l'app **rechargeait la page** (prévu pour les mises à jour, pas pour la 1re visite). Ajoutez à ça une cascade de
  modules JS (3 allers-retours) et une feuille de style bloquante. Corrigé : rechargement seulement s'il y avait déjà
  un SW, SW enregistré après le préchargement, `modulepreload` pour les modules, CSS non bloquante derrière l'écran
  de chargement, polices sorties du chemin critique.
- Mesuré (`tests/v013-chargement.mjs`, contexte neuf, Fast 3G + CPU x4) : écran de chargement à 0,8 s, prêt à 5,0 s,
  une seule navigation, musique et voix téléchargées une fois ; revisite prête en 1,3 s.

## Paysage sur téléphone (0.1.3)

Testé à 915x412, 915x340 (barres du navigateur visibles) et 800x360.

- Le panneau garde son rapport 273:169 et sa largeur suit la hauteur réellement visible (`innerHeight`, recalculée au
  redimensionnement et quand le texte d'étape change de hauteur) : il tient entier, sans défiler.
- **Loupe** : à l'étape des fils, l'écran 2 passe agrandi dans la colonne de l'œil (5 fils de 44 px de haut, toujours
  visibles). À l'étape du code, l'écran 2 et le clavier y passent ensemble (touches de 38 px, zone tactile de 44 px
  avec l'espace entre les touches). Un repère « agrandi ◀ » reste à leur place sur le panneau ; tout revient ensuite.
  En portrait, rien ne change.
- La colonne de l'œil (300 px au minimum) garde la minuterie et les 3 boutons ; la probabilité d'échec passe dans
  la barre d'étape. Avant, le bouton son débordait et était à moitié coupé.

## Panneau : dimensions et choix d'orientation

Les cotes réelles sont dans `js/panel-config.js` (pour le futur panneau imprimé en 3D) :
zone utile 273 x 169 mm, base 83 mm, couvercle 17 mm, encombrement de chaque pièce et deux implantations en mm.

- **Paysage** (écran large, ou téléphone tourné) : le panneau est affiché à 273:169, pièces à l'échelle.
- **Portrait** (téléphone 412x915) : **le panneau est tourné de 90°** (169 de large x 273 de haut). Le rapport et l'échelle
  des pièces sont conservés, mais les pièces sont replacées dans ce cadre (une implantation dédiée) plutôt que tournées
  avec leur texte, pour rester lisibles. Les CYD sont montés en portrait (natif 240x320), sauf le CYD 2 en paysage
  dans l'implantation paysage.
- 3 trappes sur 5 servos SG90 disponibles : il en reste 2 en réserve.

## Fichiers

- `index.html`, `css/app.css`, `js/app.js` (logique et panneau), `js/eye.js` (rendu), `js/eye-config.js` (tous les
  paramètres de l'œil), `js/panel-config.js` (cotes réelles), `js/audio.js`, `js/voix.js`, `sw.js`, `manifest.webmanifest`.
- `tests/v016.mjs` (0.1.6 : solveurs logiques sur 3000 graines + partie complète par palier en 412x915, `VP=915x412` pour le paysage ; captures dans `/workspace/qa/entite-mallette/v0.1.6/`), `js/puzzles.js` (énigmes sans DOM),
  `tests/v014.mjs` (partie complète avec `?seed=N` en lisant seulement l'écran), `tests/v013-chargement.mjs` (1re visite à froid en Fast 3G, revisite, échec + Réessayer), `tests/v013.mjs` (test léger 0.1.3 : paysage 915x412, 915x340, 800x360, toutes les étapes), `tests/v012.mjs` (test léger 0.1.2 : graine, indices, musique, vibrations, `?cyd=1`), `tests/v011.mjs` (test léger 0.1.1 : plein écran, voix fichier + repli, zones tactiles, paysage),
  `tests/voix-liste.mjs` (liste des voix), `tests/run.mjs` (test léger : séquence complète jusqu'à la victoire, console, captures), `tests/fps.mjs` (une mesure d'fps),
  `tests/eye.html` (œil seul, `?ref=1` = cadrage de la référence).
- Polices auto-hébergées : Chakra Petch et JetBrains Mono (licence OFL, `fonts/OFL.txt`).

## Tester en local

```sh
python3 -m http.server 8792   # depuis ce dossier
node tests/run.mjs http://localhost:8792/
```

## Voix enregistrées

- Déposer les fichiers dans `voix/<id>.mp3` (ids de `VOIX.md`), puis lancer `node tests/voix-liste.mjs` : il écrit
  `voix/voix.json` avec la liste des fichiers présents. L'app ne demande que les fichiers listés (pas d'erreur 404).
- Chaque fichier passe dans l'`AnalyserNode` : l'œil pulse sur la vraie voix. Fichier absent, illisible ou trop lent
  à arriver : synthèse vocale + grondement, comme avant. Le service worker garde les MP3 lus pour le hors ligne.

## Archive figée

Pas de suite dans ce dépôt. Les prochaines étapes se font dans https://github.com/passcool17/entite-mallette (version en cours).
