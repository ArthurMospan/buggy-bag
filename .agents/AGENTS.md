# Widget Build Instructions

When modifying the `buggy-bag` widget (in `c:/Users/Arthu/QuickTeam/buggy-bag`):
1. You MUST run `npm run build` in the `buggy-bag` directory. This script builds the widget and automatically copies `dist/buggy-bag-standalone.global.js` to `../buggy-bag-portal/public/buggy-bag-standalone.js`.
2. After the build completes, you MUST commit and push the updated `public/buggy-bag-standalone.js` file in the `buggy-bag-portal` repository so that the changes are deployed to the clients.
