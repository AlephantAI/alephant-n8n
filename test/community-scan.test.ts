import fs from 'fs';
import path from 'path';

const legacyMultiNodePaths = [
  'credentials/AlephantManagerApi.credentials.ts',
  'nodes/AlephantAi',
  'nodes/AlephantAnalyticsAi',
  'nodes/AlephantManagement',
  'nodes/AlephantUsage',
  'packages/alephant-ai',
  'packages/alephant-analytics',
  'packages/alephant-analytics-ai',
  'packages/alephant-management',
];

describe('n8n community scanner compatibility', () => {
  it('registers one Alephant action node in the umbrella package', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'),
    ) as {
      name: string;
      files: string[];
      n8n: { nodes: string[] };
    };

    expect(packageJson.name).toBe('@alephantai/n8n-nodes-alephant');
    expect(packageJson.files).toEqual(['dist', 'README.md', 'package.json']);
    expect(packageJson.n8n.nodes).toEqual(['dist/nodes/Alephant/Alephant.node.js']);
  });

  it('does not keep legacy multi-node source or package skeletons', () => {
    for (const legacyPath of legacyMultiNodePaths) {
      expect(fs.existsSync(path.join(__dirname, '..', legacyPath))).toBe(false);
    }
  });

  it('exposes AI Gateway and Analytics as resources in the umbrella node', async () => {
    const { Alephant } = await import('../nodes/Alephant/Alephant.node');
    const node = new Alephant();
    const resource = node.description.properties.find(({ name }) => name === 'resource');

    expect(node.description).toMatchObject({
      displayName: 'Alephant',
      name: 'alephant',
      usableAsTool: true,
      credentials: [{ name: 'alephantVirtualKeyApi', required: true }],
    });
    expect(resource).toMatchObject({
      options: expect.arrayContaining([
        { name: 'AI Gateway', value: 'aiGateway' },
        { name: 'Analytics', value: 'analytics' },
      ]),
    });
    expect(resource).not.toMatchObject({
      options: expect.arrayContaining([{ name: 'Management', value: 'management' }]),
    });
  });

  it('publishes only the umbrella package from version tags', () => {
    const workflow = fs.readFileSync(
      path.join(__dirname, '..', '.github', 'workflows', 'publish.yml'),
      'utf8',
    );

    expect(workflow).toContain("'v*.*.*'");
    expect(workflow).toContain('PACKAGE_DIR="."');
    expect(workflow).not.toContain('alephant-ai-v*.*.*');
    expect(workflow).not.toContain('alephant-analytics-v*.*.*');
    expect(workflow).not.toContain('alephant-analytics-ai-v*.*.*');
    expect(workflow).not.toContain('alephant-management-v*.*.*');
    expect(workflow).not.toContain('PACKAGE_DIR="packages/');
  });
});
