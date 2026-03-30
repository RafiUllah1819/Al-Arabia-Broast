import {
  getVariantsByProduct,
  createVariant as repoCreate,
  updateVariant as repoUpdate,
  setVariantAvailable,
  setVariantActive,
  deleteVariant as repoDelete,
} from "../repositories/variantRepository";

export function listVariants(productId) {
  return getVariantsByProduct(productId);
}

export async function createVariant({ product_id, name, price, sort_order }) {
  if (!product_id)    throw new Error("Product is required.");
  if (!name?.trim())  throw new Error("Variant name is required.");
  if (price === undefined || price === "" || isNaN(parseFloat(price))) {
    throw new Error("A valid price is required.");
  }
  if (parseFloat(price) < 0) throw new Error("Price cannot be negative.");

  return repoCreate({ product_id, name: name.trim(), price, sort_order });
}

export async function updateVariant(id, { name, price, sort_order }) {
  if (!name?.trim()) throw new Error("Variant name is required.");
  if (price === undefined || price === "" || isNaN(parseFloat(price))) {
    throw new Error("A valid price is required.");
  }
  if (parseFloat(price) < 0) throw new Error("Price cannot be negative.");

  return repoUpdate(id, { name: name.trim(), price, sort_order });
}

export function toggleVariantAvailable(id, isAvailable) {
  return setVariantAvailable(id, isAvailable);
}

export function toggleVariantActive(id, isActive) {
  return setVariantActive(id, isActive);
}

export function deleteVariant(id) {
  return repoDelete(id);
}
