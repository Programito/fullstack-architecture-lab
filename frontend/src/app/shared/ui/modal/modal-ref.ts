import { Observable, Subject } from 'rxjs';

export class ModalRef<TResult = unknown> {
  private readonly closedSubject = new Subject<TResult | undefined>();
  private hasClosed = false;
  private closeHandler: ((result?: TResult) => void) | null = null;

  readonly closed: Observable<TResult | undefined> = this.closedSubject.asObservable();

  close(result?: TResult): void {
    if (this.hasClosed) {
      return;
    }

    this.hasClosed = true;
    this.closeHandler?.(result);
    this.closedSubject.next(result);
    this.closedSubject.complete();
  }

  setCloseHandler(handler: (result?: TResult) => void): void {
    this.closeHandler = handler;
  }
}
