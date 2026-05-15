# @alephantai/n8n-nodes-alephant-ai

n8n community node for Alephant AI Gateway cost control and observable model requests.

## What This Node Does

This package adds the **Alephant Cost Control** node to n8n. The node sends OpenAI-compatible chat completion requests through Alephant AI Gateway so teams can route model traffic through a virtual key, track usage, and attribute cost by workspace, key, model, provider, or workflow run.

Use this package when you want an n8n workflow to call a model through Alephant instead of calling the model provider directly.

## Installation

In n8n:

1. Go to **Settings** > **Community nodes**.
2. Select **Install**.
3. Enter `@alephantai/n8n-nodes-alephant-ai`.
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
4. Create an Agent for the n8n workflow or application that will send AI traffic.
5. Copy the Virtual Key generated for that Agent.
6. In n8n, create a new **Alephant Virtual Key** credential.
7. Paste the key into the **Virtual Key** field.
8. Leave **Gateway Base URL** empty unless you use a staging, local, or dedicated Alephant deployment.

Production defaults:

- Gateway Base URL: `https://ai.alephant.io/v1`
- SaaS Base URL: `https://alephant.io`
- Analytics Base URL: `https://analytics.alephant.io`

The credential test calls the Alephant Gateway models endpoint with your virtual key. A successful test means n8n can authenticate to the gateway.

The Alephant quickstart also shows the equivalent OpenAI-compatible setup: use `https://ai.alephant.io/v1` as the base URL and send the Virtual Key as a Bearer token. This n8n node handles that request setup for you after the credential is saved.

## Worked Example: Chat Completion

This example sends a prompt to Alephant AI Gateway and returns the model response plus request metadata.

1. Create a new workflow in n8n.
2. Add a **Manual Trigger** node.
3. Add the **Alephant Cost Control** node.
4. Select your **Alephant Virtual Key** credential.
5. Set **Operation** to `Chat Completion`.
6. Set **Model** to a model available in your Alephant workspace, for example `gpt-4o-mini`.
7. Set **Input Mode** to `Prompt`.
8. Set **Prompt** to:

```text
Write a one sentence summary of why AI cost attribution matters.
```

9. Execute the node.

Example output shape:

```json
{
  "text": "AI cost attribution matters because it shows which teams, workflows, and models drive spend.",
  "model": "gpt-4o-mini",
  "usage": {
    "prompt_tokens": 18,
    "completion_tokens": 17,
    "total_tokens": 35
  },
  "requestId": "req_...",
  "requestLogId": "..."
}
```

You can pass structured OpenAI-compatible message arrays by changing **Input Mode** to `Messages JSON` and entering:

```json
[
  {
    "role": "system",
    "content": "You write concise workflow summaries."
  },
  {
    "role": "user",
    "content": "Summarize the latest workflow item."
  }
]
```

## Node

- **Alephant Cost Control**

## Credential

- **Alephant Virtual Key**

## Support

For product and API documentation, visit `https://alephant.ai`.
