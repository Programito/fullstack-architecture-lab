import { fireEvent, render, screen } from '@testing-library/angular';
import { OtpInput } from './otp-input';

describe('OtpInput', () => {
  it('writes character by character', async () => {
    const valueChange = vi.fn();

    await render('<app-otp-input label="Codigo" [length]="4" (valueChange)="valueChange($event)" />', {
      imports: [OtpInput],
      componentProperties: { valueChange },
    });

    fireEvent.input(screen.getByLabelText('Codigo 1'), { target: { value: '1' } });
    fireEvent.input(screen.getByLabelText('Codigo 2'), { target: { value: '2' } });

    expect(valueChange).toHaveBeenLastCalledWith('12');
  });

  it('pastes a complete code', async () => {
    const valueChange = vi.fn();

    await render('<app-otp-input label="Codigo" [length]="4" (valueChange)="valueChange($event)" />', {
      imports: [OtpInput],
      componentProperties: { valueChange },
    });

    fireEvent.paste(screen.getByLabelText('Codigo 1'), {
      clipboardData: { getData: () => '1234' },
    });

    expect(valueChange).toHaveBeenCalledWith('1234');
  });

  it('moves focus back on backspace from an empty cell', async () => {
    await render('<app-otp-input label="Codigo" [length]="4" />', {
      imports: [OtpInput],
    });

    const first = screen.getByLabelText('Codigo 1') as HTMLInputElement;
    const second = screen.getByLabelText('Codigo 2') as HTMLInputElement;

    second.focus();
    fireEvent.keyDown(second, { key: 'Backspace' });

    expect(document.activeElement).toBe(first);
  });

  it('emits completed when all cells are filled', async () => {
    const completed = vi.fn();

    await render('<app-otp-input label="Codigo" [length]="4" (completed)="completed($event)" />', {
      imports: [OtpInput],
      componentProperties: { completed },
    });

    fireEvent.paste(screen.getByLabelText('Codigo 1'), {
      clipboardData: { getData: () => '1234' },
    });

    expect(completed).toHaveBeenCalledWith('1234');
  });
});
