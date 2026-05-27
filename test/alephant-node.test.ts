import type { IExecuteFunctions } from 'n8n-workflow';
import { Alephant } from '../nodes/Alephant/Alephant.node';

function createBaseContext(
  resource: 'aiGateway' | 'analytics',
  parameterValues: Record<string, unknown>,
  httpRequest = jest.fn(),
): IExecuteFunctions {
  return {
    getInputData: jest.fn().mockReturnValue([{ json: { workspaceId: 'input-workspace-id' } }]),
    getCredentials: jest.fn().mockResolvedValue({
      virtualKey: 'vk_test',
      gatewayBaseUrl: 'https://gateway.example/v1/',
      saasBaseUrl: 'https://saas.example/',
      analyticsBaseUrl: 'https://analytics.example/',
    }),
    getNode: jest.fn().mockReturnValue({
      name: 'Alephant',
      type: 'alephant',
      typeVersion: 1,
      position: [0, 0],
      parameters: {},
    }),
    getNodeParameter: jest.fn((name: string, _itemIndex: number, fallback?: unknown) => {
      const values: Record<string, unknown> = {
        resource,
        ...parameterValues,
      };

      if (name in values) {
        return values[name];
      }

      return fallback;
    }),
    helpers: { httpRequest },
  } as unknown as IExecuteFunctions;
}

describe('Alephant unified node', () => {
  it('offers an AI dynamic analytics parameter mode backed by fromAI expressions', () => {
    const node = new Alephant();
    const parameterMode = node.description.properties.find(
      (property) =>
        property.name === 'parameterMode' &&
        property.displayOptions?.show?.resource?.includes('analytics'),
    );
    const aiOperation = node.description.properties.find(
      (property) =>
        property.name === 'aiOperation' &&
        property.displayOptions?.show?.resource?.includes('analytics'),
    );
    const aiPeriod = node.description.properties.find(
      (property) =>
        property.name === 'aiPeriod' &&
        property.displayOptions?.show?.resource?.includes('analytics'),
    );

    expect(parameterMode).toMatchObject({
      options: expect.arrayContaining([
        { name: 'Fixed', value: 'fixed' },
        { name: 'AI Dynamic', value: 'aiDynamic' },
      ]),
    });
    expect(aiOperation).toMatchObject({
      default: expect.stringContaining('$fromAI("alephant_analytics_operation"'),
    });
    expect(aiPeriod).toMatchObject({
      default: expect.stringContaining('$fromAI("alephant_analytics_period"'),
    });
    expect(node.description.subtitle).toContain('AI Dynamic');
  });

  it('does not expose fake filled by AI options for analytics tool parameters', () => {
    const node = new Alephant();
    const operation = node.description.properties.find(
      (property) =>
        property.name === 'operation' &&
        property.displayOptions?.show?.resource?.includes('analytics'),
    );
    const period = node.description.properties.find(
      (property) =>
        property.name === 'period' &&
        property.displayOptions?.show?.resource?.includes('analytics'),
    );

    expect(operation?.options).not.toEqual(
      expect.arrayContaining([{ name: 'filled by AI', value: 'usageSummary' }]),
    );
    expect(period?.options).not.toEqual(
      expect.arrayContaining([{ name: 'filled by AI', value: '7d' }]),
    );
  });

  it('routes AI Gateway resource executions to chat completions', async () => {
    const httpRequest = jest.fn().mockResolvedValue({
      model: 'gpt-4o-mini',
      choices: [{ message: { content: 'Hello' }, finish_reason: 'stop' }],
      usage: { total_tokens: 3 },
    });
    const ctx = createBaseContext(
      'aiGateway',
      {
        operation: 'chatCompletion',
        inputMode: 'prompt',
        model: 'gpt-4o-mini',
        prompt: 'Hi',
        responseFormat: 'text',
        metadata: '{}',
        additionalOptions: '{}',
      },
      httpRequest,
    );

    const result = await new Alephant().execute.call(ctx);

    expect(result[0][0].json).toMatchObject({
      text: 'Hello',
      model: 'gpt-4o-mini',
      workspaceId: 'input-workspace-id',
    });
    expect(httpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: 'https://gateway.example/v1/chat/completions',
      }),
    );
  });

  it('routes Analytics resource executions to usage requests', async () => {
    const httpRequest = jest.fn().mockResolvedValue({ total_cost: 12.34 });
    const ctx = createBaseContext(
      'analytics',
      {
        operation: 'usageSummary',
        period: '7d',
        limit: 50,
        offset: 0,
      },
      httpRequest,
    );

    await expect(new Alephant().execute.call(ctx)).resolves.toEqual([
      [{ json: { total_cost: 12.34 }, pairedItem: { item: 0 } }],
    ]);
    expect(httpRequest).toHaveBeenCalledWith({
      method: 'GET',
      url: 'https://saas.example/api/v1/cockpit/usage-summary',
      json: true,
      headers: {
        Authorization: 'Bearer vk_test',
        'Content-Type': 'application/json',
      },
      qs: { period: '7d' },
      body: undefined,
    });
  });

  it('routes AI dynamic Analytics parameters from fromAI expression results', async () => {
    const httpRequest = jest.fn().mockResolvedValue({ by_model: true });
    const ctx = createBaseContext(
      'analytics',
      {
        parameterMode: 'aiDynamic',
        aiOperation: 'costByModel',
        aiPeriod: '30d',
        limit: 50,
        offset: 0,
      },
      httpRequest,
    );

    await expect(new Alephant().execute.call(ctx)).resolves.toEqual([
      [{ json: { by_model: true }, pairedItem: { item: 0 } }],
    ]);
    expect(httpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: 'https://saas.example/api/v1/cockpit/cost-by-model',
        qs: { period: '30d' },
      }),
    );
  });
});
