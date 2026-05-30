import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ToastViewport } from './shared/ui/toast/toast';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TranslocoPipe, ToastViewport],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly toolKeys = ['tailwind', 'vitest', 'testingLibrary', 'playwright'];
}
