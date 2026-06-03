import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastViewport } from './shared/ui/toast/toast';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastViewport],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
