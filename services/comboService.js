import {
  getComboItems,
  addComboItem    as repoAdd,
  updateComboItemQuantity,
  removeComboItem as repoRemove,
  isProductInCombo,
} from "../repositories/comboRepository";

export function listComboItems(comboId) {
  return getComboItems(comboId);
}

export async function addItemToCombo({ combo_id, product_id, quantity }) {
  if (!combo_id)   throw new Error("Combo product is required.");
  if (!product_id) throw new Error("Product to add is required.");
  if (combo_id === product_id) throw new Error("A combo cannot include itself.");

  if (await isProductInCombo(combo_id, product_id)) {
    throw new Error("This product is already in the combo.");
  }

  return repoAdd({ combo_id, product_id, quantity: quantity || 1 });
}

export function updateItemQuantity(id, quantity) {
  if (!quantity || quantity < 1) throw new Error("Quantity must be at least 1.");
  return updateComboItemQuantity(id, quantity);
}

export function removeItemFromCombo(id) {
  return repoRemove(id);
}
