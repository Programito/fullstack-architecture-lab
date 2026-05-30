import { render, screen } from '@testing-library/angular';
import { Badge } from './badge';

describe('Badge', () => {
  it('renders projected content', async () => {
    await render('<app-badge>Activo</app-badge>', {
      imports: [Badge],
    });

    expect(screen.getByText('Activo')).toBeTruthy();
  });

  it('supports violet variant', async () => {
    await render('<app-badge variant="violet">IA</app-badge>', {
      imports: [Badge],
    });

    expect(screen.getByText('IA').className).toContain('badge--violet');
  });

  it('supports default shape', async () => {
    await render('<app-badge shape="default">Nuevo</app-badge>', {
      imports: [Badge],
    });

    expect(screen.getByText('Nuevo').className).toContain('badge--default');
  });

  it('supports gradient fill', async () => {
    await render('<app-badge fill="gradient">Beta</app-badge>', {
      imports: [Badge],
    });

    expect(screen.getByText('Beta').className).toContain('badge--gradient');
  });

  it('supports minimal appearance', async () => {
    await render('<app-badge appearance="minimal">Activo</app-badge>', {
      imports: [Badge],
    });

    expect(screen.getByText('Activo').className).toContain('badge--minimal');
  });
});
