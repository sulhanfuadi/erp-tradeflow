/**
 * Procure-to-Pay (P2P) validation schemas
 */

import { z } from "zod";

export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  warehouseId: z.string().min(1, "Warehouse is required"),
  tax: z.number().min(0, "Tax cannot be negative").optional(),
  expectedDate: z
    .string()
    .datetime("Invalid expected date format")
    .optional()
    .or(z.string().date("Invalid expected date format"))
    .or(z.literal("")),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, "Product is required"),
        quantity: z.number().int().positive("Quantity must be greater than 0"),
        unitCost: z.number().positive("Unit cost must be greater than 0").optional(),
      }),
    )
    .min(1, "At least one item is required"),
});

export const updatePurchaseOrderSchema = z.object({
  id: z.string().min(1, "Purchase order ID is required"),
  status: z.enum(["draft", "posted", "completed", "cancelled"]).optional(),
  notes: z.string().optional(),
  expectedDate: z
    .string()
    .datetime("Invalid expected date format")
    .optional()
    .or(z.string().date("Invalid expected date format"))
    .or(z.literal("")),
  tax: z.number().min(0, "Tax cannot be negative").optional(),
});

export const createGoodsReceiptSchema = z.object({
  purchaseOrderId: z.string().min(1, "Purchase order is required"),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        purchaseOrderItemId: z.string().min(1, "Purchase order item is required"),
        quantity: z.number().int().positive("Quantity must be greater than 0"),
      }),
    )
    .min(1, "At least one receipt item is required"),
});

export const createAPInvoiceSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  purchaseOrderId: z.string().optional(),
  goodsReceiptId: z.string().optional(),
  subtotal: z.number().min(0, "Subtotal cannot be negative"),
  tax: z.number().min(0, "Tax cannot be negative").optional(),
  dueDate: z
    .string()
    .datetime("Invalid due date format")
    .optional()
    .or(z.string().date("Invalid due date format"))
    .or(z.literal("")),
  notes: z.string().optional(),
  isStandalone: z.boolean().optional().default(false),
});

export const recordAPInvoicePaymentSchema = z.object({
  paymentAmount: z.number().positive("Payment amount must be greater than 0"),
  notes: z.string().optional(),
});

export const reverseGoodsReceiptSchema = z.object({
  notes: z.string().max(500).optional(),
});

export type CreatePurchaseOrderFormData = z.infer<
  typeof createPurchaseOrderSchema
>;
export type UpdatePurchaseOrderFormData = z.infer<
  typeof updatePurchaseOrderSchema
>;
export type CreateGoodsReceiptFormData = z.infer<typeof createGoodsReceiptSchema>;
export type CreateAPInvoiceFormData = z.infer<typeof createAPInvoiceSchema>;
export type RecordAPInvoicePaymentFormData = z.infer<
  typeof recordAPInvoicePaymentSchema
>;
export type ReverseGoodsReceiptFormData = z.infer<
  typeof reverseGoodsReceiptSchema
>;
