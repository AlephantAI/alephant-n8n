# @alephantai/n8n-nodes-alephant-analytics

n8n community node for Alephant AI usage analytics and request log lookups.

## What This Node Does

This package adds the **Alephant AI Analytics** node to n8n. The node reads usage, cost, budget, and request-log data from Alephant so workflows can monitor AI spend and inspect Gateway request activity.

Use this package when you want n8n to report AI usage, fetch recent requests, or look up details for a request generated through Alephant AI Gateway.

## Installation

In n8n:

1. Go to **Settings** > **Community nodes**.
2. Select **Install**.
3. Enter `@alephantai/n8n-nodes-alephant-analytics`.
4. Confirm the community node installation prompt.

For self-hosted n8n, community packages must be enabled:

```bash
N8N_COMMUNITY_PACKAGES_ENABLED=true
```

Restart n8n after changing environment variables.

## Authentication

This node uses the **Alephant Virtual Key** credential.

To configure it:

1. Follow the Alephant quickstart guide: `https://developers.alephant.io/docs/overview/getting-started/quickstart-guide`.
2. In the Alephant dashboard, register or sign in to your workspace.
3. Add an upstream provider API key as a Master Key.
4. Create an Agent for the workflow or application whose Gateway usage you want to inspect.
5. Copy the Virtual Key generated for that Agent.
6. In n8n, create a new **Alephant Virtual Key** credential.
7. Paste the key into the **Virtual Key** field.
8. Optionally set **Workspace ID** if you plan to use request log detail lookups.
9. Leave base URL fields empty for production.

Production defaults:

- SaaS Base URL: `https://alephant.io`
- Analytics Base URL: `https://analytics.alephant.io`
- Gateway Base URL: `https://ai.alephant.io/v1`

The Alephant quickstart shows the same Virtual Key being used as an OpenAI-compatible Bearer token against Alephant AI Gateway. This analytics node uses that credential to query Alephant usage and request-log APIs for the associated workspace.

## Example: Usage Summary

1. Create a new workflow in n8n.
2. Add a **Manual Trigger** node.
3. Add the **Alephant AI Analytics** node.
4. Select your **Alephant Virtual Key** credential.
5. Set **Operation** to `Usage Summary`.
6. Set **Period** to `7 Days`.
7. Execute the node.

The node returns workspace usage metrics for the selected period, such as total cost, token usage, and request counts when those fields are available from your Alephant workspace.

## Example: Request Log Detail

1. Add an **Alephant AI Analytics** node after a workflow step that has a `requestLogId` or `requestId`.
2. Set **Operation** to `Request Log Detail`.
3. Leave **Request Log ID** as the default expression if the incoming item contains `requestLogId` or `requestId`.
4. Set **Workspace ID** if it is not present in the incoming data or credential.
5. Execute the node.

The node polls the request-log endpoint for a short period to account for log ingestion delay.

## Node

- **Alephant AI Analytics**

## Credential

- **Alephant Virtual Key**

## Support

For product and API documentation, visit `https://alephant.ai`.
