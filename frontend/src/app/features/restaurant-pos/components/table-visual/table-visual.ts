import { Component, input } from '@angular/core';
import type { TableShape } from '../../models/restaurant-pos.models';

@Component({
  selector: 'app-table-visual',
  templateUrl: './table-visual.html',
})
export class TableVisual {
  readonly shape = input<TableShape>('rectangle');
  readonly selected = input(false);

  protected svgClass(): string {
    return [
      'h-full w-full drop-shadow-md transition',
      this.selected() ? 'opacity-100 saturate-150' : 'opacity-95',
    ].join(' ');
  }

  protected variant(): TableShape {
    return this.shape();
  }
}
