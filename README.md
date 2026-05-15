# @alephantai/n8n-nodes-alephant

n8n community nodes for Alephant AI Gateway, cost control, analytics, and workspace automation.

## Nodes

### Alephant Cost Control

Alephant Cost Control helps route AI requests through Alephant AI Gateway to track token usage, enforce budget limits, prevent runaway agent spend, and attribute AI costs by key, team, model, provider, or session.

### Alephant AI Analytics

Alephant AI Analytics provides visibility into AI usage, cost, latency, model/provider performance, agent sessions, and request-level traces across your organization.

### Alephant Node

Connect n8n workflows to Alephant AI Gateway to route model requests, manage AI traffic, track usage, apply governance policies, and integrate cost-aware, observable AI operations into your automation flows. Supported operations include:

- Agent list and create
- Virtual key list, create, and revoke
- Model list
- Workspace analytics summary, history, and cost by model

## Credentials

### Alephant Virtual Key

Required fields:

- `Virtual Key`

Optional fields:

- `Gateway Base URL`

Leave `Gateway Base URL` empty for production. The production default is `https://ai.alephant.io/v1`.

### Alephant Manager

Required fields:

- `Personal Access Token`
- `Workspace ID`

Optional fields:

- `SaaS Base URL`
- `Analytics Base URL`

Leave base URL fields empty for production. The production defaults are:

- SaaS: `https://alephant.io`
- Analytics: `https://analytics.alephant.io`

Use a PAT with read scope for list, models, and analytics workflows. Use a PAT with write scope only for create and revoke operations.

## Production Base URL Overrides

Base URL fields are optional and should usually be left empty. Set them only when you need to target a non-production Alephant environment or a dedicated deployment.

Production defaults:

- Gateway: `https://ai.alephant.io/v1`
- SaaS: `https://alephant.io`
- Analytics: `https://analytics.alephant.io`

## Development

```bash
npm install
npm test
npm run lint
npm run build
npm run dev
```
