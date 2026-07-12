import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Icon } from '../icon/icon';

@Component({
  selector: 'app-back-link',
  imports: [RouterLink, Icon],
  templateUrl: './back-link.html',
  styleUrl: './back-link.css',
})
export class BackLink {
  readonly label = input('');
  readonly routerLink = input<string | readonly string[]>('/');

  protected readonly classes = computed(() =>
    [
      'back-link__anchor',
      'inline-flex items-center justify-center gap-2 border font-medium transition',
      'button--minimal',
      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
      'cursor-pointer rounded-md h-10 px-4 text-sm',
      'button--neutral-clear',
    ].join(' '),
  );
}
