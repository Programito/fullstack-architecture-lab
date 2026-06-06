import { fireEvent, render, screen } from '@testing-library/angular';
import { provideI18nTesting } from '../../i18n/i18n-testing';
import { ColorModeService } from '../../theme/color-mode.service';
import { ColorModeMenu } from './color-mode-menu';

const setMatchMedia = (matches = false) => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

describe('ColorModeMenu', () => {
  const renderMenu = async () => {
    setMatchMedia(false);
    const i18n = provideI18nTesting();

    return render('<app-color-mode-menu />', {
      imports: [ColorModeMenu, ...i18n.imports],
      providers: [...i18n.providers],
    });
  };

  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
  });

  it('renders a direct switch to dark mode when the active mode is light', async () => {
    await renderMenu();

    const trigger = screen.getByRole('button', { name: 'Cambiar a modo oscuro' });

    expect(trigger).toBeTruthy();
    expect(trigger.textContent).toContain('light_mode');
    expect(trigger.textContent).not.toContain('Tema');
  });

  it('toggles between explicit dark and light preferences through the color mode service', async () => {
    const { fixture } = await renderMenu();
    const service = fixture.debugElement.injector.get(ColorModeService);

    fireEvent.click(screen.getByRole('button', { name: 'Cambiar a modo oscuro' }));
    fixture.detectChanges();

    expect(service.preference()).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');
    const darkTrigger = screen.getByRole('button', { name: 'Cambiar a modo claro' });

    expect(darkTrigger).toBeTruthy();
    expect(darkTrigger.textContent).toContain('dark_mode');

    fireEvent.click(darkTrigger);
    fixture.detectChanges();

    expect(service.preference()).toBe('light');
    expect(document.documentElement.dataset['theme']).toBe('light');
    expect(screen.getByRole('button', { name: 'Cambiar a modo oscuro' }).textContent).toContain('light_mode');
  });
});
