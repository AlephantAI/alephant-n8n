const fs = require('fs');
const path = require('path');

const nodes = ['AlephantAi', 'AlephantUsage', 'AlephantManagement'];

for (const nodeName of nodes) {
  const targetDir = path.join(__dirname, '..', 'dist', 'nodes', nodeName);
  fs.mkdirSync(targetDir, { recursive: true });

  for (const filename of ['alephant.svg', 'alephant.light.svg', 'alephant.dark.svg']) {
    const source = path.join(__dirname, '..', 'nodes', nodeName, filename);
    const target = path.join(targetDir, filename);
    fs.copyFileSync(source, target);
  }
}
