# Alephant Three Package Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three verification-ready single-node npm packages while preserving the existing all-in-one package.

**Architecture:** Keep source code in the root `nodes`, `credentials`, and `shared` folders. Add package folders under `packages/` with package-specific `package.json`, `README.md`, and `tsconfig.json` files that compile only the node and credentials needed by that package.

**Tech Stack:** TypeScript, n8n community node package metadata, npm package scripts, Jest, ESLint.

---

### Task 1: Add Package-Aware Asset Copying

**Files:**
- Create: `scripts/copy-package-assets.cjs`
- Modify: `scripts/copy-assets.cjs`

- [x] Add a reusable asset copy script that accepts node folder names and target dist directories.
- [x] Keep the root `copy:assets` behavior unchanged.
- [x] Run `npm run build` and confirm root assets still copy.

### Task 2: Add Single-Node Package Metadata

**Files:**
- Create: `packages/alephant-ai/package.json`
- Create: `packages/alephant-ai/README.md`
- Create: `packages/alephant-ai/tsconfig.json`
- Create: `packages/alephant-analytics/package.json`
- Create: `packages/alephant-analytics/README.md`
- Create: `packages/alephant-analytics/tsconfig.json`
- Create: `packages/alephant-management/package.json`
- Create: `packages/alephant-management/README.md`
- Create: `packages/alephant-management/tsconfig.json`

- [x] Add package metadata for `@alephantai/n8n-nodes-alephant-ai` with only `AlephantAi` in `n8n.nodes`.
- [x] Add package metadata for `@alephantai/n8n-nodes-alephant-analytics` with only `AlephantUsage` in `n8n.nodes`.
- [x] Add package metadata for `@alephantai/n8n-nodes-alephant-management` with only `AlephantManagement` in `n8n.nodes`.
- [x] Add `peerDependencies.n8n-workflow` to each package.
- [x] Keep `devDependencies.n8n-workflow` in each package so local TypeScript compilation resolves types.

### Task 3: Fix Management Resource Naming

**Files:**
- Modify: `nodes/AlephantManagement/AlephantManagement.node.ts`
- Modify: `test/management-node.test.ts`

- [x] Change `ManagementResource` from `models` to `model`.
- [x] Change `DEFAULT_OPERATION_BY_RESOURCE` to use `model`.
- [x] Change the resource option from `Models` / `models` to `Model` / `model`.
- [x] Keep the API path as `ENDPOINTS.models`.
- [x] Update tests that reference the resource value.

### Task 4: Add Package Verification Tests

**Files:**
- Modify: `test/community-scan.test.ts`

- [x] Add assertions that each verification package registers exactly one regular node.
- [x] Add assertions that each verification package declares `n8n-workflow` as a peer dependency.
- [x] Add assertions that the management package uses singular `model`.

### Task 5: Verify All Packages

**Commands:**
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm --cache /private/tmp/npm-cache-codex pack --dry-run`
- `npm --cache /private/tmp/npm-cache-codex --prefix packages/alephant-ai run build`
- `npm --cache /private/tmp/npm-cache-codex --prefix packages/alephant-ai pack --dry-run`
- `npm --cache /private/tmp/npm-cache-codex --prefix packages/alephant-analytics run build`
- `npm --cache /private/tmp/npm-cache-codex --prefix packages/alephant-analytics pack --dry-run`
- `npm --cache /private/tmp/npm-cache-codex --prefix packages/alephant-management run build`
- `npm --cache /private/tmp/npm-cache-codex --prefix packages/alephant-management pack --dry-run`
