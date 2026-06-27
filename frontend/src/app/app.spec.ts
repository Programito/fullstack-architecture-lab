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
});
