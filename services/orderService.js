import { withTransaction } from "../lib/db";
import {
  generateOrderNumber,
  createOrder,
  createOrderItem,
  createOrderItemAddon,
  createPayment,
  updateOrderTotals,
} from "../repositories/orderRepository";


/**
 * Validate and place a complete order with payment in a single transaction.
 *
 * Expected `payload`:
 * {
 *   orderType:      "dine_in" | "takeaway"
 *   paymentMethod:  "cash" | "card"
 *   cashTendered:   number   (required when paymentMethod === "cash")
 *   cardReference:  string   (optional for card)
 *   notes:          string   (optional)
 *   tableNumber:    string   (optional, dine-in)
 *   customerName:   string   (optional, takeaway)
 *   userId:         number   (cashier / manager / admin id from session)
 *   items: [
 *     {
 *       productId:   number
 *       variantId:   number | null
 *       productName: string          — snapshot
 *       variantName: string | null   — snapshot
 *       unitPrice:   number          — COMBINED per-unit price (base + addons)
 *       quantity:    number
 *       addons: [
 *         { addonItemId: number | null, addonName: string, price: number }
 *       ]
 *     }
 *   ]
 * }
 */
export async function placeOrder(payload) {
  const {
    orderType,
    paymentMethod,
    cashTendered,
    cardReference,
    notes,
    tableNumber,
    tableId,
    waiterId,
    customerName,
    customerPhone,
    customerAddress,
    userId,
    items,
  } = payload;

  // ── Validation ─────────────────────────────────────────────────────────────
  if (!items || items.length === 0) {
    throw clientError("Order must have at least one item.");
  }
  if (!["dine_in", "takeaway", "delivery"].includes(orderType)) {
    throw clientError("Invalid order type.");
  }
  if (orderType === "delivery" && !customerAddress?.trim()) {
    throw clientError("Delivery address is required.");
  }

  // Payment validation — only when a method is provided (dine-in may skip payment)
  if (paymentMethod) {
    if (!["cash", "card"].includes(paymentMethod)) {
      throw clientError("Invalid payment method.");
    }
    if (paymentMethod === "cash") {
      const tendered = parseFloat(cashTendered);
      if (isNaN(tendered) || tendered < 0) {
        throw clientError("Invalid cash amount.");
      }
    }
  }

  for (const item of items) {
    if (!item.productName) throw clientError("Each item must have a productName.");
    if (!item.quantity || item.quantity < 1) throw clientError("Item quantity must be at least 1.");
    if (item.unitPrice == null || isNaN(item.unitPrice)) throw clientError("Item unitPrice is required.");
  }

  // ── Totals ─────────────────────────────────────────────────────────────────
  const subtotal = round2(
    items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  );
  const tax   = 0;
  const total = subtotal;

  if (paymentMethod === "cash" && parseFloat(cashTendered) < total) {
    throw clientError(`Cash received must be at least Rs. ${total.toFixed(2)}.`);
  }

  const changeDue = paymentMethod === "cash"
    ? round2(parseFloat(cashTendered) - total)
    : 0;

  // DB type mapping
  const DB_TYPE = { dine_in: "dine-in", takeaway: "takeaway", delivery: "delivery" };
  const dbType  = DB_TYPE[orderType];

  // If all items are non-kitchen, skip the kitchen queue entirely
  const hasKitchenItems = items.some((i) => i.isKitchenItem !== false);

  // ── Transaction ────────────────────────────────────────────────────────────
  return await withTransaction(async (client) => {
    // 1. Order number
    const orderNumber = await generateOrderNumber(client);

    // 2. Insert order
    const order = await createOrder(client, {
      orderNumber,
      type:            dbType,
      status:          hasKitchenItems ? "pending" : "completed",
      subtotal,
      tax,
      total,
      notes:           notes           || null,
      tableNumber:     tableNumber     || null,
      tableId:         tableId         || null,
      waiterId:        waiterId        || null,
      customerName:    customerName    || null,
      customerPhone:   customerPhone   || null,
      customerAddress: customerAddress || null,
      createdBy:       userId,
    });

    // 3. Insert each order item + its addons
    for (const item of items) {
      const addonsPricePerUnit = (item.addons || []).reduce((s, a) => s + a.price, 0);
      const baseUnitPrice      = round2(item.unitPrice - addonsPricePerUnit);
      const lineTotal          = round2(baseUnitPrice * item.quantity);

      const orderItem = await createOrderItem(client, {
        orderId:       order.id,
        productId:     item.productId   || null,
        variantId:     item.variantId   || null,
        productName:   item.productName,
        variantName:   item.variantName || null,
        unitPrice:     baseUnitPrice,
        quantity:      item.quantity,
        lineTotal,
        isKitchenItem: item.isKitchenItem !== false,
      });

      for (const addon of item.addons || []) {
        await createOrderItemAddon(client, {
          orderItemId: orderItem.id,
          addonItemId: addon.addonItemId || null,
          addonName:   addon.addonName,
          price:       addon.price,
        });
      }
    }

    // 4. Insert payment — skipped for dine-in "place order" (pay later)
    let payment = null;
    if (paymentMethod) {
      payment = await createPayment(client, {
        orderId:   order.id,
        method:    paymentMethod,
        amount:    total,
        changeDue,
        reference: cardReference || null,
        paidBy:    userId,
      });
    }

    return { order, payment, changeDue };
  });
}

/**
 * Append items to an existing open dine-in order.
 * "Open" means: no payment recorded + not cancelled.
 *
 * Expected payload:
 * {
 *   orderId: number,
 *   items:   same shape as placeOrder items array
 * }
 */
export async function addItemsToOrder({ orderId, items }) {
  if (!items || items.length === 0) {
    throw clientError("Must provide at least one item.");
  }
  for (const item of items) {
    if (!item.productName) throw clientError("Each item must have a productName.");
    if (!item.quantity || item.quantity < 1) throw clientError("Item quantity must be at least 1.");
    if (item.unitPrice == null || isNaN(item.unitPrice)) throw clientError("Item unitPrice is required.");
  }

  const addSubtotal = round2(
    items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  );

  // Only reset kitchen status if at least one new item needs kitchen prep
  const hasKitchenItems = items.some((i) => i.isKitchenItem !== false);

  return await withTransaction(async (client) => {
    // Verify the order is still open (no payment + not cancelled)
    const check = await client.query(
      `SELECT o.id, o.type, o.status
       FROM   orders  o
       LEFT   JOIN payments p ON p.order_id = o.id
       WHERE  o.id = $1
         AND  p.id IS NULL
         AND  o.status != 'cancelled'`,
      [orderId]
    );
    if (!check.rows[0]) {
      throw clientError("Order not found or is already closed.");
    }
    if (check.rows[0].type !== "dine-in") {
      throw clientError("Can only add items to dine-in orders.");
    }

    // Insert each new item + its addons
    for (const item of items) {
      const addonsPricePerUnit = (item.addons || []).reduce((s, a) => s + a.price, 0);
      const baseUnitPrice      = round2(item.unitPrice - addonsPricePerUnit);
      const lineTotal          = round2(baseUnitPrice * item.quantity);

      const orderItem = await createOrderItem(client, {
        orderId,
        productId:     item.productId   || null,
        variantId:     item.variantId   || null,
        productName:   item.productName,
        variantName:   item.variantName || null,
        unitPrice:     baseUnitPrice,
        quantity:      item.quantity,
        lineTotal,
        isKitchenItem: item.isKitchenItem !== false,
      });

      for (const addon of item.addons || []) {
        await createOrderItemAddon(client, {
          orderItemId: orderItem.id,
          addonItemId: addon.addonItemId || null,
          addonName:   addon.addonName,
          price:       addon.price,
        });
      }
    }

    // Update order totals; reset to pending only if kitchen items were added
    const updated = await updateOrderTotals(client, { orderId, addSubtotal, resetKitchenStatus: hasKitchenItems });
    return { order: updated, addedSubtotal: addSubtotal };
  });
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function clientError(msg) {
  const err = new Error(msg);
  err.status = 400;
  return err;
}
