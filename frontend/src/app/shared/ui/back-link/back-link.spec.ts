import { render, screen } from '@testing-library/angular';

import { BackLink } from './back-link';

describe('BackLink', () => {
  it('renders a minimal back action with icon and label', async () => {
    await render('<app-back-link label="Recursos developer" routerLink="/developer" />', {
      imports: [BackLink],
    });

    const link = screen.getByRole('link', { name: 'Recursos developer' });

    expect(link.className).toContain('button--minimal');
    expect(link.getAttribute('href')).toBe('/developer');
    expect(link.textContent).toContain('Recursos developer');
  });
});
