import { fireEvent, render, screen } from '@testing-library/angular';
import { FileUpload } from './file-upload';

describe('FileUpload', () => {
  it('selects files from the native input', async () => {
    const filesChange = vi.fn();
    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });

    await render('<app-file-upload label="Archivo" (filesChange)="filesChange($event)" />', {
      imports: [FileUpload],
      componentProperties: { filesChange },
    });

    fireEvent.change(screen.getByLabelText('Archivo'), { target: { files: [file] } });

    expect(filesChange).toHaveBeenCalledWith([file]);
    expect(screen.getByText('hello.txt')).toBeTruthy();
  });

  it('removes a selected file', async () => {
    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });
    const filesChange = vi.fn();

    await render('<app-file-upload label="Archivo" [files]="files" (filesChange)="filesChange($event)" />', {
      imports: [FileUpload],
      componentProperties: { files: [file], filesChange },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar hello.txt' }));

    expect(filesChange).toHaveBeenCalledWith([]);
  });

  it('rejects files over maxSize', async () => {
    const rejected = vi.fn();
    const file = new File(['too-large'], 'large.txt', { type: 'text/plain' });

    await render('<app-file-upload label="Archivo" [maxSize]="1" (rejected)="rejected($event)" />', {
      imports: [FileUpload],
      componentProperties: { rejected },
    });

    fireEvent.change(screen.getByLabelText('Archivo'), { target: { files: [file] } });

    expect(rejected).toHaveBeenCalledWith({ file, reason: 'max-size' });
  });

  it('rejects files over maxFiles', async () => {
    const rejected = vi.fn();
    const first = new File(['a'], 'a.txt', { type: 'text/plain' });
    const second = new File(['b'], 'b.txt', { type: 'text/plain' });

    await render('<app-file-upload label="Archivo" multiple [maxFiles]="1" (rejected)="rejected($event)" />', {
      imports: [FileUpload],
      componentProperties: { rejected },
    });

    fireEvent.change(screen.getByLabelText('Archivo'), { target: { files: [first, second] } });

    expect(rejected).toHaveBeenCalledWith({ file: second, reason: 'max-files' });
  });

  it('uses an accessible native file input', async () => {
    await render('<app-file-upload label="Archivo" hint="Sube un archivo" />', {
      imports: [FileUpload],
    });

    const input = screen.getByLabelText('Archivo');

    expect(input.getAttribute('type')).toBe('file');
    expect(input.getAttribute('aria-describedby')).toContain('-hint');
  });
});
