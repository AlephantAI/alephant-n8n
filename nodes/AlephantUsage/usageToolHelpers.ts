import type {
  IDataObject,
  IExecuteFunctions,
  INodeExecutionData,
  INodeProperties,
  INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { ENDPOINTS } from '../../shared/constants';
import { resolveVirtualKeyCredentials } from '../../shared/credentials';
import { alephantRequest } from '../../shared/http';
import type { AlephantRequestOptions } from '../../shared/http';
import type { AlephantVirtualKeyCredentials } from '../../shared/types';
import { buildUsageRequest } from './AlephantUsage.node';
import type { UsageOperation, UsageRequest, UsageRequestParams } from './AlephantUsage.node';

type UsageToolParamsReader = (
  ctx: IExecuteFunctions,
  itemIndex: number,
) => UsageRequestParams;

type UsageToolAttemptsReader = (ctx: IExecuteFunctions, itemIndex: number) => number;

interface UsageToolDescriptionInput {
  displayName: string;
  name: string;
  description: string;
  properties?: INodeProperties[];
}

export const PERIOD_PROPERTY: INodeProperties = {
  displayName: 'Period',
  name: 'period',
  type: 'options',
  default: '7d',
  description:
    'Time range for this analytics query. In AI tool mode, let the model choose this from the user prompt, for example 7 Days for "last 7 days".',
  options: [
    { name: '24 Hours', value: '24h' },
    { name: '7 Days', value: '7d' },
    { name: '30 Days', value: '30d' },
    { name: '90 Days', value: '90d' },
  ],
};

export const LIMIT_PROPERTY: INodeProperties = {
  displayName: 'Limit',
  name: 'limit',
  type: 'number',
  default: 50,
  description: 'Maximum number of recent request records to return',
  typeOptions: { minValue: 1 },
};

export const OFFSET_PROPERTY: INodeProperties = {
  displayName: 'Offset',
  name: 'offset',
  type: 'number',
  default: 0,
  description: 'Number of recent request records to skip before returning results',
  typeOptions: { minValue: 0 },
};

export const REQUEST_LOG_ID_PROPERTY: INodeProperties = {
  displayName: 'Request Log ID',
  name: 'requestLogId',
  type: 'string',
  default: '={{$json.requestLogId || $json.requestId || ""}}',
  required: true,
  description:
    'Request log identifier to retrieve. In AI tool mode, let the model use an ID from the user prompt or input item.',
};

export const WORKSPACE_ID_PROPERTY: INodeProperties = {
  displayName: 'Workspace ID',
  name: 'workspaceId',
  type: 'string',
  default: '={{$json.workspaceId || $json.workspace_id || $json.xWorkspaceId || ""}}',
  description:
    'Workspace ID for analytics request log lookups. Overrides the Workspace ID in credentials when set.',
};

export const REQUEST_LOG_MAX_ATTEMPTS_PROPERTY: INodeProperties = {
  displayName: 'Request Log Max Attempts',
  name: 'requestLogMaxAttempts',
  type: 'number',
  default: 6,
  typeOptions: { minValue: 1 },
  description: 'Maximum number of consecutive request log lookup attempts',
};

export function createUsageToolDescription(
  input: UsageToolDescriptionInput,
): INodeTypeDescription {
  return {
    displayName: input.displayName,
    name: input.name,
    icon: {
      light: 'file:alephant.light.svg',
      dark: 'file:alephant.dark.svg',
    },
    group: ['transform'],
    version: 1,
    description: input.description,
    defaults: { name: input.displayName },
    usableAsTool: true,
    inputs: [NodeConnectionTypes.Main],
    outputs: [NodeConnectionTypes.Main],
    credentials: [{ name: 'alephantVirtualKeyApi', required: true }],
    properties: input.properties || [],
  };
}

function normalizeOptionalString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readPath(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (typeof current !== 'object' || current === null) {
      return undefined;
    }

    return (current as Record<string, unknown>)[key];
  }, source);
}

function extractWorkspaceIdFromScope(scope: IDataObject): string {
  const paths = [
    'workspaceId',
    'workspace_id',
    'xWorkspaceId',
    'workspace.id',
    'workspace.uuid',
    'data.workspaceId',
    'data.workspace_id',
    'data.workspace.id',
    'data.workspace.uuid',
    'scope.workspaceId',
    'scope.workspace_id',
    'scope.workspace.id',
    'scope.workspace.uuid',
  ];

  for (const path of paths) {
    const workspaceId = normalizeOptionalString(readPath(scope, path));
    if (workspaceId !== '') {
      return workspaceId;
    }
  }

  return '';
}

function normalizeAttemptCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 6;
}

function isRequestLogNotFoundError(error: unknown): boolean {
  const httpCode = normalizeOptionalString(readPath(error, 'httpCode'));
  const status = readPath(error, 'response.status') ?? readPath(error, 'status');
  const code = readPath(error, 'context.data.code') ?? readPath(error, 'response.data.code');
  const message =
    normalizeOptionalString(readPath(error, 'context.data.message')) ||
    normalizeOptionalString(readPath(error, 'response.data.message')) ||
    normalizeOptionalString(readPath(error, 'message'));

  return (
    (httpCode === '404' || status === 404) &&
    (code === 40401 || message.toLowerCase().includes('request not found'))
  );
}

async function requestWithLogPolling<T>(
  ctx: IExecuteFunctions,
  options: AlephantRequestOptions,
  maxAttempts: number,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await alephantRequest<T>(ctx, options);
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts || !isRequestLogNotFoundError(error)) {
        throw error;
      }
    }
  }

  throw lastError;
}

async function resolveAnalyticsWorkspaceId(
  ctx: IExecuteFunctions,
  request: UsageRequest,
  itemIndex: number,
  defaultWorkspaceId: string,
): Promise<string | undefined> {
  if (request.host !== 'analytics') {
    return undefined;
  }

  const items = ctx.getInputData();
  let workspaceId =
    normalizeOptionalString(ctx.getNodeParameter('workspaceId', itemIndex, '')) ||
    normalizeOptionalString(items[itemIndex]?.json?.workspaceId) ||
    normalizeOptionalString(items[itemIndex]?.json?.workspace_id) ||
    normalizeOptionalString(items[itemIndex]?.json?.xWorkspaceId) ||
    defaultWorkspaceId;

  if (workspaceId === '') {
    const credentials = resolveVirtualKeyCredentials(
      (await ctx.getCredentials('alephantVirtualKeyApi')) as AlephantVirtualKeyCredentials,
    );
    const scope = await alephantRequest<IDataObject>(ctx, {
      method: 'GET',
      baseUrl: credentials.saasBaseUrl,
      path: ENDPOINTS.cockpitScope,
      token: credentials.virtualKey,
      itemIndex,
    });
    workspaceId = extractWorkspaceIdFromScope(scope);
  }

  if (workspaceId === '') {
    throw new NodeOperationError(
      ctx.getNode(),
      'Workspace ID is required for request log detail lookups and could not be resolved from Alephant Scope',
      { itemIndex },
    );
  }

  return workspaceId;
}

export async function executeUsageTool(
  ctx: IExecuteFunctions,
  operation: UsageOperation,
  readParams: UsageToolParamsReader = () => ({}),
  readMaxAttempts: UsageToolAttemptsReader = () => 6,
): Promise<INodeExecutionData[][]> {
  const items = ctx.getInputData();
  const credentials = resolveVirtualKeyCredentials(
    (await ctx.getCredentials('alephantVirtualKeyApi')) as AlephantVirtualKeyCredentials,
  );
  const returnData: INodeExecutionData[] = [];

  for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
    let request: UsageRequest;

    try {
      request = buildUsageRequest(operation, readParams(ctx, itemIndex));
    } catch (error) {
      throw new NodeOperationError(
        ctx.getNode(),
        error instanceof Error ? error.message : 'Invalid Alephant Usage tool input',
        { itemIndex },
      );
    }

    const requestOptions: AlephantRequestOptions = {
      method: 'GET',
      baseUrl: request.host === 'analytics' ? credentials.analyticsBaseUrl : credentials.saasBaseUrl,
      path: request.path,
      token: credentials.virtualKey,
      workspaceId: await resolveAnalyticsWorkspaceId(
        ctx,
        request,
        itemIndex,
        credentials.workspaceId,
      ),
      qs: request.qs,
      itemIndex,
    };

    const data =
      request.host === 'analytics'
        ? await requestWithLogPolling<IDataObject>(
            ctx,
            requestOptions,
            normalizeAttemptCount(readMaxAttempts(ctx, itemIndex)),
          )
        : await alephantRequest<IDataObject>(ctx, requestOptions);

    returnData.push({
      json: data,
      pairedItem: { item: itemIndex },
    });
  }

  return [returnData];
}
