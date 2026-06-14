import { inject, Injectable } from '@angular/core';
import { MenuMockService, MOCK_MENU_PRODUCTS, MOCK_MODIFIER_GROUPS } from './menu-mock.service';
import type { ComboProductDefinition, ComboSlotSelection, ModifierGroup, Product, SelectedModifier } from '../models/menu.models';

@Injectable({ providedIn: 'root' })
export class MenuPricingService {
  private readonly menu = inject(MenuMockService);

  getProductModifierGroups(productId: string): ModifierGroup[] {
    const product = this.menu.products().find((currentProduct) => currentProduct.id === productId) ?? MOCK_MENU_PRODUCTS.find((currentProduct) => currentProduct.id === productId);
    return product ? this.getModifierGroupsForProduct(product) : [];
  }

  getModifierGroupsForProduct(product: Product): ModifierGroup[] {
    const modifierGroups = this.menu.modifierGroups?.() ?? MOCK_MODIFIER_GROUPS;
    return product.modifierGroupIds
      .map((groupId) => modifierGroups.find((group) => group.id === groupId))
      .filter((group): group is ModifierGroup => !!group);
  }

  buildSelectedModifiers(product: Product, selectedModifierOptionIds: string[]): SelectedModifier[] {
    const selectedIds = new Set(selectedModifierOptionIds);

    return this.getModifierGroupsForProduct(product).flatMap((group) =>
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

  private roundCurrency(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private comboSlotProductKey(slotId: string, productId: string): string {
    return `${slotId}:${productId}`;
  }
}
