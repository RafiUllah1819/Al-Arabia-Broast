import {
  getAllComboOnlyItems,
  createComboOnlyItem  as repoCreate,
  updateComboOnlyItem  as repoUpdate,
  deleteComboOnlyItem  as repoDelete,
} from "../repositories/comboOnlyItemRepository";

export function listComboOnlyItems() {
  return getAllComboOnlyItems();
}

export function createComboOnlyItem({ name, sort_order }) {
  if (!name?.trim()) throw new Error("Item name is required.");
  return repoCreate({ name, sort_order });
}

export function updateComboOnlyItem(id, { name, sort_order }) {
  if (!name?.trim()) throw new Error("Item name is required.");
  return repoUpdate(id, { name, sort_order });
}

export function deleteComboOnlyItem(id) {
  return repoDelete(id);
}
