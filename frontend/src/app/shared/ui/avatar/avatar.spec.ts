import { fireEvent, render, screen } from '@testing-library/angular';
import { Avatar } from './avatar';

describe('Avatar', () => {
  it('renders an image when src is available', async () => {
    await render('<app-avatar src="/avatar.png" name="Ada Lovelace" />', {
      imports: [Avatar],
    });

    expect(screen.getByRole('img', { name: 'Ada Lovelace' }).getAttribute('src')).toBe('/avatar.png');
  });

  it('uses explicit initials as fallback', async () => {
    await render('<app-avatar initials="al" name="Ada Lovelace" />', {
      imports: [Avatar],
    });

    expect(screen.getByText('AL')).toBeTruthy();
  });

  it('derives initials from the name', async () => {
    await render('<app-avatar name="Grace Hopper" />', {
      imports: [Avatar],
    });

    expect(screen.getByRole('img', { name: 'Grace Hopper' })).toBeTruthy();
    expect(screen.getByText('GH')).toBeTruthy();
  });

  it('falls back to initials when the image fails', async () => {
    await render('<app-avatar src="/missing.png" name="Ada Lovelace" />', {
      imports: [Avatar],
    });

    fireEvent.error(screen.getByRole('img', { name: 'Ada Lovelace' }));

    expect(screen.getByText('AL')).toBeTruthy();
  });

  it('applies size, shape and variant classes', async () => {
    const { container } = await render('<app-avatar name="Ada Lovelace" size="lg" shape="square" variant="violet" />', {
      imports: [Avatar],
    });

    const avatar = container.querySelector('.avatar');
    expect(avatar?.className).toContain('avatar--lg');
    expect(avatar?.className).toContain('avatar--square');
    expect(avatar?.className).toContain('avatar--violet');
  });

  it('applies minimal appearance class', async () => {
    const { container } = await render('<app-avatar name="Ada Lovelace" appearance="minimal" />', {
      imports: [Avatar],
    });

    expect(container.querySelector('.avatar')?.className).toContain('avatar--minimal');
  });
});
