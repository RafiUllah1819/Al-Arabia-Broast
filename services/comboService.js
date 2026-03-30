import {
  getComboItems,
  addComboItem           as repoAdd,
  updateComboItemQuantity,
  removeComboItem        as repoRemove,
  isProductInCombo,
  isComboOnlyItemInCombo,
} from "../repositories/comboRepository";

export function listComboItems(comboId) {
  return getComboItems(comboId);
}

export async function addItemToCombo({ combo_id, product_id, variant_id, combo_only_item_id, quantity }) {
  if (!combo_id) throw new Error("Combo product is required.");

  // Validate: exactly one item source must be provided
  if (!product_id && !combo_only_item_id) {
    throw new Error("Either a product or a combo-only item is required.");
  }

  if (combo_only_item_id) {
    // Adding a combo-only item
    const cid = parseInt(combo_only_item_id);
    if (await isComboOnlyItemInCombo(combo_id, cid)) {
      throw new Error("This item is already in the combo.");
    }
    return repoAdd({ combo_id, combo_only_item_id: cid, quantity: quantity || 1 });
  }

  // Adding a regular product / variant
  if (combo_id === product_id) throw new Error("A combo cannot include itself.");
  const vid = variant_id ? parseInt(variant_id) : null;

  if (await isProductInCombo(combo_id, product_id, vid)) {
    throw new Error(
      vid ? "This variant is already in the combo." : "This product is already in the combo."
    );
  }

  return repoAdd({ combo_id, product_id, variant_id: vid, quantity: quantity || 1 });
}

export function updateItemQuantity(id, quantity) {
  if (!quantity || quantity < 1) throw new Error("Quantity must be at least 1.");
  return updateComboItemQuantity(id, quantity);
}

export function removeItemFromCombo(id) {
  return repoRemove(id);
}
