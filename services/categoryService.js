import {
  getAllCategories,
  createCategory as repoCreate,
  updateCategory as repoUpdate,
  setCategoryActive,
  isCategoryNameTaken,
} from "../repositories/categoryRepository";

export function listCategories() {
  return getAllCategories();
}

export async function createCategory({ name, sort_order }) {
  if (!name?.trim()) throw new Error("Category name is required.");

  const order = parseInt(sort_order) || 0;

  if (await isCategoryNameTaken(name.trim())) {
    throw new Error("A category with this name already exists.");
  }

  return repoCreate({ name: name.trim(), sort_order: order });
}

export async function updateCategory(id, { name, sort_order }) {
  if (!name?.trim()) throw new Error("Category name is required.");

  const order = parseInt(sort_order) || 0;

  if (await isCategoryNameTaken(name.trim(), id)) {
    throw new Error("A category with this name already exists.");
  }

  return repoUpdate(id, { name: name.trim(), sort_order: order });
}

export function toggleCategoryActive(id, isActive) {
  return setCategoryActive(id, isActive);
}
