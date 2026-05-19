# @alephantai/n8n-nodes-alephant-management

n8n community node for Alephant workspace management automation.

## What This Node Does

This package adds the **Alephant Node** management node to n8n. The node uses an Alephant Personal Access Token to automate workspace management tasks such as listing agents, creating agents, listing virtual keys, creating or revoking virtual keys, listing models, and reading workspace usage summaries.

Use this package when a workflow needs to manage Alephant resources or run workspace-level reporting with a PAT.

## Installation

In n8n:

1. Go to **Settings** > **Community nodes**.
2. Select **Install**.
3. Enter `@alephantai/n8n-nodes-alephant-management`.
4. Confirm the community node installation prompt.

For self-hosted n8n, community packages must be enabled:

```bash
N8N_COMMUNITY_PACKAGES_ENABLED=true
```

Restart n8n after changing environment variables.

## Authentication

This node uses the **Alephant Manager** credential.

Required fields:

- **Personal Access Token**: an Alephant PAT for the target workspace.
- **Workspace ID**: the Alephant workspace UUID. The node sends this as `X-Workspace-Id`.

To configure it:

1. Start with the Alephant quickstart guide to register and configure your workspace: `https://developers.alephant.io/docs/overview/getting-started/quickstart-guide`.
2. In Alephant, open the workspace you want n8n to manage.
3. Create or copy a Personal Access Token for workspace management.
4. Copy the workspace ID.
5. In n8n, create a new **Alephant Manager** credential.
6. Paste the PAT into **Personal Access Token**.
7. Paste the workspace UUID into **Workspace ID**.
8. Leave base URL fields empty for production.

Production defaults:

- SaaS Base URL: `https://alephant.io`
- Analytics Base URL: `https://analytics.alephant.io`

Use a read-scoped PAT for list, model, and analytics operations. Use a write-scoped PAT only for create or revoke operations.

If you are setting up Alephant for the first time, complete the quickstart first: register, add a provider API key, and create an Agent. That gives the workspace the routing and cost-control objects that this management node lists or updates.

## Example: List Models

1. Create a new workflow in n8n.
2. Add a **Manual Trigger** node.
3. Add the **Alephant Node** node.
4. Select your **Alephant Manager** credential.
5. Set **Resource** to `Model`.
6. Set **Operation** to `List`.
7. Execute the node.

The node returns models available to the workspace.

## Example: List Virtual Keys

1. Add the **Alephant Node** node.
2. Select your **Alephant Manager** credential.
3. Set **Resource** to `Virtual Key`.
4. Set **Operation** to `List`.
5. Optionally set **Page**, **Page Size**, **Status**, or **Entity Type**.
6. Execute the node.

## Example: Revoke a Virtual Key

1. Add the **Alephant Node** node.
2. Select your **Alephant Manager** credential.
3. Set **Resource** to `Virtual Key`.
4. Set **Operation** to `Revoke`.
5. Enter the **Virtual Key ID**.
6. Execute the node.

Revocation is a write operation. Use a PAT with the required write scope.

## Node

- **Alephant Node**

## Credential

- **Alephant Manager**

## Support

For product and API documentation, visit `https://alephant.io`.
