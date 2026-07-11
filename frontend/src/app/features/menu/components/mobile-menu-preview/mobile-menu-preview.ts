import { CurrencyPipe } from '@angular/common';
import { CdkDrag, type CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { booleanAttribute, Component, computed, effect, ElementRef, inject, input, output, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Icon } from '../../../../shared/ui/icon/icon';

export type MobileMenuPreviewProduct = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  priceEuros: number;
  available: boolean;
  allergenLabels: string[];
};

export type MobileMenuPreviewSection = {
  id: string;
  name: string;
  products: MobileMenuPreviewProduct[];
};

export type MobileMenuPreviewProductsReorder = {
  sectionId: string;
  orderedProductIds: string[];
};

/**
 * Réplica visual (Angular/CSS) de la pantalla de carta de la app cliente Android
 * (`mobile/.../feature/menu/MenuScreen.kt`, Kotlin Compose) — no es un embed de Compose, sino un
 * "espejo" fiel al layout y a la paleta reales (`core/designsystem/Color.kt`), pensado para dar
 * una vista previa en vivo mientras se gestiona la carta en el admin web.
 *
 * Fidelidad respecto a MenuScreen.kt: cabecera (nombre de carta en primary + mesa + icono de
 * ajustes), buscador tipo OutlinedTextField con botón de filtro de alérgenos al lado, fila de
 * FilterChips de Material 3 con el chip "Todo" primero, tarjetas `MenuItemCard` (imagen 72dp,
 * nombre 1 línea, descripción 2 líneas, precio o "Agotado" en error, badge "Contiene: …" con
 * icono de aviso, alpha 0.5 si está agotado) y FAB extendido de carrito abajo a la derecha.
 * El marco simula un móvil real: cámara perforada, botones laterales y barra de gesto inferior.
 *
 * Los chips de categoría son interactivos como en la app real: tocar uno filtra la lista a esa
 * sección ("Todo" vuelve a mostrarlas todas). La selección del usuario tiene prioridad sobre el
 * input `activeSectionId` (que actúa como filtro inicial, p. ej. en el editor de producto).
 *
 * Con `reorderable`, las secciones y los productos se reordenan arrastrando su asa (⋮⋮) — el asa
 * dedicada evita el conflicto con el scroll táctil en móvil. El componente solo emite el nuevo
 * orden (`sectionsReordered` / `productsReordered`) y es el padre quien lo persiste, de modo que
 * lo que ves aquí es exactamente el orden que verá el cliente en la app.
 *
 * Cuando cambia el producto resaltado (`highlightProductId`), la pantalla simulada hace scroll
 * para mantener su tarjeta a la vista (solo se desplaza el contenedor interno, nunca la página).
 */
@Component({
  selector: 'app-mobile-menu-preview',
  imports: [CdkDrag, CdkDragHandle, CdkDropList, CurrencyPipe, Icon, TranslocoPipe],
  templateUrl: './mobile-menu-preview.html',
  styleUrl: './mobile-menu-preview.css',
})
export class MobileMenuPreview {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly menuName = input('');
  readonly tableLabel = input('');
  readonly sections = input<MobileMenuPreviewSection[]>([]);
  readonly activeSectionId = input<string | null>(null);
  readonly highlightProductId = input<string | null>(null);
  readonly reorderable = input(false, { transform: booleanAttribute });

  readonly sectionsReordered = output<string[]>();
  readonly productsReordered = output<MobileMenuPreviewProductsReorder>();

  // Chip elegido por el usuario dentro de la preview; `undefined` = aún no ha tocado ninguno
  // (se respeta entonces el input activeSectionId).
  private readonly pickedSectionId = signal<string | null | undefined>(undefined);

  protected readonly effectiveSectionId = computed<string | null>(() => {
    const picked = this.pickedSectionId();
    return picked === undefined ? this.activeSectionId() : picked;
  });

  // Búsqueda por texto como en la app real (sin tildes, sobre nombre y descripción).
  protected readonly searchQuery = signal('');
  protected readonly hasSearch = computed(() => this.searchQuery().trim().length > 0);

  protected readonly visibleSections = computed(() => {
    const sectionId = this.effectiveSectionId();
    const sections = this.sections();
    const bySection = sectionId ? sections.filter((section) => section.id === sectionId) : sections;

    const query = normalizeText(this.searchQuery());
    if (!query) return bySection;

    return bySection
      .map((section) => ({
        ...section,
        products: section.products.filter(
          (product) =>
            normalizeText(product.name).includes(query) ||
            normalizeText(product.description ?? '').includes(query),
        ),
      }))
      .filter((section) => section.products.length > 0);
  });

  constructor() {
    effect(() => {
      // Releer las señales aquí registra la dependencia; el scroll se hace tras pintar.
      this.highlightProductId();
      this.visibleSections();
      setTimeout(() => this.scrollHighlightIntoView());
    });
  }

  protected selectSection(sectionId: string | null): void {
    this.pickedSectionId.set(sectionId);
  }

  protected updateSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  protected isHighlighted(product: MobileMenuPreviewProduct): boolean {
    return this.highlightProductId() !== null && product.id === this.highlightProductId();
  }

  protected trackSection(_index: number, section: MobileMenuPreviewSection): string {
    return section.id;
  }

  protected trackProduct(_index: number, product: MobileMenuPreviewProduct): string {
    return product.id;
  }

  protected handleSectionDrop(event: CdkDragDrop<MobileMenuPreviewSection[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    const orderedIds = this.visibleSections().map((section) => section.id);
    moveItemInArray(orderedIds, event.previousIndex, event.currentIndex);
    this.sectionsReordered.emit(orderedIds);
  }

  protected handleProductDrop(section: MobileMenuPreviewSection, event: CdkDragDrop<MobileMenuPreviewProduct[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    const orderedProductIds = section.products.map((product) => product.id);
    moveItemInArray(orderedProductIds, event.previousIndex, event.currentIndex);
    this.productsReordered.emit({ sectionId: section.id, orderedProductIds });
  }

  private scrollHighlightIntoView(): void {
    const container = this.host.nativeElement.querySelector<HTMLElement>('.mobile-preview-screen');
    const card = container?.querySelector<HTMLElement>('.mobile-preview-card--highlight');
    if (!container || !card) return;

    const containerRect = container.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const isAbove = cardRect.top < containerRect.top;
    const isBelow = cardRect.bottom > containerRect.bottom;
    if (!isAbove && !isBelow) return;

    const offset = cardRect.top - containerRect.top - (containerRect.height - cardRect.height) / 2;
    container.scrollTo({ top: container.scrollTop + offset, behavior: 'smooth' });
  }
}

/** Normaliza para buscar: minúsculas y sin tildes, igual que hace la app cliente. */
function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
