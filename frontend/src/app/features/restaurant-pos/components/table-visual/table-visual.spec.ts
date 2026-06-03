import { render, screen } from '@testing-library/angular';
import { TableVisual } from './table-visual';

describe('TableVisual', () => {
  it('renders a decorative rectangle table SVG by default', async () => {
    const { container } = await render(TableVisual);
    const svg = container.querySelector('svg[data-table-svg="rectangle"]');

    expect(svg).toBeTruthy();
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders a round table SVG', async () => {
    const { container } = await render(TableVisual, {
      inputs: {
        shape: 'round',
      },
    });

    expect(container.querySelector('svg[data-table-svg="round"]')).toBeTruthy();
  });

  it('renders a square table SVG', async () => {
    const { container } = await render(TableVisual, {
      inputs: {
        shape: 'square',
      },
    });

    expect(container.querySelector('svg[data-table-svg="square"]')).toBeTruthy();
  });

  it('renders a long table SVG', async () => {
    const { container } = await render(TableVisual, {
      inputs: {
        shape: 'long',
      },
    });

    expect(container.querySelector('svg[data-table-svg="long"]')).toBeTruthy();
  });

  it('keeps the table art out of the accessibility tree', async () => {
    await render(TableVisual, {
      inputs: {
        shape: 'rectangle',
      },
    });

    expect(screen.queryByRole('img')).toBeNull();
  });
});
