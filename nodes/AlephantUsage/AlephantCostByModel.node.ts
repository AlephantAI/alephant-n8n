import type { IExecuteFunctions, INodeExecutionData, INodeType } from 'n8n-workflow';
import {
  createUsageToolDescription,
  executeUsageTool,
  PERIOD_PROPERTY,
} from './usageToolHelpers';

export class AlephantCostByModel implements INodeType {
  description = createUsageToolDescription({
    displayName: 'Alephant Cost by Model',
    name: 'alephantCostByModel',
    description:
      'Use this AI tool to break down Alephant AI cost by model for a user-requested time period.',
    properties: [PERIOD_PROPERTY],
  });

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    return executeUsageTool(this, 'costByModel', (ctx, itemIndex) => ({
      period: ctx.getNodeParameter('period', itemIndex, '7d') as string,
    }));
  }
}
