import type { IExecuteFunctions, INodeExecutionData, INodeType } from 'n8n-workflow';
import { createUsageToolDescription, executeUsageTool } from './usageToolHelpers';

export class AlephantScope implements INodeType {
  description = createUsageToolDescription({
    displayName: 'Alephant Scope',
    name: 'alephantScope',
    description:
      'Use this AI tool to retrieve the Alephant workspace and credential scope visible to this virtual key.',
  });

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    return executeUsageTool(this, 'scope');
  }
}
