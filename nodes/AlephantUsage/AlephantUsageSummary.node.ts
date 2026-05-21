import type { IExecuteFunctions, INodeExecutionData, INodeType } from 'n8n-workflow';
import {
  createUsageToolDescription,
  executeUsageTool,
  PERIOD_PROPERTY,
} from './usageToolHelpers';

export class AlephantUsageSummary implements INodeType {
  description = createUsageToolDescription({
    displayName: 'Alephant Usage Summary',
    name: 'alephantUsageSummary',
    description:
      'Use this AI tool to summarize Alephant AI usage and cost for a user-requested time period.',
    properties: [PERIOD_PROPERTY],
  });

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    return executeUsageTool(this, 'usageSummary', (ctx, itemIndex) => ({
      period: ctx.getNodeParameter('period', itemIndex, '7d') as string,
    }));
  }
}
