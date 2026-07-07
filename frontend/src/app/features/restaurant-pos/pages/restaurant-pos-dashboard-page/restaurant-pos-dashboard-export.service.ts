import { Injectable } from '@angular/core';

import {
  exportRestaurantAnalyticsWorkbook,
  triggerRestaurantAnalyticsWorkbookDownload,
  WORKBOOK_EXPORT_FILE_EXTENSIONS,
  type ExportRestaurantAnalyticsWorkbookInput,
  type WorkbookExportFormat,
} from './restaurant-pos-dashboard-export';

/**
 * Thin Angular-injectable wrapper around the plain export functions in
 * `restaurant-pos-dashboard-export.ts`.
 *
 * The Angular CLI's vitest builder does not support `vi.mock()` for
 * relative imports (it only allows mocking package imports), so tests
 * cannot mock `./restaurant-pos-dashboard-export` directly. Wrapping it as
 * an injectable service lets specs swap it out via `TestBed`/`providers`
 * instead, which is the supported way to fake dependencies here.
 */
@Injectable({ providedIn: 'root' })
export class RestaurantAnalyticsExportService {
  readonly fileExtensions = WORKBOOK_EXPORT_FILE_EXTENSIONS;

  export(input: ExportRestaurantAnalyticsWorkbookInput): Promise<Blob> {
    return exportRestaurantAnalyticsWorkbook(input);
  }

  triggerDownload(filename: string, blob: Blob): void {
    triggerRestaurantAnalyticsWorkbookDownload(filename, blob);
  }
}

export type { WorkbookExportFormat };
