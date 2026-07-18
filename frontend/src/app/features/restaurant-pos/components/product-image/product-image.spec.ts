import { fireEvent, render } from '@testing-library/angular';
import { ProductImage } from './product-image';

describe('ProductImage', () => {
  it('shows a decorative skeleton while a valid image is loading', async () => {
    const { container } = await render(ProductImage, {
      inputs: { imageUrl: 'https://example.com/coffee.jpg', alt: 'Café' },
    });

    expect(container.querySelector('.skeleton')).toBeTruthy();
    expect(container.querySelector('.skeleton')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('hides the skeleton and keeps the image after it loads', async () => {
    const { container } = await render(ProductImage, {
      inputs: { imageUrl: 'https://example.com/coffee.jpg', alt: 'Café' },
    });

    const image = container.querySelector('img') as HTMLImageElement;
    fireEvent.load(image);

    expect(container.querySelector('.skeleton')).toBeNull();
    expect(container.querySelector('img[alt="Café"]')).toBeTruthy();
  });

  it('replaces a failed image with the fallback', async () => {
    const { container } = await render(ProductImage, {
      inputs: { imageUrl: 'https://example.com/missing.jpg', alt: 'No disponible' },
    });

    fireEvent.error(container.querySelector('img') as HTMLImageElement);

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('[data-product-image-fallback]')).toBeTruthy();
  });

  it('shows the fallback immediately when there is no image URL', async () => {
    const { container } = await render(ProductImage, {
      inputs: { imageUrl: null, alt: 'Sin imagen' },
    });

    expect(container.querySelector('.skeleton')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('[data-product-image-fallback]')).toBeTruthy();
  });

  it('applies a circular container when shape is circle', async () => {
    const { container } = await render(ProductImage, {
      inputs: { imageUrl: null, alt: 'Producto', shape: 'circle' },
    });

    expect(container.querySelector('[data-product-image]')?.classList).toContain('product-image--circle');
  });

  it.each([
    ['sm', '2.5rem'],
    ['md', '3rem'],
    ['lg', '6rem'],
  ] as const)('reserves %s dimensions of %s', async (size, dimension) => {
    const { container } = await render(ProductImage, {
      inputs: { imageUrl: null, alt: 'Producto', size },
    });

    const imageContainer = container.querySelector('[data-product-image]') as HTMLElement;
    expect(imageContainer.style.width).toBe(dimension);
    expect(imageContainer.style.height).toBe(dimension);
  });

  it('returns to loading for a new URL after the previous one loaded', async () => {
    const { container, fixture } = await render(ProductImage, {
      inputs: { imageUrl: 'https://example.com/first.jpg', alt: 'Producto' },
    });

    fireEvent.load(container.querySelector('img') as HTMLImageElement);
    fixture.componentRef.setInput('imageUrl', 'https://example.com/second.jpg');
    fixture.detectChanges();

    expect(container.querySelector('.skeleton')).toBeTruthy();
    expect((container.querySelector('img') as HTMLImageElement).src).toContain('second.jpg');
  });
});
