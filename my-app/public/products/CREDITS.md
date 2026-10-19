# Sources des packshots

Ces visuels sont utilisés dans un projet étudiant de démonstration. 8.6 et les dessins de ses canettes appartiennent à leurs titulaires respectifs.

- Original : `todo2go.com/cdn/shop/products/8.6-ORIGINAL.jpg`
- Gold : `media.houra.fr/ART-IMG-XL/95/13/8714800021395-2.jpg`
- Red : `carrefour.it/on/demandware.static/-/Sites-carrefour-master-catalog-IT/default/dwcce553ce/large/BIRRABAVARIA86REDLATTINA-8714800014182-1.png`
- Présentation officielle de la gamme : `royalswinkels.com/fr/portefeuille/bières-et-boissons/86`
- Référence visuelle et texture du pied de page : `fr.86beer.com/fr/fr.html` (image officielle mise en cache dans `public/brand` pour ce projet étudiant)

Les fichiers `real-*` conservent les téléchargements sources. Le script `scripts/bake-can-textures.py` projette ces photos sur la surface courbe de la canette et génère les textures WebP chargées par `src/three/canMaterials.js`. Cette préparation préserve l’encre blanche du logo tout en évitant un lourd calcul dans le navigateur. La condensation est une géométrie 3D avec un matériau d’eau transmissif ; elle n’est pas peinte sur la photo.

`scripts/process-real-packshots.py` prépare les images du catalogue (`original.png`, `gold.png`, `red.png`) et les atlas `label-*`. Seuls les panneaux arrière de ces atlas restent utilisés par la scène : ils constituent une reconstitution de démonstration, et non une reproduction certifiée du dos réel ou de ses valeurs nutritionnelles.
