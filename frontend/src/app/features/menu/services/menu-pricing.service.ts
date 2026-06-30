import { Injectable } from '@angular/core';
import type { ComboProductDefinition, ComboSlotSelection, ModifierGroup, Product, SelectedModifier } from '../models/menu.models';

interface CustomizationSummaryLabels {
  add: string;
  remove: string;
  choose: string;
  conjunction: string;
  oxfordComma?: boolean;
}

@Injectable({ providedIn: 'root' })
export class MenuPricingService {
  getModifierGroupsForProduct(product: Product, modifierGroups: ModifierGroup[]): ModifierGroup[] {
    return product.modifierGroupIds
      .map((groupId) => modifierGroups.find((group) => group.id === groupId))
      .filter((group): group is ModifierGroup => !!group);
  }

  buildSelectedModifiers(product: Product, selectedModifierOptionIds: string[], modifierGroups: ModifierGroup[]): SelectedModifier[] {
    const selectedIds = new Set(selectedModifierOptionIds);

    return this.getModifierGroupsForProduct(product, modifierGroups).flatMap((group) =>
      group.options
        .filter((option) => selectedIds.has(option.id))
        .map((option) => ({
          groupId: group.id,
          groupName: group.name,
          optionId: option.id,
          name: option.name,
          priceDelta: option.priceDelta,
          type: group.type,
        })),
    );
  }

  calculateCustomizedProductPrice(product: Product, selectedModifiers: SelectedModifier[]): number {
    return this.roundCurrency(product.basePrice + selectedModifiers.reduce((total, modifier) => total + modifier.priceDelta, 0));
  }

  calculateComboBasePrice(comboProduct: Product): number {
    return this.roundCurrency(comboProduct.basePrice);
  }

  calculateComboSlotSupplements(comboDefinition: ComboProductDefinition, slotSelections: ComboSlotSelection[]): number {
    const selectedSlotProducts = new Set(
      slotSelections.flatMap((selection) => selection.selectedProductIds.map((productId) => this.comboSlotProductKey(selection.slotId, productId))),
    );

    return this.roundCurrency(
      comboDefinition.supplements
        .filter((supplement) => selectedSlotProducts.has(this.comboSlotProductKey(supplement.slotId, supplement.productId)))
        .reduce((total, supplement) => total + supplement.supplementPrice, 0),
    );
  }

  calculateComboTotalPrice(comboProduct: Product, comboDefinition: ComboProductDefinition, slotSelections: ComboSlotSelection[]): number {
    return this.roundCurrency(this.calculateComboBasePrice(comboProduct) + this.calculateComboSlotSupplements(comboDefinition, slotSelections));
  }

  createComboConfigurationSignature(productId: string, slotSelections: ComboSlotSelection[]): string {
    const slots = slotSelections
      .map((selection) => ({
        slotId: selection.slotId,
        selectedProductIds: [...new Set(selection.selectedProductIds)].sort(),
      }))
      .sort((first, second) => first.slotId.localeCompare(second.slotId))
      .map((selection) => `slot:${selection.slotId}=${selection.selectedProductIds.join(',')}`)
      .join('|');

    return `combo:${productId}|${slots}`;
  }

  createConfigurationSignature(productId: string, selectedModifierOptionIds: string[] = [], kitchenNote = ''): string {
    const modifiers = [...new Set(selectedModifierOptionIds)].sort().join('|');
    const note = kitchenNote.trim().toLocaleLowerCase();
    return [productId, modifiers, note].join('::');
  }

  buildComboCompositionSummary(comboDefinition: ComboProductDefinition, products: Product[]): string {
    return comboDefinition.slots
      .map((slot) => products.find((product) => product.id === slot.defaultProductId)?.name ?? slot.name)
      .filter(Boolean)
      .join(' + ');
  }

  buildCustomizationSummary(
    product: Product,
    modifierGroups: ModifierGroup[],
    labels: CustomizationSummaryLabels = {
      add: 'Add',
      remove: 'Remove',
      choose: 'Choose',
      conjunction: 'or',
      oxfordComma: true,
    },
  ): string {
    return this.getModifierGroupsForProduct(product, modifierGroups)
      .map((group) => {
        if (group.type === 'single') {
          return `${labels.choose} ${group.name}`;
        }

        const optionNames = group.options.map((option) => option.name);
        if (!optionNames.length) return '';

        const action = group.type === 'remove' ? labels.remove : labels.add;
        return `${action} ${this.formatNaturalList(optionNames, labels.conjunction, labels.oxfordComma ?? false)}`;
      })
      .filter(Boolean)
      .join(' · ');
  }

  getMinimumVisibleUpgrade(
    product: Product,
    modifierGroups: ModifierGroup[],
    comboDefinition?: ComboProductDefinition,
  ): number | null {
    const modifierDeltas = this.getModifierGroupsForProduct(product, modifierGroups)
      .flatMap((group) => group.options.map((option) => option.priceDelta))
      .filter((priceDelta) => priceDelta > 0);
    const comboDeltas = comboDefinition?.supplements
      .map((supplement) => supplement.supplementPrice)
      .filter((priceDelta) => priceDelta > 0) ?? [];
    const deltas = [...modifierDeltas, ...comboDeltas];

    return deltas.length ? Math.min(...deltas) : null;
  }

  private roundCurrency(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private formatNaturalList(items: string[], conjunction: string, oxfordComma: boolean): string {
    if (items.length <= 1) return items[0] ?? '';
    if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;

    const separator = oxfordComma ? `, ${conjunction} ` : ` ${conjunction} `;
    return `${items.slice(0, -1).join(', ')}${separator}${items.at(-1)}`;
  }

  private comboSlotProductKey(slotId: string, productId: string): string {
    return `${slotId}:${productId}`;
  }
}
