import { render, screen } from '@testing-library/angular';
import { FormField } from './form-field';

describe('FormField', () => {
  it('renders a label connected to the projected control', async () => {
    await render('<app-form-field controlId="email" label="Email"><input id="email" /></app-form-field>', {
      imports: [FormField],
    });

    expect(screen.getByLabelText('Email')).toBeTruthy();
  });

  it('renders hint with a predictable id', async () => {
    await render('<app-form-field controlId="email" label="Email" hint="Introduce tu email"><input id="email" /></app-form-field>', {
      imports: [FormField],
    });

    expect(screen.getByText('Introduce tu email').getAttribute('id')).toBe('email-hint');
  });

  it('renders error instead of hint', async () => {
    await render(
      '<app-form-field controlId="email" label="Email" hint="Ayuda" error="Email invalido"><input id="email" /></app-form-field>',
      {
        imports: [FormField],
      },
    );

    expect(screen.getByText('Email invalido').getAttribute('id')).toBe('email-error');
    expect(screen.queryByText('Ayuda')).toBeNull();
  });
});
