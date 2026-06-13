export type NetSuiteSalesOrderStatus =
  | "Pending Approval"
  | "Rejected"
  | "Pending Fulfillment"
  | "Partially Fulfilled"
  | "Pending Billing"
  | "Billed"
  | "Closed"
  | "Cancelled";

export type NetSuiteVendorBillStatus =
  | "Open"
  | "Partially Paid"
  | "Paid In Full"
  | "Voided";

export type NetSuiteFulfillmentStatus = "Picked" | "Packed" | "Shipped" | "Fulfilled" | "Partially Fulfilled";

export interface ItemFulfillmentItem {
  id: string;
  itemFulfillmentId: string;
  orderItemId: string;
  productId: string;
  productName: string;
  sku?: string | null;
  quantity: number;
  createdAt: string;
}

export interface ItemFulfillment {
  id: string;
  fulfillmentNumber: string;
  orderId: string;
  userId: string;
  status: "picked" | "packed" | "shipped" | "fulfilled" | "reversed";
  fulfilledAt: string;
  notes?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  items: ItemFulfillmentItem[];
}

export interface CustomerPayment {
  id: string;
  paymentNumber: string;
  invoiceId: string;
  orderId?: string | null;
  userId: string;
  paymentAmount: number;
  amountApplied: number;
  amountRemaining: number;
  status: "posted" | "void";
  paidAt: string;
  notes?: string | null;
  createdAt: string;
}

export interface BillPayment {
  id: string;
  paymentNumber: string;
  apInvoiceId: string;
  purchaseOrderId?: string | null;
  userId: string;
  paymentAmount: number;
  amountApplied: number;
  amountRemaining: number;
  status: "posted" | "void";
  paidAt: string;
  notes?: string | null;
  createdAt: string;
}

export interface CreateItemFulfillmentInput {
  orderId: string;
  notes?: string;
  items: Array<{
    orderItemId: string;
    quantity: number;
  }>;
}

export interface CreateCustomerInvoiceInput {
  orderId: string;
  dueDate: string;
  notes?: string;
  paymentLink?: string;
}

export interface RecordCustomerPaymentInput {
  invoiceId: string;
  paymentAmount: number;
  notes?: string;
}

export interface CreateVendorBillInput {
  supplierId: string;
  purchaseOrderId?: string;
  goodsReceiptId?: string;
  subtotal: number;
  tax?: number;
  dueDate?: string;
  notes?: string;
}

export interface RecordBillPaymentInput {
  apInvoiceId: string;
  paymentAmount: number;
  notes?: string;
}
