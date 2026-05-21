import type { IExecuteFunctions, INodeExecutionData, INodeType } from 'n8n-workflow';
import {
  createUsageToolDescription,
  executeUsageTool,
  REQUEST_LOG_ID_PROPERTY,
  REQUEST_LOG_MAX_ATTEMPTS_PROPERTY,
  WORKSPACE_ID_PROPERTY,
} from './usageToolHelpers';

export class AlephantRequestLogDetail implements INodeType {
  description = createUsageToolDescription({
    displayName: 'Alephant Request Log Detail',
    name: 'alephantRequestLogDetail',
    description:
      'Use this AI tool to retrieve detailed Alephant analytics data for one request log ID.',
    properties: [
      REQUEST_LOG_ID_PROPERTY,
      WORKSPACE_ID_PROPERTY,
      REQUEST_LOG_MAX_ATTEMPTS_PROPERTY,
    ],
  });

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    return executeUsageTool(
      this,
      'requestLogDetail',
      (ctx, itemIndex) => ({
        requestLogId: ctx.getNodeParameter('requestLogId', itemIndex, '') as string,
      }),
      (ctx, itemIndex) =>
        ctx.getNodeParameter('requestLogMaxAttempts', itemIndex, 6) as number,
    );
  }
}
