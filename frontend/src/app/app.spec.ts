import { render, screen } from '@testing-library/angular';
import { App } from './app';

describe('App', () => {
  it('should create the app', () => {
    expect(App).toBeTruthy();
  });

  it('renders the application shell', async () => {
    const { container } = await render(App);

    expect(container.querySelector('router-outlet')).toBeTruthy();
    expect(container.querySelector('app-toast-viewport')).toBeTruthy();
  });

  it('shows the frontend version in the global footer', async () => {
    await render(App);

    expect(screen.getByText('0.0.1')).toBeTruthy();
  });

  it('links to the latest public Android release securely', async () => {
    await render(App);

    const link = screen.getByRole('link', { name: 'Android APK' });

    expect(link.getAttribute('href')).toBe(
      'https://github.com/Programito/fullstack-architecture-lab/releases/latest',
    );
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });
});
