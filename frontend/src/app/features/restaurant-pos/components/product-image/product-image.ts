import { Component, computed, input, signal } from '@angular/core';
import { Icon } from '../../../../shared/ui/icon/icon';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';

type ProductImageState = 'loading' | 'loaded' | 'error';

@Component({
  selector: 'app-product-image',
  imports: [Icon, Skeleton],
  templateUrl: './product-image.html',
  styleUrl: './product-image.css',
})
export class ProductImage {
  readonly imageUrl = input<string | null | undefined>(null);
  readonly alt = input('');
  readonly shape = input<'square' | 'circle'>('square');
  readonly size = input<'sm' | 'md' | 'lg'>('md');

  private readonly states = signal(new Map<string, ProductImageState>());

  protected readonly state = computed(() => {
    const url = this.imageUrl();
    return url ? (this.states().get(url) ?? 'loading') : 'error';
  });

  protected readonly dimension = computed(() => ({ sm: '2.5rem', md: '3rem', lg: '6rem' })[this.size()]);

  protected markLoaded(): void {
    this.setState('loaded');
  }

  protected markFailed(): void {
    this.setState('error');
  }

  private setState(state: ProductImageState): void {
    const url = this.imageUrl();

    if (!url) {
      return;
    }

    this.states.update((states) => new Map(states).set(url, state));
  }
}
