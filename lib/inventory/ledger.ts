export type InventoryMovementType =
  | 'restock'
  | 'sale'
  | 'reservation'
  | 'release'
  | 'return'
  | 'adjustment';

export interface InventoryMovement {
  productId: string;
  quantity: number;
  type: InventoryMovementType;
  reason: string;
  reference?: string;
  createdAt: string;
}

export function createInventoryMovement(
  input: Omit<InventoryMovement, 'createdAt'>
): InventoryMovement {
  if (!Number.isInteger(input.quantity) || input.quantity === 0) {
    throw new Error('Inventory quantity must be a non-zero integer');
  }

  return { ...input, createdAt: new Date().toISOString() };
}
