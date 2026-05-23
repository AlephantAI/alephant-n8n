import fs from 'fs';
import path from 'path';

const verificationPackages = [
  {
    directory: 'alephant-ai',
    packageName: '@alephantai/n8n-nodes-alephant-ai',
    nodePath: 'dist/nodes/AlephantAi/AlephantAi.node.js',
    readmeTerms: [
      'Installation',
      'Authentication',
      'Alephant Virtual Key',
      'https://developers.alephant.io/docs/overview/getting-started/quickstart-guide',
      'Worked Example: Chat Completion',
      'Chat Completion',
    ],
  },
  {
    directory: 'alephant-analytics',
    packageName: '@alephantai/n8n-nodes-alephant-analytics',
    nodePath: 'dist/nodes/AlephantUsage/AlephantUsage.node.js',
    readmeTerms: [
      'Installation',
      'Authentication',
      'Alephant Virtual Key',
      'https://developers.alephant.io/docs/overview/getting-started/quickstart-guide',
      'Example: Usage Summary',
      'Request Log Detail',
    ],
  },
  {
    directory: 'alephant-analytics-ai',
    packageName: '@alephantai/n8n-nodes-alephant-analytics-ai',
    nodePath: 'dist/nodes/AlephantAnalyticsAi/AlephantAnalyticsAi.node.js',
    readmeTerms: [
      'Installation',
      'Authentication',
      'Alephant Virtual Key',
      'https://developers.alephant.io/docs/overview/getting-started/quickstart-guide',
      'Alephant-Analytics-AI',
      'filled by AI',
    ],
  },
  {
    directory: 'alephant-management',
    packageName: '@alephantai/n8n-nodes-alephant-management',
    nodePath: 'dist/nodes/AlephantManagement/AlephantManagement.node.js',
    readmeTerms: [
      'Installation',
      'Authentication',
      'Alephant Manager',
      'https://developers.alephant.io/docs/overview/getting-started/quickstart-guide',
      'Example: List Models',
      'Personal Access Token',
    ],
  },
];

function readPackageJson(packageDirectory: string) {
  return JSON.parse(
    fs.readFileSync(
      path.join(__dirname, '..', 'packages', packageDirectory, 'package.json'),
      'utf8',
    ),
  ) as {
    name: string;
    n8n: { nodes: string[] };
    peerDependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
}

describe('n8n community scanner compatibility', () => {
  it('does not use restricted timer globals in node source', () => {
    const usageNode = fs.readFileSync(
      path.join(__dirname, '..', 'nodes', 'AlephantUsage', 'AlephantUsage.node.ts'),
      'utf8',
    );

    expect(usageNode).not.toMatch(/\bsetTimeout\b/);
  });

  it.each(verificationPackages)(
    '$packageName registers exactly one regular node',
    ({ directory, packageName, nodePath }) => {
      const packageJson = readPackageJson(directory);

      expect(packageJson.name).toBe(packageName);
      expect(packageJson.n8n.nodes).toEqual([nodePath]);
    },
  );

  it.each(verificationPackages)(
    '$packageName declares n8n-workflow as a runtime-provided dependency',
    ({ directory }) => {
      const packageJson = readPackageJson(directory);

      expect(packageJson.peerDependencies).toHaveProperty('n8n-workflow', '*');
      expect(packageJson.devDependencies).toHaveProperty('n8n-workflow', '*');
    },
  );

  it('uses singular model resource naming in the management node', () => {
    const managementNode = fs.readFileSync(
      path.join(__dirname, '..', 'nodes', 'AlephantManagement', 'AlephantManagement.node.ts'),
      'utf8',
    );

    expect(managementNode).toContain("{ name: 'Model', value: 'model' }");
    expect(managementNode).not.toContain("{ name: 'Models', value: 'models' }");
  });

  it.each(verificationPackages)(
    '$packageName includes installation, authentication, and usage docs',
    ({ directory, readmeTerms }) => {
      const readme = fs.readFileSync(
        path.join(__dirname, '..', 'packages', directory, 'README.md'),
        'utf8',
      );

      expect(readme.split('\n').length).toBeGreaterThan(40);
      for (const term of readmeTerms) {
        expect(readme).toContain(term);
      }
    },
  );

  it('publishes the analytics AI package from its version tag', () => {
    const workflow = fs.readFileSync(
      path.join(__dirname, '..', '.github', 'workflows', 'publish.yml'),
      'utf8',
    );

    expect(workflow).toContain("'alephant-analytics-ai-v*.*.*'");
    expect(workflow).toContain('alephant-analytics-ai-v*.*.*)');
    expect(workflow).toContain('PACKAGE_DIR="packages/alephant-analytics-ai"');
    expect(workflow).toContain('TAG_VERSION="${GITHUB_REF_NAME#alephant-analytics-ai-v}"');
  });

  it('keeps the analytics AI package limited to one node implementation', () => {
    const tsconfig = fs.readFileSync(
      path.join(__dirname, '..', 'packages', 'alephant-analytics-ai', 'tsconfig.json'),
      'utf8',
    );
    const source = fs.readFileSync(
      path.join(
        __dirname,
        '..',
        'nodes',
        'AlephantAnalyticsAi',
        'AlephantAnalyticsAi.node.ts',
      ),
      'utf8',
    );

    expect(tsconfig).toContain('../../nodes/AlephantAnalyticsAi/**/*.ts');
    expect(tsconfig).not.toContain('../../nodes/AlephantUsage/**/*.ts');
    expect(source).not.toContain('../AlephantUsage/AlephantUsage.node');
  });
});
