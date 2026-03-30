import {
  getAllTables,
  createTable,
  updateTable,
  setTableStatus,
  setTableActive,
} from "../repositories/tableRepository";

const VALID_STATUSES = ["available", "occupied", "reserved"];

export function listTables(opts) {
  return getAllTables(opts);
}

function validateTableData({ name, capacity, status }) {
  if (!name?.trim()) throw Object.assign(new Error("Table name is required."), { status: 400 });
  if (capacity != null && (isNaN(parseInt(capacity)) || parseInt(capacity) < 1)) {
    throw Object.assign(new Error("Capacity must be a positive number."), { status: 400 });
  }
  if (status && !VALID_STATUSES.includes(status)) {
    throw Object.assign(new Error("Invalid table status."), { status: 400 });
  }
}

export function createTableRecord(data) {
  const { name, capacity, status, is_active } = data;
  validateTableData(data);
  return createTable({
    name:      name.trim(),
    capacity:  capacity ? parseInt(capacity) : 4,
    status:    status || "available",
    is_active: is_active !== false,
  });
}

export function updateTableRecord(id, data) {
  const { name, capacity, status, is_active } = data;
  validateTableData(data);
  return updateTable(id, {
    name:      name.trim(),
    capacity:  capacity ? parseInt(capacity) : 4,
    status:    status || "available",
    is_active: Boolean(is_active),
  });
}

export function changeTableStatus(id, status) {
  if (!VALID_STATUSES.includes(status)) {
    throw Object.assign(new Error("Invalid table status."), { status: 400 });
  }
  return setTableStatus(id, status);
}

export function toggleTableActive(id, is_active) {
  return setTableActive(id, is_active);
}
