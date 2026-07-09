import { render, screen } from '@testing-library/angular';
import { Card } from './card';

describe('Card', () => {
  it('renders projected content', async () => {
    await render('<app-card>Contenido de la card</app-card>', {
      imports: [Card],
    });

    expect(screen.getByText('Contenido de la card')).toBeTruthy();
  });

  it('applies variant, padding and appearance classes', async () => {
    const { container } = await render('<app-card variant="filled" padding="lg" appearance="minimal">Contenido</app-card>', {
      imports: [Card],
    });

    const card = container.querySelector('.card');
    expect(card?.className).toContain('card--filled');
    expect(card?.className).toContain('card--padding-lg');
    expect(card?.className).toContain('card--minimal');
  });

  it('applies the stretch class so the card can fill a grid or flex cell', async () => {
    const { container } = await render('<app-card [stretch]="true">Contenido</app-card>', {
      imports: [Card],
    });

    expect(container.querySelector('.card')?.className).toContain('card--stretch');
  });

  it('omits the stretch class by default', async () => {
    const { container } = await render('<app-card>Contenido</app-card>', {
      imports: [Card],
    });

    expect(container.querySelector('.card')?.className).not.toContain('card--stretch');
  });
});
