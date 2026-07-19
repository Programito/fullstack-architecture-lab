import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastViewport } from './shared/ui/toast/toast';
import { APP_VERSION } from './app.version';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastViewport],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly version = APP_VERSION;
  protected readonly androidReleaseUrl =
    'https://github.com/Programito/fullstack-architecture-lab/releases/latest';
}
