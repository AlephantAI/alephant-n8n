import type {
  IDataObject,
  IExecuteFunctions,
  INodeExecutionData,
  ISupplyDataFunctions,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { ENDPOINTS } from './constants';
import { resolveVirtualKeyCredentials } from './credentials';
import { alephantRequest } from './http';
import type { AlephantRequestOptions } from './http';
import type { AlephantVirtualKeyCredentials } from './types';

export type UsageOperation =
  | 'scope'
  | 'budgetStatus'
  | 'usageSummary'
  | 'dailyCosts'
  | 'costByModel'
  | 'recentRequests'
  | 'requestLogDetail';

export interface UsageRequestParams {
  period?: string | null;
  limit?: number | null;
  offset?: number | null;
  requestLogId?: string | null;
}

export interface UsageToolInput extends UsageRequestParams {
  operation: UsageOperation;
  requestLogMaxAttempts?: number | null;
  workspaceId?: string | null;
  inputJson?: IDataObject;
}

export interface UsageRequest {
  host?: 'saas' | 'analytics';
  path: string;
  qs?: IDataObject;
}

function withQs(path: string, qs: IDataObject): UsageRequest {
  const sanitized = Object.fromEntries(
    Object.entries(qs).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  ) as IDataObject;

  return Object.keys(sanitized).length > 0 ? { path, qs: sanitized } : { path };
}

function isPositiveNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isNonNegativeNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function requireRequestLogId(value: string | null | undefined): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error('Request Log ID is required');
  }

  return encodeURIComponent(value.trim());
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
  ctx: IExecuteFunctions | ISupplyDataFunctions,
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

export function buildUsageRequest(
  operation: UsageOperation,
  params: UsageRequestParams,
): UsageRequest {
  switch (operation) {
    case 'scope':
      return { path: ENDPOINTS.cockpitScope };
    case 'budgetStatus':
      return withQs(ENDPOINTS.cockpitBudgetStatus, { period: params.period });
    case 'usageSummary':
      return withQs(ENDPOINTS.cockpitUsageSummary, { period: params.period });
    case 'dailyCosts':
      return withQs(ENDPOINTS.cockpitDailyCosts, { period: params.period });
    case 'costByModel':
      return withQs(ENDPOINTS.cockpitCostByModel, { period: params.period });
    case 'recentRequests':
      return withQs(ENDPOINTS.cockpitRecentRequests, {
        limit: isPositiveNumber(params.limit) ? params.limit : undefined,
        offset: isNonNegativeNumber(params.offset) ? params.offset : undefined,
      });
    case 'requestLogDetail':
      return {
        host: 'analytics',
        path: `${ENDPOINTS.analyticsRequestLogs}/${requireRequestLogId(params.requestLogId)}`,
      };
  }
}

export async function runUsageRequest(
  ctx: IExecuteFunctions | ISupplyDataFunctions,
  params: UsageToolInput,
  itemIndex = 0,
): Promise<IDataObject> {
  const credentials = resolveVirtualKeyCredentials(
    (await ctx.getCredentials('alephantVirtualKeyApi')) as AlephantVirtualKeyCredentials,
  );
  let request: UsageRequest;

  try {
    request = buildUsageRequest(params.operation, params);
  } catch (error) {
    throw new NodeOperationError(
      ctx.getNode(),
      error instanceof Error ? error.message : 'Invalid Alephant Usage input',
      { itemIndex },
    );
  }

  let workspaceId =
    request.host === 'analytics'
      ? normalizeOptionalString(params.workspaceId) ||
        normalizeOptionalString(params.inputJson?.workspaceId) ||
        normalizeOptionalString(params.inputJson?.workspace_id) ||
        normalizeOptionalString(params.inputJson?.xWorkspaceId) ||
        credentials.workspaceId
      : undefined;

  if (request.host === 'analytics' && workspaceId === '') {
    const scope = await alephantRequest<IDataObject>(ctx, {
      method: 'GET',
      baseUrl: credentials.saasBaseUrl,
      path: ENDPOINTS.cockpitScope,
      token: credentials.virtualKey,
      itemIndex,
    });
    workspaceId = extractWorkspaceIdFromScope(scope);
  }

  if (request.host === 'analytics' && workspaceId === '') {
    throw new NodeOperationError(
      ctx.getNode(),
      'Workspace ID is required for request log detail lookups and could not be resolved from Alephant Scope',
      { itemIndex },
    );
  }

  const requestOptions: AlephantRequestOptions = {
    method: 'GET',
    baseUrl: request.host === 'analytics' ? credentials.analyticsBaseUrl : credentials.saasBaseUrl,
    path: request.path,
    token: credentials.virtualKey,
    workspaceId,
    qs: request.qs,
    itemIndex,
  };

  return request.host === 'analytics'
    ? await requestWithLogPolling<IDataObject>(
        ctx,
        requestOptions,
        normalizeAttemptCount(params.requestLogMaxAttempts),
      )
    : await alephantRequest<IDataObject>(ctx, requestOptions);
}

export async function executeUsageNode(
  this: IExecuteFunctions,
): Promise<INodeExecutionData[][]> {
  const items = this.getInputData();
  const returnData: INodeExecutionData[] = [];

  for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
    const data = await runUsageRequest(
      this,
      {
        operation: this.getNodeParameter('operation', itemIndex) as UsageOperation,
        period: this.getNodeParameter('period', itemIndex, '7d') as string,
        limit: this.getNodeParameter('limit', itemIndex, 50) as number,
        offset: this.getNodeParameter('offset', itemIndex, 0) as number,
        requestLogId: this.getNodeParameter('requestLogId', itemIndex, '') as string,
        workspaceId: this.getNodeParameter('workspaceId', itemIndex, '') as string,
        requestLogMaxAttempts: this.getNodeParameter('requestLogMaxAttempts', itemIndex, 6) as number,
        inputJson: items[itemIndex]?.json,
      },
      itemIndex,
    );

    returnData.push({
      json: data,
      pairedItem: { item: itemIndex },
    });
  }

  return [returnData];
}
