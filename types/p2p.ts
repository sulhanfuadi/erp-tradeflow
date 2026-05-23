/**
 * Procure-to-Pay (P2P) type definitions
 */

export type PurchaseOrderStatus =
  | "draft"
  | "posted"
  | "completed"
  | "cancelled";

export type GoodsReceiptStatus = "received" | "reversed";

export type APInvoiceStatus =
  | "draft"
  | "unpaid"
  | "partial"
  | "paid"
  | "cancelled";

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  productId: string;
  productName: string;
  sku?: string | null;
  quantity: number;
  unitCost: number;
  subtotal: number;
  receivedQuantity: number;
  createdAt: Date;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  warehouseId: string;
  userId: string;
  status: PurchaseOrderStatus;
  subtotal: number;
  tax?: number | null;
  total: number;
  expectedDate?: Date | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt?: Date | null;
  createdBy: string;
  updatedBy?: string | null;
  items: PurchaseOrderItem[];
}

export interface GoodsReceiptItem {
  id: string;
  goodsReceiptId: string;
  purchaseOrderItemId?: string | null;
  productId: string;
  productName: string;
  sku?: string | null;
  quantity: number;
  unitCost: number;
  subtotal: number;
  createdAt: Date;
}

export interface GoodsReceipt {
  id: string;
  receiptNumber: string;
  purchaseOrderId: string;
  supplierId: string;
  warehouseId: string;
  userId: string;
  status: GoodsReceiptStatus;
  receivedAt: Date;
  reversedAt?: Date | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt?: Date | null;
  createdBy: string;
  updatedBy?: string | null;
  reversedBy?: string | null;
  items: GoodsReceiptItem[];
}

export interface APInvoice {
  id: string;
  invoiceNumber: string;
  purchaseOrderId?: string | null;
  goodsReceiptId?: string | null;
  supplierId: string;
  userId: string;
  status: APInvoiceStatus;
  subtotal: number;
  tax?: number | null;
  total: number;
  amountPaid: number;
  amountDue: number;
  dueDate?: Date | null;
  issuedAt: Date;
  paidAt?: Date | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt?: Date | null;
  createdBy: string;
  updatedBy?: string | null;
}

export interface CreatePurchaseOrderInput {
  supplierId: string;
  warehouseId: string;
  tax?: number;
  expectedDate?: string;
  notes?: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitCost?: number;
  }>;
}

export interface UpdatePurchaseOrderInput {
  status?: PurchaseOrderStatus;
  notes?: string;
  expectedDate?: string;
  tax?: number;
}

export interface CreateGoodsReceiptInput {
  purchaseOrderId: string;
  notes?: string;
  items: Array<{
    purchaseOrderItemId: string;
    quantity: number;
  }>;
}

export interface CreateAPInvoiceInput {
  supplierId: string;
  purchaseOrderId?: string;
  goodsReceiptId?: string;
  subtotal: number;
  tax?: number;
  dueDate?: string;
  notes?: string;
}

export interface RecordAPInvoicePaymentInput {
  paymentAmount: number;
  notes?: string;
}

export interface ReverseGoodsReceiptInput {
  notes?: string;
}
