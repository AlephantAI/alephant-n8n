import type {
  IExecuteFunctions,
  INodeExecutionData,
  INodeProperties,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { aiGatewayProperties, executeChatCompletionNode } from '../../shared/ai';
import { executeUsageNode } from '../../shared/usage';

type AlephantResource = 'aiGateway' | 'analytics';

function withResourceDisplayOptions(
  property: INodeProperties,
  resource: AlephantResource,
): INodeProperties {
  const displayOptions = property.displayOptions ?? {};

  return {
    ...property,
    displayOptions: {
      ...displayOptions,
      show: {
        ...(displayOptions.show ?? {}),
        resource: [resource],
      },
    },
  };
}

const aiGatewayNodeProperties = aiGatewayProperties.map((property) =>
  withResourceDisplayOptions(property, 'aiGateway'),
);

const analyticsProperties = [
  {
    displayName: 'Parameter Mode',
    name: 'parameterMode',
    type: 'options',
    default: 'fixed',
    description:
      'Choose whether analytics parameters are fixed in the node or filled dynamically by an AI Agent using fromAI expressions.',
    options: [
      { name: 'Fixed', value: 'fixed' },
      { name: 'AI Dynamic', value: 'aiDynamic' },
    ],
  },
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    default: 'usageSummary',
    description:
      'Choose which Alephant analytics operation to run. In AI tool mode, let the model select this from the user prompt.',
    options: [
      { name: 'Budget Status', value: 'budgetStatus' },
      { name: 'Cost by Model', value: 'costByModel' },
      { name: 'Daily Costs', value: 'dailyCosts' },
      { name: 'Recent Requests', value: 'recentRequests' },
      { name: 'Request Log Detail', value: 'requestLogDetail' },
      { name: 'Scope', value: 'scope' },
      { name: 'Usage Summary', value: 'usageSummary' },
    ],
    displayOptions: { show: { parameterMode: ['fixed'] } },
  },
  {
    displayName: 'AI Operation',
    name: 'aiOperation',
    type: 'string',
    default:
      '={{ $fromAI("alephant_analytics_operation", "Return exactly one Alephant analytics operation key: scope, budgetStatus, usageSummary, dailyCosts, costByModel, recentRequests, or requestLogDetail.", "string", "usageSummary") }}',
    required: true,
    description:
      'AI-filled analytics operation key. Valid values: scope, budgetStatus, usageSummary, dailyCosts, costByModel, recentRequests, requestLogDetail.',
    displayOptions: { show: { parameterMode: ['aiDynamic'] } },
  },
  {
    displayName: 'Period',
    name: 'period',
    type: 'options',
    default: '7d',
    options: [
      { name: '24 Hours', value: '24h' },
      { name: '7 Days', value: '7d' },
      { name: '30 Days', value: '30d' },
      { name: '90 Days', value: '90d' },
    ],
    displayOptions: {
      show: {
        parameterMode: ['fixed'],
        operation: ['budgetStatus', 'usageSummary', 'dailyCosts', 'costByModel'],
      },
    },
  },
  {
    displayName: 'AI Period',
    name: 'aiPeriod',
    type: 'string',
    default:
      '={{ $fromAI("alephant_analytics_period", "Return exactly one Alephant analytics period key when the operation needs a period: 24h, 7d, 30d, or 90d.", "string", "7d") }}',
    description: 'AI-filled analytics period key. Valid values: 24h, 7d, 30d, 90d.',
    displayOptions: { show: { parameterMode: ['aiDynamic'] } },
  },
  {
    displayName: 'Limit',
    name: 'limit',
    type: 'number',
    default: 50,
    typeOptions: { minValue: 1 },
    displayOptions: { show: { parameterMode: ['fixed'], operation: ['recentRequests'] } },
  },
  {
    displayName: 'Offset',
    name: 'offset',
    type: 'number',
    default: 0,
    typeOptions: { minValue: 0 },
    displayOptions: { show: { parameterMode: ['fixed'], operation: ['recentRequests'] } },
  },
  {
    displayName: 'Request Log ID',
    name: 'requestLogId',
    type: 'string',
    default: '={{$json.requestLogId || $json.requestId || ""}}',
    required: true,
    displayOptions: { show: { parameterMode: ['fixed'], operation: ['requestLogDetail'] } },
  },
  {
    displayName: 'Workspace ID',
    name: 'workspaceId',
    type: 'string',
    default: '={{$json.workspaceId || $json.workspace_id || $json.xWorkspaceId || ""}}',
    description:
      'Workspace ID for analytics request log lookups. Overrides the Workspace ID in credentials when set.',
    displayOptions: { show: { parameterMode: ['fixed'], operation: ['requestLogDetail'] } },
  },
  {
    displayName: 'Request Log Max Attempts',
    name: 'requestLogMaxAttempts',
    type: 'number',
    default: 6,
    typeOptions: { minValue: 1 },
    description: 'Maximum number of consecutive request log lookup attempts',
    displayOptions: { show: { parameterMode: ['fixed'], operation: ['requestLogDetail'] } },
  },
].map((property) => withResourceDisplayOptions(property as INodeProperties, 'analytics'));

export class Alephant implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Alephant',
    name: 'alephant',
    icon: {
      light: 'file:alephant.light.svg',
      dark: 'file:alephant.dark.svg',
    },
    iconUrl: {
      light: 'https://raw.githubusercontent.com/AlephantAI/alephant-n8n/main/nodes/Alephant/alephant.light.svg',
      dark: 'https://raw.githubusercontent.com/AlephantAI/alephant-n8n/main/nodes/Alephant/alephant.dark.svg',
    },
    group: ['transform'],
    version: 1,
    subtitle:
      '={{$parameter["resource"] + ": " + ($parameter["parameterMode"] === "aiDynamic" ? "AI Dynamic" : $parameter["operation"])}}',
    description:
      'Route AI requests through Alephant AI Gateway and query Alephant analytics from one action node.',
    defaults: { name: 'Alephant' },
    usableAsTool: true,
    inputs: [NodeConnectionTypes.Main],
    outputs: [NodeConnectionTypes.Main],
    credentials: [{ name: 'alephantVirtualKeyApi', required: true }],
    properties: [
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        default: 'aiGateway',
        options: [
          { name: 'AI Gateway', value: 'aiGateway' },
          { name: 'Analytics', value: 'analytics' },
        ],
      },
      ...aiGatewayNodeProperties,
      ...analyticsProperties,
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const resource = this.getNodeParameter('resource', 0, 'aiGateway') as AlephantResource;

    if (resource === 'aiGateway') {
      return executeChatCompletionNode.call(this);
    }

    if (resource === 'analytics') {
      return executeUsageNode.call(this);
    }

    throw new NodeOperationError(this.getNode(), `Unsupported Alephant resource: ${resource}`);
  }
}
