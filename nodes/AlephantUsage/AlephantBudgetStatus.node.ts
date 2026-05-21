import type { IExecuteFunctions, INodeExecutionData, INodeType } from 'n8n-workflow';
import {
  createUsageToolDescription,
  executeUsageTool,
  PERIOD_PROPERTY,
} from './usageToolHelpers';

export class AlephantBudgetStatus implements INodeType {
  description = createUsageToolDescription({
    displayName: 'Alephant Budget Status',
    name: 'alephantBudgetStatus',
    description:
      'Use this AI tool to retrieve Alephant budget status for a user-requested time period.',
    properties: [PERIOD_PROPERTY],
  });

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    return executeUsageTool(this, 'budgetStatus', (ctx, itemIndex) => ({
      period: ctx.getNodeParameter('period', itemIndex, '7d') as string,
    }));
  }
}
