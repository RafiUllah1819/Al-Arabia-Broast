import {
  getAllProducts,
  createProduct as repoCreate,
  updateProduct as repoUpdate,
  setProductAvailable,
  setProductActive,
  isSlugTaken,
} from "../repositories/productRepository";

const VALID_TYPES = ["simple", "variant", "combo"];

function toSlug(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function uniqueSlug(base, excludeId = null) {
  let candidate = base;
  let counter   = 2;
  while (await isSlugTaken(candidate, excludeId)) {
    candidate = `${base}-${counter}`;
    counter++;
  }
  return candidate;
}

export function listProducts(filters) {
  return getAllProducts(filters);
}

export async function createProduct(data) {
  const { name, barcode, description, category_id, type, base_price, image_url, is_available, is_active, is_kitchen_item, sort_order } = data;
  let   { slug } = data;

  if (!name?.trim())               throw new Error("Product name is required.");
  if (!VALID_TYPES.includes(type)) throw new Error("Invalid product type.");
  if (!image_url?.trim())          throw new Error("Product image URL is required.");
  if (type === "simple" && (base_price === undefined || base_price === "" || base_price === null)) {
    throw new Error("Base price is required for simple products.");
  }
  if (type === "simple" && isNaN(parseFloat(base_price))) {
    throw new Error("Base price must be a valid number.");
  }
  if (type === "combo" && (base_price === undefined || base_price === "" || base_price === null)) {
    throw new Error("Combo selling price is required.");
  }
  if (type === "combo" && isNaN(parseFloat(base_price))) {
    throw new Error("Combo selling price must be a valid number.");
  }

  const baseSlug  = toSlug(slug?.trim() || name.trim());
  const finalSlug = await uniqueSlug(baseSlug);

  return repoCreate({
    category_id:  category_id || null,
    name:         name.trim(),
    slug:         finalSlug,
    barcode:      barcode?.trim() || null,
    description:  description?.trim() || null,
    type,
    base_price:   (type === "simple" || type === "combo") ? parseFloat(base_price) : null,
    image_url:    image_url.trim(),
    is_available:    is_available    !== false,
    is_active:       is_active       !== false,
    is_kitchen_item: is_kitchen_item !== false,
    sort_order:      parseInt(sort_order) || 0,
  });
}

export async function updateProduct(id, data) {
  const { name, barcode, description, category_id, type, base_price, image_url, is_available, is_active, is_kitchen_item, sort_order } = data;
  let   { slug } = data;

  if (!name?.trim())               throw new Error("Product name is required.");
  if (!VALID_TYPES.includes(type)) throw new Error("Invalid product type.");
  if (!image_url?.trim())          throw new Error("Product image URL is required.");
  if (type === "simple" && (base_price === undefined || base_price === "" || base_price === null)) {
    throw new Error("Base price is required for simple products.");
  }
  if (type === "simple" && isNaN(parseFloat(base_price))) {
    throw new Error("Base price must be a valid number.");
  }
  if (type === "combo" && (base_price === undefined || base_price === "" || base_price === null)) {
    throw new Error("Combo selling price is required.");
  }
  if (type === "combo" && isNaN(parseFloat(base_price))) {
    throw new Error("Combo selling price must be a valid number.");
  }

  const baseSlug  = toSlug(slug?.trim() || name.trim());
  const finalSlug = await uniqueSlug(baseSlug, id);

  return repoUpdate(id, {
    category_id:  category_id || null,
    name:         name.trim(),
    slug:         finalSlug,
    barcode:      barcode?.trim() || null,
    description:  description?.trim() || null,
    type,
    base_price:   (type === "simple" || type === "combo") ? parseFloat(base_price) : null,
    image_url:    image_url.trim(),
    is_available:    Boolean(is_available),
    is_active:       Boolean(is_active),
    is_kitchen_item: is_kitchen_item !== false,
    sort_order:      parseInt(sort_order) || 0,
  });
}

export function toggleProductAvailable(id, isAvailable) {
  return setProductAvailable(id, isAvailable);
}

export function toggleProductActive(id, isActive) {
  return setProductActive(id, isActive);
}
