import { Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-service-summary',
  imports: [TranslocoPipe],
  templateUrl: './service-summary.html',
})
export class ServiceSummary {
  readonly occupiedTables = input.required<number>();
  readonly totalTables = input.required<number>();
  readonly kitchenQueue = input.required<number>();
  readonly salesToday = input.required<string>();
}
