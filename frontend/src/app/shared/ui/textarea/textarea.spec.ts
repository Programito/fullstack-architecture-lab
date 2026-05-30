import { fireEvent, render, screen } from '@testing-library/angular';
import { Textarea } from './textarea';

describe('Textarea', () => {
  it('renders a labelled textarea', async () => {
    await render('<app-textarea label="Descripcion" />', {
      imports: [Textarea],
    });

    expect(screen.getByLabelText('Descripcion')).toBeTruthy();
  });

  it('renders error state', async () => {
    await render('<app-textarea label="Descripcion" error="Campo obligatorio" />', {
      imports: [Textarea],
    });

    const textarea = screen.getByLabelText('Descripcion');
    expect(screen.getByText('Campo obligatorio')).toBeTruthy();
    expect(textarea.getAttribute('aria-invalid')).toBe('true');
  });

  it('emits value changes', async () => {
    const changed = vi.fn();

    await render('<app-textarea label="Descripcion" (valueChange)="changed($event)" />', {
      imports: [Textarea],
      componentProperties: {
        changed,
      },
    });

    fireEvent.input(screen.getByLabelText('Descripcion'), { target: { value: 'Nuevo texto' } });

    expect(changed).toHaveBeenCalledWith('Nuevo texto');
  });

  it('applies floating variant classes', async () => {
    const { container } = await render(
      '<app-textarea label="Descripcion" variant="violet" fill="outline" appearance="minimal" labelPlacement="floating" />',
      {
        imports: [Textarea],
      },
    );

    const field = container.querySelector('.textarea-field');
    expect(field?.className).toContain('textarea-field--floating');
    expect(field?.className).toContain('textarea-field--outline');
    expect(field?.className).toContain('textarea-field--minimal');
    expect(field?.className).toContain('textarea-field--violet');
  });
});
