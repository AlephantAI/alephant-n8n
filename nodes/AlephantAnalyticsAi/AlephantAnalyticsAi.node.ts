import { DynamicStructuredTool } from '@langchain/core/tools';
import type {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  ISupplyDataFunctions,
  SupplyData,
} from 'n8n-workflow';
import {
  NodeConnectionTypes,
  NodeOperationError,
  nodeNameToToolName,
  tryToParseAlphanumericString,
} from 'n8n-workflow';
import { z } from 'zod';
import { executeUsageNode, runUsageRequest } from '../../shared/usage';
import type { UsageOperation } from '../../shared/usage';

function toSafeToolName(nodeName: string): string {
  const normalized = nodeNameToToolName(nodeName)
    .replace(/[^A-Za-z0-9_]/g, '_')
    .replace(/^[^A-Za-z_]+/, '');

  return normalized || 'Alephant_Analytics_AI';
}

const analyticsToolSchema = z.object({
  operation: z
    .enum([
      'scope',
      'budgetStatus',
      'usageSummary',
      'dailyCosts',
      'costByModel',
      'recentRequests',
      'requestLogDetail',
    ])
    .describe('Alephant analytics operation to run.'),
  period: z
    .enum(['24h', '7d', '30d', '90d'])
    .optional()
    .describe('Time period for budget, usage, daily cost, and cost-by-model operations.'),
  limit: z.number().int().positive().optional().describe('Maximum recent requests to return.'),
  offset: z.number().int().min(0).optional().describe('Recent requests offset.'),
  requestLogId: z.string().optional().describe('Request log ID for requestLogDetail.'),
  workspaceId: z
    .string()
    .optional()
    .describe('Workspace ID for request log detail lookups when credentials do not include one.'),
});

export class AlephantAnalyticsAi implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Alephant-Analytics-AI',
    name: 'alephantAnalyticsAi',
    icon: {
      light: 'file:alephant.light.svg',
      dark: 'file:alephant.dark.svg',
    },
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"]}}',
    description:
      'Alephant AI Analytics provides visibility into AI usage, cost, latency, model/provider performance, agent sessions, and request-level traces across your organization.',
    defaults: { name: 'Alephant-Analytics-AI' },
    usableAsTool: true,
    inputs: [],
    outputs: [NodeConnectionTypes.AiTool],
    credentials: [{ name: 'alephantVirtualKeyApi', required: true }],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        default: 'usageSummary',
        description:
          'Choose which Alephant analytics operation to run. In AI tool mode, let the model select this from the user prompt.',
        options: [
          { name: 'filled by AI', value: 'usageSummary' },
          { name: 'Budget Status', value: 'budgetStatus' },
          { name: 'Cost by Model', value: 'costByModel' },
          { name: 'Daily Costs', value: 'dailyCosts' },
          { name: 'Recent Requests', value: 'recentRequests' },
          { name: 'Request Log Detail', value: 'requestLogDetail' },
          { name: 'Scope', value: 'scope' },
          { name: 'Usage Summary', value: 'usageSummary' },
        ],
      },
      {
        displayName: 'Period',
        name: 'period',
        type: 'options',
        default: '7d',
        options: [
          { name: 'filled by AI', value: '7d' },
          { name: '24 Hours', value: '24h' },
          { name: '7 Days', value: '7d' },
          { name: '30 Days', value: '30d' },
          { name: '90 Days', value: '90d' },
        ],
        displayOptions: {
          show: {
            operation: ['budgetStatus', 'usageSummary', 'dailyCosts', 'costByModel'],
          },
        },
      },
      {
        displayName: 'Limit',
        name: 'limit',
        type: 'number',
        default: 50,
        typeOptions: { minValue: 1 },
        displayOptions: { show: { operation: ['recentRequests'] } },
      },
      {
        displayName: 'Offset',
        name: 'offset',
        type: 'number',
        default: 0,
        typeOptions: { minValue: 0 },
        displayOptions: { show: { operation: ['recentRequests'] } },
      },
      {
        displayName: 'Request Log ID',
        name: 'requestLogId',
        type: 'string',
        default: '={{$json.requestLogId || $json.requestId || ""}}',
        required: true,
        displayOptions: { show: { operation: ['requestLogDetail'] } },
      },
      {
        displayName: 'Workspace ID',
        name: 'workspaceId',
        type: 'string',
        default: '={{$json.workspaceId || $json.workspace_id || $json.xWorkspaceId || ""}}',
        description:
          'Workspace ID for analytics request log lookups. Overrides the Workspace ID in credentials when set.',
        displayOptions: { show: { operation: ['requestLogDetail'] } },
      },
      {
        displayName: 'Request Log Max Attempts',
        name: 'requestLogMaxAttempts',
        type: 'number',
        default: 6,
        typeOptions: { minValue: 1 },
        description: 'Maximum number of consecutive request log lookup attempts',
        displayOptions: { show: { operation: ['requestLogDetail'] } },
      },
    ],
  };

  async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
    const name = toSafeToolName(this.getNode().name);
    try {
      tryToParseAlphanumericString(name);
    } catch {
      throw new NodeOperationError(this.getNode(), 'The name of this tool is not a valid alphanumeric string', {
        itemIndex,
        description:
          "Only alphanumeric characters and underscores are allowed in the tool's name, and the name cannot start with a number",
      });
    }

    return {
      response: new DynamicStructuredTool({
        name,
        description:
          'Query Alephant AI analytics for usage, cost, latency, model/provider performance, budget status, recent requests, and request log detail.',
        schema: analyticsToolSchema,
        func: async (input) => {
          const data = await runUsageRequest(
            this,
            {
              operation: input.operation as UsageOperation,
              period: input.period ?? '7d',
              limit: input.limit ?? 50,
              offset: input.offset ?? 0,
              requestLogId: input.requestLogId ?? '',
              workspaceId: input.workspaceId ?? '',
            },
            itemIndex,
          );

          return JSON.stringify(data);
        },
      }),
    };
  }

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    return executeUsageNode.call(this);
  }
}
