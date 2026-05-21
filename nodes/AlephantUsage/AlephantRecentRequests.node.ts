import type { IExecuteFunctions, INodeExecutionData, INodeType } from 'n8n-workflow';
import {
  createUsageToolDescription,
  executeUsageTool,
  LIMIT_PROPERTY,
  OFFSET_PROPERTY,
} from './usageToolHelpers';

export class AlephantRecentRequests implements INodeType {
  description = createUsageToolDescription({
    displayName: 'Alephant Recent Requests',
    name: 'alephantRecentRequests',
    description:
      'Use this AI tool to retrieve recent Alephant AI request records with pagination.',
    properties: [LIMIT_PROPERTY, OFFSET_PROPERTY],
  });

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    return executeUsageTool(this, 'recentRequests', (ctx, itemIndex) => ({
      limit: ctx.getNodeParameter('limit', itemIndex, 50) as number,
      offset: ctx.getNodeParameter('offset', itemIndex, 0) as number,
    }));
  }
}
