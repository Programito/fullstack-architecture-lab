import { Subject } from 'rxjs';
import { loadInitialTranslations } from './i18n.providers';
import type { LocaleService } from './locale.service';

describe('i18n providers', () => {
  it('waits for the active locale translations before resolving the app initializer', async () => {
    const translationsLoaded = new Subject<Record<string, string>>();
    const localeService = { locale: vi.fn(() => 'ca') } as unknown as LocaleService;
    const transloco = {
      load: vi.fn(() => translationsLoaded.asObservable()),
    };

    let resolved = false;
    const initializer = loadInitialTranslations(localeService, transloco as never).then(() => {
      resolved = true;
    });

    await Promise.resolve();

    expect(localeService.locale).toHaveBeenCalledOnce();
    expect(transloco.load).toHaveBeenCalledWith('ca');
    expect(resolved).toBe(false);

    translationsLoaded.next({ title: 'Sala' });
    translationsLoaded.complete();
    await initializer;

    expect(resolved).toBe(true);
  });
});
