# Publish the Alephant n8n community node

This package is published as `@alephantai/n8n-nodes-alephant`.

Use GitHub Actions and npm Trusted Publishing for releases. n8n Cloud community node verification requires npm provenance, and Trusted Publishing generates the provenance statement from GitHub Actions without storing an npm token in GitHub.

## One-time npm setup

Open the package settings on npm:

```text
https://www.npmjs.com/package/@alephantai/n8n-nodes-alephant
```

In `Settings > Trusted Publisher`, configure:

```text
Publisher: GitHub Actions
Organization or user: gengbingbing
Repository: n8n-nodes
Workflow filename: publish.yml
Environment name: leave blank
```

Do not add `NPM_TOKEN` to GitHub Actions secrets when using Trusted Publishing.

## Workflow requirements

The release workflow is `.github/workflows/publish.yml`.

It runs on version tags:

```text
0.1.4
v0.1.4
```

The workflow must have:

```yaml
permissions:
  contents: read
  id-token: write
```

The workflow uses Node 24 and updates npm to the latest version because npm Trusted Publishing requires a recent npm CLI. Older npm versions can sign a provenance statement but still fail to authenticate the publish request.

The publish step should be:

```bash
npm publish --access public
```

Do not add `--provenance` manually when using Trusted Publishing.

## Release checklist

Before publishing:

```bash
npm run lint
npm run test
npm run build
npm --cache /private/tmp/npm-cache-codex pack --dry-run
```

Confirm `package.json` has the correct repository:

```json
"repository": {
  "type": "git",
  "url": "git+https://github.com/gengbingbing/n8n-nodes.git"
}
```

Create and push a new version tag:

```bash
npm version patch
git push
git push --tags
```

GitHub Actions will publish the package when the tag is pushed.

## Verify the release

In GitHub Actions, the `Publish` workflow should show:

```text
npm publish
```

After it succeeds, check npm:

```bash
npm view @alephantai/n8n-nodes-alephant version
```

Then install the package in self-hosted n8n from:

```text
Settings > Community Nodes > Install
```

Use:

```text
@alephantai/n8n-nodes-alephant
```

For n8n Cloud listing, submit the package through the n8n Creator Portal after the npm release has provenance from GitHub Actions.

## Troubleshooting

### GitHub Actions shows no runs

The workflow only runs on version tags. A normal branch push will not start a release.

Push a tag:

```bash
git push --tags
```

### `isolated-vm` fails during `npm ci`

`isolated-vm@6.1.2` is installed through:

```text
n8n-workflow -> @n8n/expression-runtime -> isolated-vm
```

It requires Node 22 or newer. Use Node 24 in GitHub Actions.

### npm returns `404 Not Found - PUT`

This usually means npm did not authenticate the publisher for the scoped package.

Check:

1. npm Trusted Publisher is saved for `gengbingbing/n8n-nodes` and `publish.yml`.
2. GitHub Actions secrets do not contain `NPM_TOKEN`.
3. The workflow has `id-token: write`.
4. The workflow updates npm to a recent version before publishing.
5. The package is still named `@alephantai/n8n-nodes-alephant`.

If all of those are correct, publish a new patch version. Do not retry the same version after a successful npm publish.

### npm normalizes `repository.url`

Use the `git+https` URL format in `package.json`:

```text
git+https://github.com/gengbingbing/n8n-nodes.git
```
