# Alephant Three Package Split Design

## Goal

Keep `@alephantai/n8n-nodes-alephant` as the existing all-in-one package, and add three verification-ready npm packages where each package registers exactly one regular n8n node.

## Package Strategy

The root package remains the bundle package and keeps registering:

- `AlephantAi`
- `AlephantUsage`
- `AlephantManagement`

The new packages live under `packages/`:

- `packages/alephant-ai` publishes `@alephantai/n8n-nodes-alephant-ai`
- `packages/alephant-analytics` publishes `@alephantai/n8n-nodes-alephant-analytics`
- `packages/alephant-management` publishes `@alephantai/n8n-nodes-alephant-management`

Each package has one `package.json` with exactly one path in `n8n.nodes`. Credentials are included only when that node needs them.

## Source Layout

The packages reuse root source files instead of duplicating node implementation code. Each package has a `tsconfig.json` that compiles only:

- its single node file
- the shared helpers used by that node
- the credentials required by that node
- the root `index.ts`

The build output for each package is written to `packages/<name>/dist`, preserving the existing `dist/nodes/...`, `dist/shared/...`, and `dist/credentials/...` paths expected by n8n.

## Review Fixes

The new single-node packages declare `n8n-workflow` in `peerDependencies` and keep it in `devDependencies` only for local compilation. The root bundle package can keep its current package shape because it is no longer the package submitted for verification.

The management package changes the resource option from plural `Models` / `models` to singular `Model` / `model` to satisfy the UX guideline. The request behavior remains `GET /api/v1/models`.

## Verification

Each package must support:

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm pack --dry-run`

The root package must continue to pass the same checks.
