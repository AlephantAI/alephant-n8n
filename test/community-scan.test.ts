import fs from 'fs';
import path from 'path';

describe('n8n community scanner compatibility', () => {
  it('does not use restricted timer globals in node source', () => {
    const usageNode = fs.readFileSync(
      path.join(__dirname, '..', 'nodes', 'AlephantUsage', 'AlephantUsage.node.ts'),
      'utf8',
    );

    expect(usageNode).not.toMatch(/\bsetTimeout\b/);
  });
});
