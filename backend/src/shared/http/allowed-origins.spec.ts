import { describe, expect, it } from 'vitest';

import { resolveAllowedOrigins } from './allowed-origins';

describe('resolveAllowedOrigins', () => {
  it('keeps localhost as the default allowed origin', () => {
    expect(resolveAllowedOrigins(undefined)).toEqual(['http://localhost:4200']);
  });

  it('adds the configured frontend origin alongside localhost', () => {
    expect(resolveAllowedOrigins('https://fullstack-architecture-lab-crao.vercel.app')).toEqual([
      'http://localhost:4200',
      'https://fullstack-architecture-lab-crao.vercel.app',
    ]);
  });

  it('accepts multiple configured origins separated by commas', () => {
    expect(resolveAllowedOrigins(' https://a.example , https://b.example ')).toEqual([
      'http://localhost:4200',
      'https://a.example',
      'https://b.example',
    ]);
  });

  it('deduplicates repeated origins', () => {
    expect(resolveAllowedOrigins('http://localhost:4200, https://a.example, https://a.example')).toEqual([
      'http://localhost:4200',
      'https://a.example',
    ]);
  });
});
