import {
  DEFAULT_ANALYTICS_BASE_URL,
  DEFAULT_GATEWAY_BASE_URL,
  DEFAULT_SAAS_BASE_URL,
} from '../shared/constants';
import { AlephantVirtualKeyApi } from '../credentials/AlephantVirtualKeyApi.credentials';
import { resolveVirtualKeyCredentials } from '../shared/credentials';

describe('credential helpers', () => {
  it('uses default base URLs for virtual key credentials', () => {
    const resolved = resolveVirtualKeyCredentials({ virtualKey: 'vk-test' });
    expect(resolved.virtualKey).toBe('vk-test');
    expect(resolved.gatewayBaseUrl).toBe(DEFAULT_GATEWAY_BASE_URL);
    expect(resolved.saasBaseUrl).toBe(DEFAULT_SAAS_BASE_URL);
    expect(resolved.analyticsBaseUrl).toBe(DEFAULT_ANALYTICS_BASE_URL);
    expect(resolved.workspaceId).toBe('');
  });

  it('allows virtual key base URL overrides', () => {
    const resolved = resolveVirtualKeyCredentials({
      virtualKey: 'vk-test',
      gatewayBaseUrl: 'http://localhost:8080/v1/',
      saasBaseUrl: 'http://localhost:3000/',
      analyticsBaseUrl: 'http://localhost:3001/',
      workspaceId: 'workspace-id',
    });
    expect(resolved.gatewayBaseUrl).toBe('http://localhost:8080/v1');
    expect(resolved.saasBaseUrl).toBe('http://localhost:3000');
    expect(resolved.analyticsBaseUrl).toBe('http://localhost:3001');
    expect(resolved.workspaceId).toBe('workspace-id');
  });

});

describe('credential metadata', () => {
  it('defines virtual key credential field metadata', () => {
    const credential = new AlephantVirtualKeyApi();
    const virtualKey = credential.properties.find((property) => property.name === 'virtualKey');
    const gatewayBaseUrl = credential.properties.find((property) => property.name === 'gatewayBaseUrl');
    const saasBaseUrl = credential.properties.find((property) => property.name === 'saasBaseUrl');
    const analyticsBaseUrl = credential.properties.find((property) => property.name === 'analyticsBaseUrl');
    const workspaceId = credential.properties.find((property) => property.name === 'workspaceId');

    expect(virtualKey).toMatchObject({
      required: true,
      typeOptions: { password: true },
    });
    expect(gatewayBaseUrl).toMatchObject({
      required: false,
      default: DEFAULT_GATEWAY_BASE_URL,
    });
    expect(saasBaseUrl).toMatchObject({
      required: false,
      default: DEFAULT_SAAS_BASE_URL,
    });
    expect(analyticsBaseUrl).toMatchObject({
      required: false,
      default: DEFAULT_ANALYTICS_BASE_URL,
    });
    expect(workspaceId).toMatchObject({
      required: false,
      default: '',
    });
    expect(credential.test).toMatchObject({
      request: {
        baseURL: '={{$credentials.gatewayBaseUrl}}',
        url: '/models',
        headers: {
          Authorization: '=Bearer {{$credentials.virtualKey}}',
        },
      },
    });
  });

});
