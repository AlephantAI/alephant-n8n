const path = require('path');
const { spawnSync } = require('child_process');

const nodes = ['Alephant'];
const script = path.join(__dirname, 'copy-package-assets.cjs');
const targetDistDir = path.join(__dirname, '..', 'dist');
const result = spawnSync(process.execPath, [script, targetDistDir, ...nodes], { stdio: 'inherit' });

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
