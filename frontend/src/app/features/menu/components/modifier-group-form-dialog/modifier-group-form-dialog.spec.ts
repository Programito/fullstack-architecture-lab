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

  it('enables confirm after filling name and at least one option', async () => {
    const { fixture } = await renderDialog();

    fireEvent.input(screen.getByPlaceholderText('Nombre del grupo'), { target: { value: 'Extras' } });
    fireEvent.input(screen.getByPlaceholderText('Nombre de la opción'), { target: { value: 'Queso extra' } });
    fixture.detectChanges();

    expect(screen.getByRole('button', { name: /crear grupo/i }).hasAttribute('disabled')).toBe(false);
  });

  it('emits confirmed with the form data when submitted', async () => {
    const confirmed = vi.fn();
    const { fixture } = await renderDialog({ confirmed });

    fireEvent.input(screen.getByPlaceholderText('Nombre del grupo'), { target: { value: 'Extras' } });
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

  it('includes nameEs in nameI18n for the group and its options', async () => {
    const confirmed = vi.fn();
    const { fixture } = await renderDialog({ confirmed });

    fireEvent.input(screen.getByPlaceholderText('Nombre del grupo'), { target: { value: 'Extras' } });
    fireEvent.input(screen.getByPlaceholderText('Nombre de la opción'), { target: { value: 'Queso extra' } });

    // Con una sola opción visible, hay dos campos "Nombre (castellano)": el del grupo y el de
    // la opción (el label de la opción solo se muestra en la fila $index === 0).
    const [groupNameEsInput, optionNameEsInput] = screen.getAllByLabelText('Nombre (castellano)') as HTMLInputElement[];
    fireEvent.input(groupNameEsInput, { target: { value: 'Extras (ES)' } });
    fireEvent.input(optionNameEsInput, { target: { value: 'Queso extra (ES)' } });
    fixture.detectChanges();

    fireEvent.click(screen.getByRole('button', { name: /crear grupo/i }));
    fixture.detectChanges();

    expect(confirmed).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Extras',
        nameI18n: expect.objectContaining({ es: 'Extras (ES)' }),
        options: [
          expect.objectContaining({
            name: 'Queso extra',
            nameI18n: expect.objectContaining({ es: 'Queso extra (ES)' }),
          }),
        ],
      }),
    );
  });
});
