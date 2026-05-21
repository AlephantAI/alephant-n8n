import type { IExecuteFunctions, INodeExecutionData, INodeType } from 'n8n-workflow';
import {
  createUsageToolDescription,
  executeUsageTool,
  PERIOD_PROPERTY,
} from './usageToolHelpers';

export class AlephantDailyCosts implements INodeType {
  description = createUsageToolDescription({
    displayName: 'Alephant Daily Costs',
    name: 'alephantDailyCosts',
    description:
      'Use this AI tool to retrieve Alephant daily AI costs for a user-requested time period.',
    properties: [PERIOD_PROPERTY],
  });

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    return executeUsageTool(this, 'dailyCosts', (ctx, itemIndex) => ({
      period: ctx.getNodeParameter('period', itemIndex, '7d') as string,
    }));
  }
}
