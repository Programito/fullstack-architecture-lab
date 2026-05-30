import { render, screen } from '@testing-library/angular';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { App } from './app';

describe('App', () => {
  it('should create the app', () => {
    expect(App).toBeTruthy();
  });

  it('should render the starter experience', async () => {
    await render(App, {
      imports: [
        TranslocoTestingModule.forRoot({
          langs: {
            es: {
              app: {
                title: 'Proyecto Full Stack',
                tools: {
                  tailwind: 'Tailwind CSS',
                  playwright: 'Playwright',
                },
              },
            },
          },
          translocoConfig: {
            availableLangs: ['es'],
            defaultLang: 'es',
          },
          preloadLangs: true,
        }),
      ],
    });

    expect(screen.getByRole('heading', { name: /proyecto full stack/i })).toBeTruthy();
    expect(screen.getByText('Tailwind CSS')).toBeTruthy();
    expect(screen.getByText('Playwright')).toBeTruthy();
  });
});
