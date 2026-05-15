const fs = require('fs');
const path = require('path');

const [, , targetDistDir, ...nodeNames] = process.argv;

if (!targetDistDir || nodeNames.length === 0) {
  throw new Error('Usage: node scripts/copy-package-assets.cjs <dist-dir> <NodeName...>');
}

for (const nodeName of nodeNames) {
  const targetDir = path.join(targetDistDir, 'nodes', nodeName);
  fs.mkdirSync(targetDir, { recursive: true });

  for (const filename of ['alephant.svg', 'alephant.light.svg', 'alephant.dark.svg']) {
    const source = path.join(__dirname, '..', 'nodes', nodeName, filename);
    const target = path.join(targetDir, filename);
    fs.copyFileSync(source, target);
  }
}
