import { fireEvent, render, screen } from '@testing-library/angular';
import { Input } from './input';

describe('Input', () => {
  it('renders a labelled input', async () => {
    await render('<app-input label="Email" />', {
      imports: [Input],
    });

    expect(screen.getByLabelText('Email')).toBeTruthy();
  });

  it('uses a custom id when provided', async () => {
    await render('<app-input id="email-field" label="Email" hint="Introduce tu email" />', {
      imports: [Input],
    });

    const input = screen.getByLabelText('Email');
    expect(input.getAttribute('id')).toBe('email-field');
    expect(input.getAttribute('aria-describedby')).toBe('email-field-hint');
    expect(screen.getByText('Introduce tu email').getAttribute('id')).toBe('email-field-hint');
  });

  it('renders hint text', async () => {
    await render('<app-input label="Email" hint="Introduce tu email" />', {
      imports: [Input],
    });

    expect(screen.getByText('Introduce tu email')).toBeTruthy();
  });

  it('renders error state', async () => {
    await render('<app-input label="Email" error="Email invalido" />', {
      imports: [Input],
    });

    const input = screen.getByLabelText('Email');
    expect(screen.getByText('Email invalido')).toBeTruthy();
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  it('emits value changes', async () => {
    const changed = vi.fn();

    await render('<app-input label="Email" (valueChange)="changed($event)" />', {
      imports: [Input],
      componentProperties: {
        changed,
      },
    });

    fireEvent.input(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });

    expect(changed).toHaveBeenCalledWith('test@example.com');
  });

  it('applies outline and disabled styles', async () => {
    await render('<app-input label="Email" fill="outline" appearance="minimal" disabled />', {
      imports: [Input],
    });

    const input = screen.getByLabelText('Email');
    expect(input.className).toContain('input-field__control--outline');
    expect(input.className).toContain('input-field__control--minimal');
    expect(input.className).toContain('input-field__control--primary');
    expect(input.hasAttribute('disabled')).toBe(true);
  });

  it('marks floating outline fields with variant classes', async () => {
    const { container } = await render('<app-input label="Email" variant="violet" fill="outline" labelPlacement="floating" />', {
      imports: [Input],
    });

    const field = container.querySelector('.input-field');
    expect(field?.className).toContain('input-field--floating');
    expect(field?.className).toContain('input-field--outline');
    expect(field?.className).toContain('input-field--violet');
    expect(screen.getByLabelText('Email').className).toContain('input-field__control--violet');
  });

  it('keeps solid focus without a visible border tint', async () => {
    await render('<app-input label="Email" fill="solid" />', {
      imports: [Input],
    });

    const input = screen.getByLabelText('Email');
    expect(input.className).toContain('input-field__control--solid');
    expect(input.className).toContain('input-field__control--primary');
    expect(input.className).not.toContain('input-field__control--outline');
  });

  it('supports native text length constraints', async () => {
    await render('<app-input label="Nombre" [minLength]="3" [maxLength]="40" />', {
      imports: [Input],
    });

    const input = screen.getByLabelText('Nombre');
    expect(input.getAttribute('minlength')).toBe('3');
    expect(input.getAttribute('maxlength')).toBe('40');
  });

  it('supports native autocomplete', async () => {
    await render('<app-input label="Email" autocomplete="email" />', {
      imports: [Input],
    });

    expect(screen.getByLabelText('Email').getAttribute('autocomplete')).toBe('email');
  });

  it('supports native number constraints', async () => {
    await render('<app-input label="Cantidad" type="number" [min]="1" [max]="10" [step]="0.5" />', {
      imports: [Input],
    });

    const input = screen.getByLabelText('Cantidad');
    expect(input.getAttribute('min')).toBe('1');
    expect(input.getAttribute('max')).toBe('10');
    expect(input.getAttribute('step')).toBe('0.5');
  });
});
