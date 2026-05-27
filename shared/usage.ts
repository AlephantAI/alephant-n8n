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

type UsageParameterMode = 'fixed' | 'aiDynamic';

const USAGE_OPERATION_ALIASES: Record<string, UsageOperation> = {
  scope: 'scope',
  budgetstatus: 'budgetStatus',
  budget_status: 'budgetStatus',
  budget: 'budgetStatus',
  usagessummary: 'usageSummary',
  usagesummary: 'usageSummary',
  usage_summary: 'usageSummary',
  usage: 'usageSummary',
  dailycosts: 'dailyCosts',
  daily_costs: 'dailyCosts',
  daily: 'dailyCosts',
  costbymodel: 'costByModel',
  cost_by_model: 'costByModel',
  modelcosts: 'costByModel',
  model_costs: 'costByModel',
  recentrequests: 'recentRequests',
  recent_requests: 'recentRequests',
  requests: 'recentRequests',
  requestlogdetail: 'requestLogDetail',
  request_log_detail: 'requestLogDetail',
  logdetail: 'requestLogDetail',
};

const USAGE_PERIOD_ALIASES: Record<string, string> = {
  '24h': '24h',
  '24hour': '24h',
  '24hours': '24h',
  '1day': '24h',
  '7d': '7d',
  '7day': '7d',
  '7days': '7d',
  week: '7d',
  '30d': '30d',
  '30day': '30d',
  '30days': '30d',
  month: '30d',
  '90d': '90d',
  '90day': '90d',
  '90days': '90d',
  quarter: '90d',
};

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

function normalizeUsageToken(value: unknown): string {
  return normalizeOptionalString(value).toLowerCase().replace(/[\s-]+/g, '_');
}

function resolveUsageOperation(value: unknown): UsageOperation {
  const key = normalizeUsageToken(value);
  const operation = USAGE_OPERATION_ALIASES[key];

  if (!operation) {
    throw new Error(
      'AI Operation must be one of: scope, budgetStatus, usageSummary, dailyCosts, costByModel, recentRequests, requestLogDetail',
    );
  }

  return operation;
}

function resolveUsagePeriod(value: unknown): string {
  const key = normalizeUsageToken(value);
  const period = USAGE_PERIOD_ALIASES[key];

  if (!period) {
    throw new Error('AI Period must be one of: 24h, 7d, 30d, 90d');
  }

  return period;
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
    const parameterMode = this.getNodeParameter(
      'parameterMode',
      itemIndex,
      'fixed',
    ) as UsageParameterMode;
    let operation: UsageOperation;
    let period: string;

    try {
      operation =
        parameterMode === 'aiDynamic'
          ? resolveUsageOperation(this.getNodeParameter('aiOperation', itemIndex))
          : (this.getNodeParameter('operation', itemIndex) as UsageOperation);
      period =
        parameterMode === 'aiDynamic'
          ? resolveUsagePeriod(this.getNodeParameter('aiPeriod', itemIndex, '7d'))
          : (this.getNodeParameter('period', itemIndex, '7d') as string);
    } catch (error) {
      throw new NodeOperationError(
        this.getNode(),
        error instanceof Error ? error.message : 'Invalid Alephant Usage input',
        { itemIndex },
      );
    }

    const data = await runUsageRequest(
      this,
      {
        operation,
        period,
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
