# @alephantai/n8n-nodes-alephant-analytics-ai

n8n community node package for using Alephant analytics as an AI Agent tool.

This package adds the **Alephant-Analytics-AI** node to n8n. It reuses the Alephant analytics operations for usage summaries, budget status, costs, recent requests, and request log lookups, but exposes them as an AI tool connection for agent workflows.

## Installation

Install this package from n8n Community Nodes:

1. Open n8n.
2. Go to **Settings**.
3. Open **Community Nodes**.
4. Choose **Install**.
5. Enter `@alephantai/n8n-nodes-alephant-analytics-ai`.
6. Confirm the installation.

For self-hosted n8n, restart the instance if your deployment requires it after installing community nodes.

## Authentication

The node uses **Alephant Virtual Key** credentials.

Create or copy a Virtual Key from Alephant, then add a credential in n8n with:

- Virtual Key
- Optional SaaS Base URL
- Optional Analytics Base URL
- Optional Workspace ID

The default production URLs are:

- SaaS Base URL: `https://alephant.io`
- Analytics Base URL: `https://analytics.alephant.io`

The Alephant quickstart explains the same Virtual Key concept:

https://developers.alephant.io/docs/overview/getting-started/quickstart-guide

## AI Agent Usage

Add **Alephant-Analytics-AI** to an n8n AI Agent workflow and connect it to the agent tool input.

The node exposes `operation` and `period` options with a `filled by AI` choice so the agent can select the analytics operation and time window from the user prompt.

Recommended default agent prompts include clear analytics intent, such as:

- "Summarize AI usage for the last 7 days."
- "Check whether the workspace is close to budget."
- "Show recent AI gateway requests."
- "Find details for this request log ID."

## Operations

The AI tool can run the same analytics operations as the standard Alephant analytics node:

- Scope
- Budget Status
- Usage Summary
- Daily Costs
- Cost by Model
- Recent Requests
- Request Log Detail

## Request Log Detail

For request log lookups, provide a request log ID in the workflow item or let the AI Agent fill the parameter.

The node resolves Workspace ID from:

- Node parameter
- Incoming item JSON
- Credential Workspace ID
- Alephant Scope response

## Package Notes

This package is intentionally separate from `@alephantai/n8n-nodes-alephant-analytics`.

Use the standard analytics package for regular n8n workflow nodes.

Use this package when you need the analytics capability as an AI Agent tool.
