"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { invalidateAllRelatedQueries } from "@/lib/react-query";
import { useAuth } from "@/contexts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type MasterSupplier = { id: string; name: string };
type MasterWarehouse = { id: string; name: string };
type MasterProduct = {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  quantity: number;
  supplierId: string;
};

type PurchaseOrderItem = {
  id: string;
  purchaseOrderId: string;
  productId: string;
  productName: string;
  sku: string | null;
  quantity: number;
  unitCost: number;
  subtotal: number;
  receivedQuantity: number;
};

type PurchaseOrderRecord = {
  id: string;
  poNumber: string;
  supplierId: string;
  warehouseId: string;
  status: "draft" | "posted" | "completed" | "cancelled" | "reviewed";
  subtotal: number;
  tax: number | null;
  total: number;
  expectedDate: string | null;
  notes: string | null;
  createdAt: string;
  items: PurchaseOrderItem[];
};

type GoodsReceiptRecord = {
  id: string;
  receiptNumber: string;
  purchaseOrderId: string;
  supplierId: string;
  warehouseId: string;
  status: "received" | "reversed";
  receivedAt: string;
  notes: string | null;
  createdAt: string;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    unitCost: number;
  }>;
};

type APInvoiceRecord = {
  id: string;
  invoiceNumber: string;
  purchaseOrderId: string | null;
  goodsReceiptId: string | null;
  supplierId: string;
  status: "draft" | "unpaid" | "partial" | "paid" | "cancelled" | "pending_approval" | "rejected";
  subtotal: number;
  tax: number | null;
  total: number;
  amountPaid: number;
  amountDue: number;
  dueDate: string | null;
  issuedAt: string;
  notes: string | null;
};

type MasterDataResponse = {
  suppliers: MasterSupplier[];
  warehouses: MasterWarehouse[];
  products: MasterProduct[];
};

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof payload?.error === "string"
        ? payload.error
        : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return payload as T;
}

export default function P2PWorkbench() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const isInventoryManager = user?.role === "inventory_manager" || user?.role === "admin";
  const isArAnalyst = user?.role === "ar_analyst" || user?.role === "admin";
  const isPurchasingManager = user?.role === "purchasing_manager" || user?.role === "admin";

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [suppliers, setSuppliers] = useState<MasterSupplier[]>([]);
  const [warehouses, setWarehouses] = useState<MasterWarehouse[]>([]);
  const [products, setProducts] = useState<MasterProduct[]>([]);

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderRecord[]>([]);
  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceiptRecord[]>([]);
  const [apInvoices, setApInvoices] = useState<APInvoiceRecord[]>([]);

  const [poForm, setPoForm] = useState({
    supplierId: "",
    warehouseId: "",
    productId: "",
    quantity: "",
    unitCost: "",
    tax: "0",
    expectedDate: "",
    notes: "",
  });

  const [receiptForm, setReceiptForm] = useState({
    purchaseOrderId: "",
    notes: "",
  });
  const [receiptQuantities, setReceiptQuantities] = useState<
    Record<string, string>
  >({});

  const [apForm, setApForm] = useState({
    supplierId: "",
    purchaseOrderId: "",
    goodsReceiptId: "",
    subtotal: "",
    tax: "0",
    dueDate: "",
    notes: "",
  });

  const [paymentForm, setPaymentForm] = useState({
    apInvoiceId: "",
    paymentAmount: "",
    notes: "",
  });

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [masterData, poList, receiptList, apList] = await Promise.all([
        apiFetch<MasterDataResponse>("/api/p2p/master-data"),
        apiFetch<PurchaseOrderRecord[]>("/api/p2p/purchase-orders"),
        apiFetch<GoodsReceiptRecord[]>("/api/p2p/goods-receipts"),
        apiFetch<APInvoiceRecord[]>("/api/p2p/ap-invoices"),
      ]);

      setSuppliers(masterData.suppliers);
      setWarehouses(masterData.warehouses);
      setProducts(masterData.products);
      setPurchaseOrders(poList);
      setGoodsReceipts(receiptList);
      setApInvoices(apList);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load";
      toast({
        title: "Failed to load P2P data",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const reloadAfterMutation = useCallback(async () => {
    invalidateAllRelatedQueries(queryClient);
    await loadAll();
  }, [loadAll, queryClient]);

  const supplierMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const supplier of suppliers) {
      map.set(supplier.id, supplier.name);
    }
    return map;
  }, [suppliers]);

  const warehouseMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const warehouse of warehouses) {
      map.set(warehouse.id, warehouse.name);
    }
    return map;
  }, [warehouses]);

  const filteredProducts = useMemo(() => {
    if (poForm.supplierId === "") {
      return products;
    }
    return products.filter((product) => product.supplierId === poForm.supplierId);
  }, [poForm.supplierId, products]);

  const selectedPoForReceipt = useMemo(() => {
    return (
      purchaseOrders.find((po) => po.id === receiptForm.purchaseOrderId) ?? null
    );
  }, [purchaseOrders, receiptForm.purchaseOrderId]);

  const selectedPoForAp = useMemo(() => {
    return purchaseOrders.find((po) => po.id === apForm.purchaseOrderId) ?? null;
  }, [purchaseOrders, apForm.purchaseOrderId]);

  const selectedGrForAp = useMemo(() => {
    return goodsReceipts.find((gr) => gr.id === apForm.goodsReceiptId) ?? null;
  }, [goodsReceipts, apForm.goodsReceiptId]);

  useEffect(() => {
    if (selectedPoForAp == null) {
      return;
    }

    setApForm((previous) => ({
      ...previous,
      supplierId: selectedPoForAp.supplierId,
      subtotal: String(selectedPoForAp.subtotal),
      tax: String(selectedPoForAp.tax ?? 0),
    }));
  }, [selectedPoForAp]);

  useEffect(() => {
    if (selectedGrForAp == null) {
      return;
    }

    const linkedPo = purchaseOrders.find(
      (po) => po.id === selectedGrForAp.purchaseOrderId,
    );

    setApForm((previous) => ({
      ...previous,
      supplierId: selectedGrForAp.supplierId,
      purchaseOrderId: selectedGrForAp.purchaseOrderId,
      subtotal: String(linkedPo?.subtotal ?? 0),
      tax: String(linkedPo?.tax ?? 0),
    }));
  }, [selectedGrForAp, purchaseOrders]);

  async function submitCreatePurchaseOrder(event: React.FormEvent) {
    event.preventDefault();

    if (
      poForm.supplierId === "" ||
      poForm.warehouseId === "" ||
      poForm.productId === ""
    ) {
      toast({
        title: "Incomplete form",
        description: "Supplier, warehouse, and product are required.",
        variant: "destructive",
      });
      return;
    }

    const quantity = Number(poForm.quantity);
    const unitCost = Number(poForm.unitCost);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast({
        title: "Invalid quantity",
        description: "Quantity must be greater than zero.",
        variant: "destructive",
      });
      return;
    }

    if (!Number.isFinite(unitCost) || unitCost <= 0) {
      toast({
        title: "Invalid unit cost",
        description: "Unit cost must be greater than zero.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await apiFetch("/api/p2p/purchase-orders", {
        method: "POST",
        body: JSON.stringify({
          supplierId: poForm.supplierId,
          warehouseId: poForm.warehouseId,
          tax: Number(poForm.tax || 0),
          expectedDate: poForm.expectedDate || undefined,
          notes: poForm.notes,
          items: [
            {
              productId: poForm.productId,
              quantity,
              unitCost,
            },
          ],
        }),
      });

      toast({
        title: "Purchase order created",
        description: "Draft purchase order has been created successfully.",
      });

      setPoForm({
        supplierId: "",
        warehouseId: "",
        productId: "",
        quantity: "",
        unitCost: "",
        tax: "0",
        expectedDate: "",
        notes: "",
      });

      await reloadAfterMutation();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create PO";
      toast({
        title: "Create PO failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function updatePoStatus(
    purchaseOrderId: string,
    status: "posted" | "cancelled",
  ) {
    setIsSubmitting(true);
    try {
      await apiFetch(`/api/p2p/purchase-orders/${purchaseOrderId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      toast({
        title: "Purchase order updated",
        description: `Status changed to ${status}.`,
      });

      await reloadAfterMutation();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update PO status";
      toast({
        title: "Update failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitCreateGoodsReceipt(event: React.FormEvent) {
    event.preventDefault();

    if (selectedPoForReceipt == null) {
      toast({
        title: "Select purchase order",
        description: "Please select a purchase order to receive.",
        variant: "destructive",
      });
      return;
    }

    const items = selectedPoForReceipt.items
      .map((item) => {
        const quantity = Number(receiptQuantities[item.id] ?? "0");
        return {
          purchaseOrderItemId: item.id,
          quantity,
          remaining: item.quantity - item.receivedQuantity,
        };
      })
      .filter((item) => item.quantity > 0);

    if (items.length === 0) {
      toast({
        title: "No receipt quantity",
        description: "Input at least one item quantity to receive.",
        variant: "destructive",
      });
      return;
    }

    const invalid = items.find((item) => item.quantity > item.remaining);
    if (invalid != null) {
      toast({
        title: "Invalid quantity",
        description: "Received quantity cannot exceed remaining quantity.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await apiFetch("/api/p2p/goods-receipts", {
        method: "POST",
        body: JSON.stringify({
          purchaseOrderId: selectedPoForReceipt.id,
          notes: receiptForm.notes,
          items: items.map((item) => ({
            purchaseOrderItemId: item.purchaseOrderItemId,
            quantity: item.quantity,
          })),
        }),
      });

      toast({
        title: "Item receipt posted",
        description: "Stock has been updated successfully.",
      });

      setReceiptForm({ purchaseOrderId: "", notes: "" });
      setReceiptQuantities({});

      await reloadAfterMutation();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create item receipt";
      toast({
        title: "Create item receipt failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitCreateApInvoice(event: React.FormEvent) {
    event.preventDefault();

    if (apForm.supplierId === "") {
      toast({
        title: "Supplier required",
        description: "Please select supplier or linked PO/GR.",
        variant: "destructive",
      });
      return;
    }

    const subtotal = Number(apForm.subtotal);
    if (!Number.isFinite(subtotal) || subtotal < 0) {
      toast({
        title: "Invalid subtotal",
        description: "Subtotal must be zero or positive number.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await apiFetch("/api/p2p/ap-invoices", {
        method: "POST",
        body: JSON.stringify({
          supplierId: apForm.supplierId,
          purchaseOrderId: apForm.purchaseOrderId || undefined,
          goodsReceiptId: apForm.goodsReceiptId || undefined,
          subtotal,
          tax: Number(apForm.tax || 0),
          dueDate: apForm.dueDate || undefined,
          notes: apForm.notes,
        }),
      });

      toast({
        title: "Vendor bill created",
        description: "Vendor bill has been recorded successfully.",
      });

      setApForm({
        supplierId: "",
        purchaseOrderId: "",
        goodsReceiptId: "",
        subtotal: "",
        tax: "0",
        dueDate: "",
        notes: "",
      });

      await reloadAfterMutation();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create vendor bill";
      toast({
        title: "Create vendor bill failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitRecordPayment(event: React.FormEvent) {
    event.preventDefault();

    if (paymentForm.apInvoiceId === "") {
      toast({
        title: "Select vendor bill",
        description: "Please choose vendor bill for payment.",
        variant: "destructive",
      });
      return;
    }

    const paymentAmount = Number(paymentForm.paymentAmount);
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      toast({
        title: "Invalid payment",
        description: "Payment amount must be greater than zero.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await apiFetch(`/api/p2p/ap-invoices/${paymentForm.apInvoiceId}/payment`, {
        method: "POST",
        body: JSON.stringify({
          paymentAmount,
          notes: paymentForm.notes,
        }),
      });

      toast({
        title: "Payment recorded",
        description: "Vendor bill payment status has been updated.",
      });

      setPaymentForm({ apInvoiceId: "", paymentAmount: "", notes: "" });
      await reloadAfterMutation();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to record vendor bill payment";
      toast({
        title: "Record payment failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function reverseGoodsReceipt(receiptId: string) {
    if (!window.confirm("Reverse this item receipt and roll back stock?")) {
      return;
    }

    setIsSubmitting(true);
    try {
      await apiFetch(`/api/p2p/goods-receipts/${receiptId}/reverse`, {
        method: "POST",
        body: JSON.stringify({
          notes: "Reversed from procurement workbench",
        }),
      });

      toast({
        title: "Item receipt reversed",
        description: "Stock and PO receipt quantity have been rolled back.",
      });

      await reloadAfterMutation();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to reverse item receipt";
      toast({
        title: "Reverse item receipt failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 px-2 pb-8 pt-4 sm:px-4">
      <Card>
        <CardHeader>
          <CardTitle>Procure-to-Pay Workbench</CardTitle>
          <CardDescription>
            Supplier → Purchase Order → Item Receipt → Vendor Bill → Bill
            Payment
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-4">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Purchase Orders</p>
            <p className="text-xl font-semibold">{purchaseOrders.length}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Item Receipts</p>
            <p className="text-xl font-semibold">{goodsReceipts.length}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Vendor Bills</p>
            <p className="text-xl font-semibold">{apInvoices.length}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Outstanding Bills</p>
            <p className="text-xl font-semibold">
              ${
                apInvoices
                  .reduce((sum, invoice) => sum + Number(invoice.amountDue), 0)
                  .toFixed(2)
              }
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Create Purchase Order</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={submitCreatePurchaseOrder}>
              <div className="space-y-1">
                <Label>Supplier</Label>
                <select
                  value={poForm.supplierId}
                  onChange={(event) =>
                    setPoForm((previous) => ({
                      ...previous,
                      supplierId: event.target.value,
                      productId: "",
                    }))
                  }
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label>Warehouse</Label>
                <select
                  value={poForm.warehouseId}
                  onChange={(event) =>
                    setPoForm((previous) => ({
                      ...previous,
                      warehouseId: event.target.value,
                    }))
                  }
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select warehouse</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label>Product</Label>
                <select
                  value={poForm.productId}
                  onChange={(event) => {
                    const selectedProduct = filteredProducts.find(
                      (product) => product.id === event.target.value,
                    );

                    setPoForm((previous) => ({
                      ...previous,
                      productId: event.target.value,
                      unitCost:
                        selectedProduct != null
                          ? String(selectedProduct.price)
                          : previous.unitCost,
                    }));
                  }}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select product</option>
                  {filteredProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.sku ?? "-"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={poForm.quantity}
                    onChange={(event) =>
                      setPoForm((previous) => ({
                        ...previous,
                        quantity: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-1">
                  <Label>Unit Cost</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={poForm.unitCost}
                    onChange={(event) =>
                      setPoForm((previous) => ({
                        ...previous,
                        unitCost: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Tax</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={poForm.tax}
                    onChange={(event) =>
                      setPoForm((previous) => ({
                        ...previous,
                        tax: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Expected Date</Label>
                  <Input
                    type="date"
                    value={poForm.expectedDate}
                    onChange={(event) =>
                      setPoForm((previous) => ({
                        ...previous,
                        expectedDate: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Notes</Label>
                <Textarea
                  value={poForm.notes}
                  onChange={(event) =>
                    setPoForm((previous) => ({
                      ...previous,
                      notes: event.target.value,
                    }))
                  }
                  rows={3}
                />
              </div>

              <Button disabled={isSubmitting || !isPurchasingManager} type="submit" className="w-full">
                Create Purchase Order
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Post Item Receipt</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={submitCreateGoodsReceipt}>
              <div className="space-y-1">
                <Label>Purchase Order</Label>
                <select
                  value={receiptForm.purchaseOrderId}
                  onChange={(event) => {
                    const purchaseOrderId = event.target.value;
                    setReceiptForm((previous) => ({
                      ...previous,
                      purchaseOrderId,
                    }));

                    const selected = purchaseOrders.find(
                      (po) => po.id === purchaseOrderId,
                    );

                    if (selected == null) {
                      setReceiptQuantities({});
                      return;
                    }

                    const nextQuantities: Record<string, string> = {};
                    for (const item of selected.items) {
                      const remaining = Math.max(
                        0,
                        item.quantity - item.receivedQuantity,
                      );
                      nextQuantities[item.id] = remaining > 0 ? String(remaining) : "0";
                    }
                    setReceiptQuantities(nextQuantities);
                  }}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select purchase order</option>
                  {purchaseOrders
                    .filter((po) => po.status !== "cancelled")
                    .map((po) => (
                      <option key={po.id} value={po.id}>
                        {po.poNumber} ({po.status})
                      </option>
                    ))}
                </select>
              </div>

              {selectedPoForReceipt != null && (
                <div className="space-y-2 rounded-md border p-2">
                  {selectedPoForReceipt.items.map((item) => {
                    const remaining = Math.max(
                      0,
                      item.quantity - item.receivedQuantity,
                    );

                    return (
                      <div key={item.id} className="grid grid-cols-[1fr_90px] gap-2">
                        <div className="text-xs">
                          <p className="font-medium">{item.productName}</p>
                          <p className="text-muted-foreground">
                            Remaining: {remaining}
                          </p>
                        </div>
                        <Input
                          type="number"
                          min={0}
                          max={remaining}
                          step={1}
                          value={receiptQuantities[item.id] ?? "0"}
                          onChange={(event) =>
                            setReceiptQuantities((previous) => ({
                              ...previous,
                              [item.id]: event.target.value,
                            }))
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="space-y-1">
                <Label>Notes</Label>
                <Textarea
                  rows={3}
                  value={receiptForm.notes}
                  onChange={(event) =>
                    setReceiptForm((previous) => ({
                      ...previous,
                      notes: event.target.value,
                    }))
                  }
                />
              </div>

              <Button disabled={isSubmitting || !isInventoryManager} type="submit" className="w-full">
                Post Item Receipt
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create Vendor Bill</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={submitCreateApInvoice}>
              <div className="space-y-1">
                <Label>Supplier</Label>
                <select
                  value={apForm.supplierId}
                  onChange={(event) =>
                    setApForm((previous) => ({
                      ...previous,
                      supplierId: event.target.value,
                    }))
                  }
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label>Linked Purchase Order</Label>
                <select
                  value={apForm.purchaseOrderId}
                  onChange={(event) =>
                    setApForm((previous) => ({
                      ...previous,
                      purchaseOrderId: event.target.value,
                    }))
                  }
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select purchase order (optional)</option>
                  {purchaseOrders.map((po) => (
                    <option key={po.id} value={po.id}>
                      {po.poNumber}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label>Linked Item Receipt</Label>
                <select
                  value={apForm.goodsReceiptId}
                  onChange={(event) =>
                    setApForm((previous) => ({
                      ...previous,
                      goodsReceiptId: event.target.value,
                    }))
                  }
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select item receipt (optional)</option>
                  {goodsReceipts.map((receipt) => (
                    <option key={receipt.id} value={receipt.id}>
                      {receipt.receiptNumber}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Subtotal</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={apForm.subtotal}
                    onChange={(event) =>
                      setApForm((previous) => ({
                        ...previous,
                        subtotal: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Tax</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={apForm.tax}
                    onChange={(event) =>
                      setApForm((previous) => ({
                        ...previous,
                        tax: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={apForm.dueDate}
                  onChange={(event) =>
                    setApForm((previous) => ({
                      ...previous,
                      dueDate: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-1">
                <Label>Notes</Label>
                <Textarea
                  rows={3}
                  value={apForm.notes}
                  onChange={(event) =>
                    setApForm((previous) => ({
                      ...previous,
                      notes: event.target.value,
                    }))
                  }
                />
              </div>

              <Button disabled={isSubmitting || !isArAnalyst} type="submit" className="w-full">
                Create Vendor Bill
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Record Bill Payment</CardTitle>
          <CardDescription>
            Update vendor bill payment status to Open / Partially Paid / Paid.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-4" onSubmit={submitRecordPayment}>
            <div className="space-y-1 md:col-span-2">
              <Label>Vendor Bill</Label>
              <select
                value={paymentForm.apInvoiceId}
                onChange={(event) =>
                  setPaymentForm((previous) => ({
                    ...previous,
                    apInvoiceId: event.target.value,
                  }))
                }
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="">Select vendor bill</option>
                {apInvoices.map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.invoiceNumber} ({invoice.status})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label>Payment Amount</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={paymentForm.paymentAmount}
                onChange={(event) =>
                  setPaymentForm((previous) => ({
                    ...previous,
                    paymentAmount: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-1">
              <Label>Notes</Label>
              <Input
                value={paymentForm.notes}
                onChange={(event) =>
                  setPaymentForm((previous) => ({
                    ...previous,
                    notes: event.target.value,
                  }))
                }
              />
            </div>

            <div className="md:col-span-4">
              <Button disabled={isSubmitting || !isArAnalyst} type="submit">
                Record Payment
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : purchaseOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No purchase orders yet.</p>
          ) : (
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2">PO Number</th>
                  <th className="py-2">Supplier</th>
                  <th className="py-2">Warehouse</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Items</th>
                  <th className="py-2">Total</th>
                  <th className="py-2">Created</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.map((purchaseOrder) => (
                  <tr key={purchaseOrder.id} className="border-b">
                    <td className="py-2 font-medium">{purchaseOrder.poNumber}</td>
                    <td className="py-2">
                      {supplierMap.get(purchaseOrder.supplierId) ?? "Unknown"}
                    </td>
                    <td className="py-2">
                      {warehouseMap.get(purchaseOrder.warehouseId) ?? "Unknown"}
                    </td>
                    <td className="py-2">{purchaseOrder.status}</td>
                    <td className="py-2">{purchaseOrder.items.length}</td>
                    <td className="py-2">${purchaseOrder.total.toFixed(2)}</td>
                    <td className="py-2">
                      {new Date(purchaseOrder.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2">
                      <div className="flex gap-2">
                        {purchaseOrder.status === "draft" && isInventoryManager && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isSubmitting}
                              onClick={async () => {
                                setIsSubmitting(true);
                                try {
                                  await apiFetch(`/api/netsuite/purchase-orders/${purchaseOrder.id}/review`, { method: "POST" });
                                  toast({ title: "Purchase order reviewed" });
                                  await reloadAfterMutation();
                                } catch (e) {
                                  toast({ title: "Failed to review", variant: "destructive" });
                                } finally {
                                  setIsSubmitting(false);
                                }
                              }}
                            >
                              Review
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isSubmitting}
                              onClick={() => updatePoStatus(purchaseOrder.id, "posted")}
                            >
                              Post
                            </Button>
                          </>
                        )}
                        {(purchaseOrder.status === "draft" ||
                          purchaseOrder.status === "posted") && (
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={isSubmitting}
                            onClick={() =>
                              updatePoStatus(purchaseOrder.id, "cancelled")
                            }
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Item Receipts</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {goodsReceipts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No item receipts yet.</p>
            ) : (
              <table className="w-full min-w-[620px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2">Receipt</th>
                    <th className="py-2">PO</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Items</th>
                    <th className="py-2">Received At</th>
                    <th className="py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {goodsReceipts.map((receipt) => (
                    <tr key={receipt.id} className="border-b">
                      <td className="py-2 font-medium">{receipt.receiptNumber}</td>
                      <td className="py-2">
                        {purchaseOrders.find((po) => po.id === receipt.purchaseOrderId)
                          ?.poNumber ?? "-"}
                      </td>
                      <td className="py-2">{receipt.status}</td>
                      <td className="py-2">{receipt.items.length}</td>
                      <td className="py-2">
                        {new Date(receipt.receivedAt).toLocaleString()}
                      </td>
                      <td className="py-2">
                        {receipt.status === "received" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isSubmitting || !isInventoryManager}
                            onClick={() => reverseGoodsReceipt(receipt.id)}
                          >
                            Reverse
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vendor Bills</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {apInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No vendor bills yet.</p>
            ) : (
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2">Invoice</th>
                    <th className="py-2">Supplier</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Total</th>
                    <th className="py-2">Paid</th>
                    <th className="py-2">Due</th>
                    <th className="py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {apInvoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b">
                      <td className="py-2 font-medium">{invoice.invoiceNumber}</td>
                      <td className="py-2">
                        {supplierMap.get(invoice.supplierId) ?? "Unknown"}
                      </td>
                      <td className="py-2">{invoice.status}</td>
                      <td className="py-2">${invoice.total.toFixed(2)}</td>
                      <td className="py-2">${invoice.amountPaid.toFixed(2)}</td>
                      <td className="py-2">${invoice.amountDue.toFixed(2)}</td>
                      <td className="py-2">
                        {invoice.status === "pending_approval" && isArAnalyst && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isSubmitting}
                              onClick={async () => {
                                setIsSubmitting(true);
                                try {
                                  await apiFetch(`/api/netsuite/vendor-bills/${invoice.id}/approve`, { method: "POST" });
                                  toast({ title: "Vendor bill approved" });
                                  await reloadAfterMutation();
                                } catch (e) {
                                  toast({ title: "Failed to approve", variant: "destructive" });
                                } finally {
                                  setIsSubmitting(false);
                                }
                              }}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={isSubmitting}
                              onClick={async () => {
                                setIsSubmitting(true);
                                try {
                                  await apiFetch(`/api/netsuite/vendor-bills/${invoice.id}/reject`, { method: "POST" });
                                  toast({ title: "Vendor bill rejected" });
                                  await reloadAfterMutation();
                                } catch (e) {
                                  toast({ title: "Failed to reject", variant: "destructive" });
                                } finally {
                                  setIsSubmitting(false);
                                }
                              }}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
