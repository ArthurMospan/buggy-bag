const fs = require('fs');
const path = require('path');

const colorMap = {
  // Base App background
  '#0c0c0f': '#141419',
  '#0c0c12': '#141419',
  
  // Sidebars, Panels, Cards
  '#111118': '#1c1c22',
  '#15161c': '#1c1c22',
  
  // Hover states, buttons
  '#1a1b23': '#23232b',
  '#1c1c22': '#23232b',
  '#21222c': '#23232b',
  '#26262e': '#2d2d38',
  
  // Borders
  '#1e1e26': '#2c2c35',
  '#252530': '#2c2c35',
  '#262733': '#2c2c35',
  '#2a2a36': '#2c2c35',
  '#32323e': '#3a3a46',
  
  // Text colors slightly lighter to keep contrast
  '#686880': '#7a7a90', // muted
  '#8484a0': '#9696b0', // secondary
  '#a8a8bc': '#b4b4c8', // secondary light
};

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      for (const [oldColor, newColor] of Object.entries(colorMap)) {
        const regex = new RegExp(oldColor, 'gi');
        if (regex.test(content)) {
          content = content.replace(regex, newColor);
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}

processDir('src');
console.log('Colors unified and lightened!');
