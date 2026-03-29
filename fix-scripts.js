const fs = require('fs');
const path = require('path');

const appsDir = path.join(__dirname, 'apps');
const modules = fs.readdirSync(appsDir).filter(m => m !== 'frontend' && m !== 'api-gateway');

for (const mod of modules) {
  const pkgFile = path.join(appsDir, mod, 'package.json');
  if (!fs.existsSync(pkgFile)) continue;
  
  let data = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
  data.scripts = Object.assign({}, data.scripts, {
    "start": "node dist/main.js",
    "test": "jest --passWithNoTests",
    "build": "tsc"
  });
  
  fs.writeFileSync(pkgFile, JSON.stringify(data, null, 2));
  console.log(`[FIXED] ${pkgFile}`);
}

const macroFile = path.join(__dirname, 'setup-swarm.sh');
let macroData = fs.readFileSync(macroFile, 'utf8');
macroData = macroData.replace(
  /"scripts": \{ "build": "tsc" \}/g,
  '"scripts": {\n    "build": "tsc",\n    "start": "node dist/main.js",\n    "test": "jest --passWithNoTests"\n  }'
);
fs.writeFileSync(macroFile, macroData);
console.log(`[FIXED] setup-swarm.sh`);
