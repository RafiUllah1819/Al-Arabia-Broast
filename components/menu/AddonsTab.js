import { useState, useEffect } from "react";

const EMPTY_GROUP = { name: "", min_select: "0", max_select: "1" };
const EMPTY_ITEM  = { name: "", price: "0", sort_order: "0" };

export default function AddonsTab({ isAdmin }) {
  const [groups,       setGroups]       = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [items,        setItems]        = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingItems, setLoadingItems]  = useState(false);

  // Group form state
  const [groupForm,    setGroupForm]    = useState(EMPTY_GROUP);
  const [editingGroup, setEditingGroup] = useState(null);
  const [groupError,   setGroupError]   = useState("");

  // Item form state
  const [itemForm,    setItemForm]    = useState(EMPTY_ITEM);
  const [editingItem, setEditingItem] = useState(null);
  const [itemError,   setItemError]   = useState("");

  useEffect(() => { fetchGroups(); }, []);

  useEffect(() => {
    if (selectedGroup) fetchItems(selectedGroup.id);
    else setItems([]);
  }, [selectedGroup]);

  async function fetchGroups() {
    setLoadingGroups(true);
    const res  = await fetch("/api/addon-groups");
    const data = await res.json();
    setGroups(data.groups || []);
    setLoadingGroups(false);
  }

  async function fetchItems(groupId) {
    setLoadingItems(true);
    const res  = await fetch(`/api/addon-items?group_id=${groupId}`);
    const data = await res.json();
    setItems(data.items || []);
    setLoadingItems(false);
  }

  // ── Group actions ──────────────────────────────────────────────────────────

  async function handleSaveGroup(e) {
    e.preventDefault();
    setGroupError("");
    const url    = editingGroup ? `/api/addon-groups/${editingGroup.id}` : "/api/addon-groups";
    const method = editingGroup ? "PUT" : "POST";
    const res    = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(groupForm),
    });
    const data = await res.json();
    if (!res.ok) { setGroupError(data.error); return; }

    if (editingGroup) {
      setGroups((prev) => prev.map((g) => (g.id === editingGroup.id ? { ...g, ...data.group } : g)));
      if (selectedGroup?.id === editingGroup.id) setSelectedGroup({ ...selectedGroup, ...data.group });
    } else {
      setGroups((prev) => [...prev, data.group]);
    }
    setEditingGroup(null);
    setGroupForm(EMPTY_GROUP);
  }

  async function handleToggleGroup(group) {
    const newVal = !group.is_active;
    const res    = await fetch(`/api/addon-groups/${group.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: newVal }),
    });
    if (res.ok) setGroups((prev) => prev.map((g) => (g.id === group.id ? { ...g, is_active: newVal } : g)));
  }

  // ── Item actions ───────────────────────────────────────────────────────────

  async function handleSaveItem(e) {
    e.preventDefault();
    setItemError("");
    const url    = editingItem ? `/api/addon-items/${editingItem.id}` : "/api/addon-items";
    const method = editingItem ? "PUT" : "POST";
    const body   = editingItem
      ? itemForm
      : { ...itemForm, addon_group_id: selectedGroup.id };

    const res  = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) { setItemError(data.error); return; }

    if (editingItem) {
      setItems((prev) => prev.map((i) => (i.id === editingItem.id ? { ...i, ...data.item } : i)));
    } else {
      setItems((prev) => [...prev, data.item]);
    }
    setEditingItem(null);
    setItemForm(EMPTY_ITEM);
  }

  async function handleToggleItem(item) {
    const newVal = !item.is_available;
    const res    = await fetch(`/api/addon-items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_available: newVal }),
    });
    if (res.ok) setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_available: newVal } : i)));
  }

  async function handleDeleteItem(id) {
    if (!confirm("Delete this add-on item?")) return;
    const res = await fetch(`/api/addon-items/${id}`, { method: "DELETE" });
    if (res.ok) setItems((prev) => prev.filter((i) => i.id !== id));
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "20px", alignItems: "start" }}>

      {/* Left: Groups panel */}
      <div>
        <div className="table-container">
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #eee", fontWeight: 600, fontSize: "13px" }}>
            Add-on Groups
          </div>

          {loadingGroups ? (
            <p style={{ padding: "16px", color: "#999", fontSize: "13px" }}>Loading...</p>
          ) : (
            groups.map((g) => (
              <div key={g.id}
                onClick={() => setSelectedGroup(g)}
                style={{
                  padding: "10px 16px",
                  cursor: "pointer",
                  background: selectedGroup?.id === g.id ? "#FEF0F3" : "transparent",
                  borderLeft: selectedGroup?.id === g.id ? "3px solid #EF476F" : "3px solid transparent",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "1px solid #f5f5f5",
                }}>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 500, color: g.is_active ? "#333" : "#aaa" }}>
                    {g.name}
                  </div>
                  <div style={{ fontSize: "11px", color: "#aaa" }}>
                    {g.min_select === 0 ? "Optional" : `Min ${g.min_select}`}
                    {" · "}
                    {g.max_select === 0 ? "Unlimited" : `Max ${g.max_select}`}
                  </div>
                </div>
                {isAdmin && (
                  <div style={{ display: "flex", gap: "4px" }}>
                    <button className="btn btn-sm btn-secondary"
                      onClick={(e) => { e.stopPropagation(); setEditingGroup(g); setGroupForm({ name: g.name, min_select: String(g.min_select), max_select: String(g.max_select) }); }}>
                      ✎
                    </button>
                  </div>
                )}
              </div>
            ))
          )}

          {groups.length === 0 && !loadingGroups && (
            <p style={{ padding: "16px", color: "#bbb", fontSize: "13px", textAlign: "center" }}>
              No groups yet.
            </p>
          )}
        </div>

        {/* Group form */}
        {isAdmin && (
          <form onSubmit={handleSaveGroup} style={{ marginTop: "12px" }}>
            <div className="table-container" style={{ padding: "14px" }}>
              <p style={{ fontSize: "11px", fontWeight: 600, color: "#888", marginBottom: "10px", textTransform: "uppercase" }}>
                {editingGroup ? "Edit Group" : "New Group"}
              </p>
              <div className="form-group">
                <input className="form-input" placeholder="Group name (e.g. Extras)"
                  value={groupForm.name} onChange={(e) => setGroupForm((p) => ({ ...p, name: e.target.value }))} required />
              </div>
              <div className="form-row" style={{ marginTop: "8px" }}>
                <div className="form-group">
                  <label className="form-label">Min select</label>
                  <input className="form-input" type="number" min="0"
                    value={groupForm.min_select} onChange={(e) => setGroupForm((p) => ({ ...p, min_select: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Max (0 = unlimited)</label>
                  <input className="form-input" type="number" min="0"
                    value={groupForm.max_select} onChange={(e) => setGroupForm((p) => ({ ...p, max_select: e.target.value }))} />
                </div>
              </div>
              {groupError && <p className="form-error" style={{ marginTop: "6px" }}>{groupError}</p>}
              <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                <button type="submit" className="btn btn-primary btn-sm">
                  {editingGroup ? "Save" : "+ Add Group"}
                </button>
                {editingGroup && (
                  <button type="button" className="btn btn-secondary btn-sm"
                    onClick={() => { setEditingGroup(null); setGroupForm(EMPTY_GROUP); }}>
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Right: Items panel */}
      <div>
        {!selectedGroup ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#bbb", background: "#fff", borderRadius: "8px", border: "1px solid #eee" }}>
            Select a group on the left to manage its items.
          </div>
        ) : (
          <>
            <div className="table-container">
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 600, fontSize: "13px" }}>
                  Items in "{selectedGroup.name}"
                </span>
                {isAdmin && (
                  <button className="btn btn-sm"
                    style={selectedGroup.is_active
                      ? { background: "#FEF2F2", color: "#EF4444", border: "1px solid #FECACA" }
                      : { background: "#DCFCE7", color: "#166534", border: "1px solid #86EFAC" }}
                    onClick={() => handleToggleGroup(selectedGroup)}>
                    {selectedGroup.is_active ? "Deactivate Group" : "Activate Group"}
                  </button>
                )}
              </div>

              {loadingItems ? (
                <p style={{ padding: "16px", color: "#999" }}>Loading...</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Price</th>
                      <th>Available</th>
                      {isAdmin && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 500 }}>{item.name}</td>
                        <td>{parseFloat(item.price) === 0 ? "Free" : `Rs. ${parseFloat(item.price).toFixed(2)}`}</td>
                        <td>
                          <label className="toggle-switch">
                            <input type="checkbox" checked={item.is_available}
                              onChange={() => handleToggleItem(item)} />
                            <span className="toggle-slider" />
                          </label>
                        </td>
                        {isAdmin && (
                          <td>
                            <div className="action-buttons">
                              <button className="btn btn-sm btn-secondary"
                                onClick={() => { setEditingItem(item); setItemForm({ name: item.name, price: String(item.price), sort_order: String(item.sort_order) }); }}>
                                Edit
                              </button>
                              <button className="btn btn-sm"
                                style={{ background: "#FEF2F2", color: "#EF4444", border: "1px solid #FECACA" }}
                                onClick={() => handleDeleteItem(item.id)}>
                                Delete
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                    {items.length === 0 && (
                      <tr>
                        <td colSpan={isAdmin ? 4 : 3} style={{ textAlign: "center", color: "#bbb", padding: "20px" }}>
                          No items in this group yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Item form */}
            {isAdmin && (
              <form onSubmit={handleSaveItem}>
                <div className="table-container" style={{ padding: "14px", marginTop: "12px" }}>
                  <p style={{ fontSize: "11px", fontWeight: 600, color: "#888", marginBottom: "10px", textTransform: "uppercase" }}>
                    {editingItem ? "Edit Item" : "Add Item"}
                  </p>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Name</label>
                      <input className="form-input" placeholder="e.g. Extra Cheese"
                        value={itemForm.name} onChange={(e) => setItemForm((p) => ({ ...p, name: e.target.value }))} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Price (0 = free)</label>
                      <input className="form-input" type="number" step="0.01" min="0"
                        value={itemForm.price} onChange={(e) => setItemForm((p) => ({ ...p, price: e.target.value }))} />
                    </div>
                  </div>
                  {itemError && <p className="form-error" style={{ marginTop: "6px" }}>{itemError}</p>}
                  <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                    <button type="submit" className="btn btn-primary btn-sm">
                      {editingItem ? "Save" : "+ Add Item"}
                    </button>
                    {editingItem && (
                      <button type="button" className="btn btn-secondary btn-sm"
                        onClick={() => { setEditingItem(null); setItemForm(EMPTY_ITEM); }}>
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
