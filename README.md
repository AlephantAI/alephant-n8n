# @alephantai/n8n-nodes-alephant

n8n community node for Alephant AI Gateway, cost control, and analytics.

## Node

### Alephant

Alephant exposes Alephant AI Gateway and analytics through one n8n action node, following n8n's resource and operation pattern.

## Resources

### AI Gateway

Route AI requests through Alephant AI Gateway to track token usage, enforce budget limits, prevent runaway agent spend, and attribute AI costs by key, team, model, provider, or session.

Supported operation:

- Chat Completion

### Analytics

Query Alephant AI Analytics for AI usage, cost, latency, model/provider performance, agent sessions, and request-level traces across your organization.

Supported operations:

- Scope
- Budget Status
- Usage Summary
- Daily Costs
- Cost by Model
- Recent Requests
- Request Log Detail

## AI Agent Tool Usage

The Alephant node is marked as usable as an n8n AI Agent tool. In an AI Agent workflow, use the generated `Alephant Tool` and describe when the agent should call Alephant.

Example tool description:

```text
Use Alephant Analytics to answer questions about AI usage, cost, budget status, recent requests, model cost breakdowns, daily cost trends, and request log details. Choose the Analytics resource and the matching operation and period from the user's request.
```

Keep `Resource`, `Operation`, and `Period` as normal n8n parameters. The separate Alephant Analytics AI node pattern is not used by this package because n8n Cloud verification expects one Alephant action node with API surfaces exposed as resources.

For dynamic AI-filled analytics parameters, set the Analytics resource `Parameter Mode` to `AI Dynamic`. The node will expose AI-filled fields backed by `$fromAI()` expressions:

- `AI Operation`: returns one of `scope`, `budgetStatus`, `usageSummary`, `dailyCosts`, `costByModel`, `recentRequests`, or `requestLogDetail`
- `AI Period`: returns one of `24h`, `7d`, `30d`, or `90d`

In this mode, the Tool Description tells the agent when to use Alephant, while the `$fromAI()` fields provide the actual operation and period values at tool-call time.

## Credentials

### Alephant Virtual Key

Required fields:

- `Virtual Key`

Optional fields:

- `Gateway Base URL`

Leave `Gateway Base URL` empty for production. The production default is `https://ai.alephant.io/v1`.

The same credential is used by both the AI Gateway and Analytics resources.

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
