# Frontend React — Le Collectif 8.6

Interface Vite/React du projet. Elle contient l’expérience 3D au scroll, le catalogue client et la page `/#/gerant`.

La partie visuelle et les animations ont été réalisées avec l'aide d'outils d'IA. Le frontend fonctionnel reste relié aux quatre routes Express demandées dans le sujet.

```powershell
npm ci
npm run dev
```

En local, Vite transmet `/bieres` à l’API Express sur le port 3000. Sur Vercel, définir `VITE_API_URL=https://web-techno.onrender.com`.

La documentation complète se trouve dans le [README principal](../README.md).

## Animation et performances

La scène n’est chargée que lorsque l’expérience entre dans l’écran. Les images de la collection utilisent WebP ; les étiquettes 3D sont déjà projetées dans `src/assets/cans` et bénéficient des noms de fichiers versionnés de Vite. Aucun calcul d’image n’est fait dans le navigateur du visiteur.

Les niveaux `high`, `balanced` et `economy` adaptent la résolution, le nombre de gouttes et la réfraction. Les téléphones démarrent en `balanced` ; des trames durablement lentes diminuent la qualité. Le framebuffer reste sous 2 millions de pixels. Une scène immobile, hors écran ou dans un onglet masqué ne tourne pas en continu. Les ombres sont recalculées seulement quand la canette bouge.

Les traînées, les envols et les transitions sont pilotés par le scroll. La préférence système de réduction des animations reste respectée. Les attributs `data-quality`, `data-fps`, `data-triangles` et `data-calls` du canvas permettent un contrôle local du rendu, sans envoi de télémétrie. La mesure FPS est indicative, propre à l’appareil et aux trames actives.

Après modification des photos sources uniquement : `python ../scripts/bake-can-textures.py` (Pillow et NumPy). Les WebP générés sont inclus dans Git ; Vercel utilise simplement `npm run build`.

Vérification : `npm run lint`, `npm test`, `npm run build`, puis `npm run preview`. Le build de production utilise l’API Render et ses quatre routes `/bieres`.
