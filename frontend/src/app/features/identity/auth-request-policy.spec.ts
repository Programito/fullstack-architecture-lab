import { describe, expect, it } from 'vitest';

import { shouldAttachAuthHeader } from './auth-request-policy';

describe('shouldAttachAuthHeader', () => {
  it('allows same-origin relative API requests', () => {
    expect(shouldAttachAuthHeader('/api/v1/restaurants', 'https://app.example.com', 'https://api.example.com/api/v1')).toBe(true);
  });

  it('allows configured absolute backend URLs', () => {
    expect(
      shouldAttachAuthHeader(
        'https://fullstack-architecture-lab.onrender.com/api/v1/restaurants',
        'https://fullstack-architecture-lab-crao.vercel.app',
        'https://fullstack-architecture-lab.onrender.com/api/v1',
      ),
    ).toBe(true);
  });

  it('does not allow unrelated third-party URLs', () => {
    expect(
      shouldAttachAuthHeader(
        'https://api.cloudinary.com/v1_1/demo-cloud/image/list',
        'https://fullstack-architecture-lab-crao.vercel.app',
        'https://fullstack-architecture-lab.onrender.com/api/v1',
      ),
    ).toBe(false);
  });

  it('does not attach auth to auth endpoints', () => {
    expect(
      shouldAttachAuthHeader(
        'https://fullstack-architecture-lab.onrender.com/api/v1/auth/demo-login',
        'https://fullstack-architecture-lab-crao.vercel.app',
        'https://fullstack-architecture-lab.onrender.com/api/v1',
      ),
    ).toBe(false);
  });
});
