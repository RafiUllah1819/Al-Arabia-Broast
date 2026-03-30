import {
  getAllAddonGroups,
  createAddonGroup  as repoCreateGroup,
  updateAddonGroup  as repoUpdateGroup,
  setAddonGroupActive,
  getItemsByGroup,
  createAddonItem   as repoCreateItem,
  updateAddonItem   as repoUpdateItem,
  setAddonItemAvailable,
  deleteAddonItem   as repoDeleteItem,
  getGroupsForProduct,
  linkGroupToProduct,
  unlinkGroupFromProduct,
} from "../repositories/addonRepository";

// ── Groups ────────────────────────────────────────────────────────────────────

export function listAddonGroups() {
  return getAllAddonGroups();
}

export async function createAddonGroup({ name, min_select, max_select }) {
  if (!name?.trim()) throw new Error("Group name is required.");
  return repoCreateGroup({ name: name.trim(), min_select, max_select });
}

export async function updateAddonGroup(id, { name, min_select, max_select }) {
  if (!name?.trim()) throw new Error("Group name is required.");
  return repoUpdateGroup(id, { name: name.trim(), min_select, max_select });
}

export function toggleAddonGroupActive(id, isActive) {
  return setAddonGroupActive(id, isActive);
}

// ── Items ─────────────────────────────────────────────────────────────────────

export function listAddonItems(groupId) {
  return getItemsByGroup(groupId);
}

export async function createAddonItem({ addon_group_id, name, price, sort_order }) {
  if (!addon_group_id)  throw new Error("Group is required.");
  if (!name?.trim())    throw new Error("Item name is required.");
  if (isNaN(parseFloat(price ?? 0))) throw new Error("Price must be a valid number.");

  return repoCreateItem({ addon_group_id, name: name.trim(), price: price ?? 0, sort_order });
}

export async function updateAddonItem(id, { name, price, sort_order }) {
  if (!name?.trim()) throw new Error("Item name is required.");
  if (isNaN(parseFloat(price ?? 0))) throw new Error("Price must be a valid number.");

  return repoUpdateItem(id, { name: name.trim(), price: price ?? 0, sort_order });
}

export function toggleAddonItemAvailable(id, isAvailable) {
  return setAddonItemAvailable(id, isAvailable);
}

export function deleteAddonItem(id) {
  return repoDeleteItem(id);
}

// ── Product ↔ Group linking ───────────────────────────────────────────────────

export function getProductAddonGroups(productId) {
  return getGroupsForProduct(productId);
}

export function linkAddonGroup(productId, groupId) {
  return linkGroupToProduct(productId, groupId);
}

export function unlinkAddonGroup(productId, groupId) {
  return unlinkGroupFromProduct(productId, groupId);
}
