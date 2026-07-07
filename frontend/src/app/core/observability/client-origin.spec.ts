import { resolveClientOrigin } from './client-origin';

describe('resolveClientOrigin', () => {
  it('returns web-pos for restaurant-pos routes', () => {
    expect(resolveClientOrigin('/restaurant-pos/service')).toBe('web-pos');
  });

  it('returns web-demo for demo-login requests', () => {
    expect(resolveClientOrigin('/login', '/api/v1/auth/demo-login')).toBe('web-demo');
  });

  it('falls back to web-admin for technical web routes', () => {
    expect(resolveClientOrigin('/developer/logs')).toBe('web-admin');
  });
});
