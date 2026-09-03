export type NormalizedCartItem = { id: string; qty: number };

export class CartInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CartInputError';
  }
}

function cleanProductId(value: unknown) {
  return String(value ?? '').trim().slice(0, 120);
}

function safeQuantity(value: unknown) {
  const quantity = Number(value);
  return Number.isInteger(quantity) && quantity >= 1 && quantity <= 20 ? quantity : null;
}

export function normalizeRequestedCartItems(input: unknown): NormalizedCartItem[] {
  const requestedItems = Array.isArray(input) ? input : [];
  if (requestedItems.length === 0 || requestedItems.length > 100) {
    throw new CartInputError('Your cart is empty or invalid.');
  }

  const quantityByProduct = new Map<string, number>();
  requestedItems.forEach((item) => {
    if (!item || typeof item !== 'object') throw new CartInputError('Your cart contains an invalid item.');
    const candidate = item as { id?: unknown; qty?: unknown };
    const id = cleanProductId(candidate.id);
    const qty = safeQuantity(candidate.qty);
    if (!id || !qty) throw new CartInputError('Your cart contains an invalid item.');

    const combinedQuantity = (quantityByProduct.get(id) || 0) + qty;
    if (combinedQuantity > 20) throw new CartInputError('A product quantity in your cart is too large.');
    quantityByProduct.set(id, combinedQuantity);
  });

  return Array.from(quantityByProduct, ([id, qty]) => ({ id, qty }));
}
