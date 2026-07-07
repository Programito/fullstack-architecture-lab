import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { DeveloperLogsQueryDto } from './developer-logs-query.dto';

describe('DeveloperLogsQueryDto', () => {
  it('accepts a known clientOrigin filter', () => {
    const dto = plainToInstance(DeveloperLogsQueryDto, { clientOrigin: 'apk-customer' });

    expect(validateSync(dto)).toEqual([]);
  });

  it('rejects an unknown clientOrigin filter', () => {
    const dto = plainToInstance(DeveloperLogsQueryDto, { clientOrigin: 'desktop-app' });

    expect(validateSync(dto).map((error) => error.property)).toContain('clientOrigin');
  });
});
