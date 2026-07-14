import { fireEvent, render, screen } from '@testing-library/angular';
import { describe, expect, it, vi } from 'vitest';
import { provideI18nTesting } from '../../../../shared/i18n/i18n-testing';
import { ModifierGroupFormDialog } from './modifier-group-form-dialog';

async function renderDialog(props: Record<string, unknown> = {}) {
  const i18n = provideI18nTesting('es');
  return render(
    `<app-modifier-group-form-dialog open [loading]="loading" (confirmed)="confirmed($event)" (closed)="closed()" />`,
    {
      imports: [...i18n.imports, ModifierGroupFormDialog],
      providers: i18n.providers,
      componentProperties: { loading: false, confirmed: vi.fn(), closed: vi.fn(), ...props },
    },
  );
}

describe('ModifierGroupFormDialog', () => {
  it('renders the create title', async () => {
    await renderDialog();
    expect(screen.getByText('Nuevo grupo de modificadores')).toBeTruthy();
  });

  it('disables confirm when name is empty', async () => {
    await renderDialog();
    const confirm = screen.getByRole('button', { name: /crear grupo/i });
    expect(confirm.hasAttribute('disabled')).toBe(true);
  });

  it('enables confirm after filling base name and at least one option', async () => {
    const { fixture } = await renderDialog();

    fireEvent.input(screen.getByRole('textbox', { name: 'Nombre base' }), { target: { value: 'Extras' } });
    fireEvent.input(screen.getByPlaceholderText('Nombre de la opción'), { target: { value: 'Queso extra' } });
    fixture.detectChanges();

    expect(screen.getByRole('button', { name: /crear grupo/i }).hasAttribute('disabled')).toBe(false);
  });

  it('emits confirmed with the form data when submitted', async () => {
    const confirmed = vi.fn();
    const { fixture } = await renderDialog({ confirmed });

    fireEvent.input(screen.getByRole('textbox', { name: 'Nombre base' }), { target: { value: 'Extras' } });
    fireEvent.input(screen.getByPlaceholderText('Nombre de la opción'), { target: { value: 'Queso extra' } });
    fixture.detectChanges();

    fireEvent.click(screen.getByRole('button', { name: /crear grupo/i }));
    fixture.detectChanges();

    expect(confirmed).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Extras',
        options: [expect.objectContaining({ name: 'Queso extra' })],
      }),
    );
  });

  it('allows adding and removing option rows', async () => {
    const { fixture } = await renderDialog();

    fireEvent.click(screen.getByRole('button', { name: /añadir opción/i }));
    fixture.detectChanges();

    expect(screen.getAllByPlaceholderText('Nombre de la opción').length).toBe(2);

    fireEvent.click(screen.getAllByRole('button', { name: /eliminar opción/i })[0]);
    fixture.detectChanges();

    expect(screen.getAllByPlaceholderText('Nombre de la opción').length).toBe(1);
  });

  it('emits closed when the dialog is cancelled', async () => {
    const closed = vi.fn();
    const { fixture } = await renderDialog({ closed });

    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    fixture.detectChanges();

    expect(closed).toHaveBeenCalled();
  });

  it('uses segmented translations for the group and its options', async () => {
    const confirmed = vi.fn();
    const { fixture } = await renderDialog({ confirmed });

    fireEvent.input(screen.getByRole('textbox', { name: 'Nombre base' }), { target: { value: 'Extras' } });
    fireEvent.input(screen.getByPlaceholderText('Nombre de la opción'), { target: { value: 'Queso extra' } });

    fireEvent.click(screen.getAllByRole('radio', { name: /Espa/i })[0]);
    fireEvent.input(screen.getAllByRole('textbox', { name: /Nombre \(espa/i })[0], { target: { value: 'Extras (ES)' } });
    fireEvent.click(screen.getAllByRole('radio', { name: /Catal/i })[0]);
    fireEvent.input(screen.getByRole('textbox', { name: /Nombre \(catal/i }), { target: { value: 'Extres' } });

    fireEvent.click(screen.getAllByRole('radio', { name: /Espa/i })[1]);
    fireEvent.input(screen.getAllByRole('textbox', { name: /Nombre \(espa/i })[0], { target: { value: 'Queso extra (ES)' } });
    fireEvent.click(screen.getAllByRole('radio', { name: 'English' })[1]);
    fireEvent.input(screen.getByRole('textbox', { name: /Nombre \(ingl/i }), { target: { value: 'Extra cheese' } });
    fixture.detectChanges();

    fireEvent.click(screen.getByRole('button', { name: /crear grupo/i }));
    fixture.detectChanges();

    expect(confirmed).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Extras',
        nameI18n: expect.objectContaining({ es: 'Extras (ES)', ca: 'Extres' }),
        options: [
          expect.objectContaining({
            name: 'Queso extra',
            nameI18n: expect.objectContaining({ es: 'Queso extra (ES)', en: 'Extra cheese' }),
          }),
        ],
      }),
    );
  });
});
