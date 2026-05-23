"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useProducts,
  useWarehouses,
  useCreateStockAllocation,
  useStockTransfers,
  useCreateStockTransfer,
  useCompleteStockTransfer,
  useCancelStockTransfer,
  useReverseStockTransfer,
  useStockIssues,
  useCreateStockIssue,
  useReverseStockIssue,
  useStockCard,
} from "@/hooks/queries";
import { useToast } from "@/hooks/use-toast";
import type { StockAllocation } from "@/types";

interface WarehouseInventoryWorkbenchProps {
  warehouseId: string;
  stockAllocations: StockAllocation[];
}

export default function WarehouseInventoryWorkbench({
  warehouseId,
  stockAllocations,
}: WarehouseInventoryWorkbenchProps) {
  const { toast } = useToast();
  const { data: products = [] } = useProducts();
  const { data: warehouses = [] } = useWarehouses();

  const { data: transfers = [] } = useStockTransfers({ warehouseId });
  const { data: issues = [] } = useStockIssues({ warehouseId });
  const { data: stockCard = [] } = useStockCard({ warehouseId, limit: 120 });

  const createAllocation = useCreateStockAllocation();
  const createTransfer = useCreateStockTransfer();
  const completeTransfer = useCompleteStockTransfer();
  const cancelTransfer = useCancelStockTransfer();
  const reverseTransfer = useReverseStockTransfer();
  const createIssue = useCreateStockIssue();
  const reverseIssue = useReverseStockIssue();

  const [allocationForm, setAllocationForm] = useState({
    productId: "",
    quantity: "",
  });

  const [transferForm, setTransferForm] = useState({
    productId: "",
    toWarehouseId: "",
    quantity: "",
    notes: "",
  });

  const [issueForm, setIssueForm] = useState({
    productId: "",
    quantity: "",
    notes: "",
  });

  const currentWarehouseAllocations = useMemo(() => {
    const map = new Map<string, StockAllocation>();
    for (const allocation of stockAllocations) {
      map.set(allocation.productId, allocation);
    }
    return map;
  }, [stockAllocations]);

  const destinationWarehouses = useMemo(() => {
    return warehouses.filter((warehouse) => warehouse.id !== warehouseId);
  }, [warehouses, warehouseId]);

  const transferableProducts = useMemo(() => {
    return stockAllocations.filter(
      (allocation) => allocation.quantity - allocation.reservedQuantity > 0,
    );
  }, [stockAllocations]);

  function parsePositiveInteger(value: string): number | null {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
      return null;
    }
    return parsed;
  }

  async function submitAllocation(event: React.FormEvent) {
    event.preventDefault();

    if (allocationForm.productId === "") {
      toast({
        title: "Product wajib",
        description: "Pilih product untuk alokasi.",
        variant: "destructive",
      });
      return;
    }

    const quantity = parsePositiveInteger(allocationForm.quantity);
    if (quantity == null) {
      toast({
        title: "Qty tidak valid",
        description: "Quantity harus bilangan bulat > 0.",
        variant: "destructive",
      });
      return;
    }

    await createAllocation.mutateAsync({
      productId: allocationForm.productId,
      warehouseId,
      quantity,
    });

    setAllocationForm({ productId: "", quantity: "" });
  }

  async function submitTransfer(event: React.FormEvent) {
    event.preventDefault();

    if (transferForm.productId === "" || transferForm.toWarehouseId === "") {
      toast({
        title: "Form belum lengkap",
        description: "Product dan destination warehouse wajib diisi.",
        variant: "destructive",
      });
      return;
    }

    const quantity = parsePositiveInteger(transferForm.quantity);
    if (quantity == null) {
      toast({
        title: "Qty tidak valid",
        description: "Quantity transfer harus bilangan bulat > 0.",
        variant: "destructive",
      });
      return;
    }

    await createTransfer.mutateAsync({
      productId: transferForm.productId,
      fromWarehouseId: warehouseId,
      toWarehouseId: transferForm.toWarehouseId,
      quantity,
      notes: transferForm.notes,
    });

    setTransferForm({
      productId: "",
      toWarehouseId: "",
      quantity: "",
      notes: "",
    });
  }

  async function submitIssue(event: React.FormEvent) {
    event.preventDefault();

    if (issueForm.productId === "") {
      toast({
        title: "Product wajib",
        description: "Pilih product untuk stock issue.",
        variant: "destructive",
      });
      return;
    }

    const quantity = parsePositiveInteger(issueForm.quantity);
    if (quantity == null) {
      toast({
        title: "Qty tidak valid",
        description: "Quantity issue harus bilangan bulat > 0.",
        variant: "destructive",
      });
      return;
    }

    await createIssue.mutateAsync({
      productId: issueForm.productId,
      warehouseId,
      quantity,
      notes: issueForm.notes,
    });

    setIssueForm({ productId: "", quantity: "", notes: "" });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-emerald-300/30 p-4 bg-white/60 dark:bg-white/5">
        <h4 className="text-sm font-semibold mb-3">Stock Allocation (Manual)</h4>
        <form className="grid gap-3 md:grid-cols-3" onSubmit={submitAllocation}>
          <div className="space-y-1">
            <Label>Product</Label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={allocationForm.productId}
              onChange={(event) =>
                setAllocationForm((previous) => ({
                  ...previous,
                  productId: event.target.value,
                }))
              }
            >
              <option value="">Select product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.sku})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Quantity</Label>
            <Input
              type="number"
              min={1}
              step={1}
              value={allocationForm.quantity}
              onChange={(event) =>
                setAllocationForm((previous) => ({
                  ...previous,
                  quantity: event.target.value,
                }))
              }
            />
          </div>
          <div className="flex items-end">
            <Button disabled={createAllocation.isPending} type="submit" className="w-full">
              Save Allocation
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-sky-300/30 p-4 bg-white/60 dark:bg-white/5">
        <h4 className="text-sm font-semibold mb-3">Stock Transfer</h4>
        <form className="grid gap-3 md:grid-cols-4" onSubmit={submitTransfer}>
          <div className="space-y-1">
            <Label>Product</Label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={transferForm.productId}
              onChange={(event) =>
                setTransferForm((previous) => ({
                  ...previous,
                  productId: event.target.value,
                }))
              }
            >
              <option value="">Select product</option>
              {transferableProducts.map((allocation) => (
                <option key={allocation.id} value={allocation.productId}>
                  {allocation.product?.name ?? allocation.productId} (avail: {allocation.quantity - allocation.reservedQuantity})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Destination</Label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={transferForm.toWarehouseId}
              onChange={(event) =>
                setTransferForm((previous) => ({
                  ...previous,
                  toWarehouseId: event.target.value,
                }))
              }
            >
              <option value="">Select destination</option>
              {destinationWarehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Quantity</Label>
            <Input
              type="number"
              min={1}
              step={1}
              value={transferForm.quantity}
              onChange={(event) =>
                setTransferForm((previous) => ({
                  ...previous,
                  quantity: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Input
              value={transferForm.notes}
              onChange={(event) =>
                setTransferForm((previous) => ({
                  ...previous,
                  notes: event.target.value,
                }))
              }
            />
          </div>
          <div className="md:col-span-4">
            <Button disabled={createTransfer.isPending} type="submit" className="w-full md:w-auto">
              Create Transfer (Pending)
            </Button>
          </div>
        </form>

        <div className="mt-4 overflow-x-auto">
          {transfers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transfers yet.</p>
          ) : (
            <table className="w-full min-w-[780px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2">Product</th>
                  <th className="py-2">From</th>
                  <th className="py-2">To</th>
                  <th className="py-2">Qty</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((transfer) => (
                  <tr key={transfer.id} className="border-b">
                    <td className="py-2">{transfer.product?.name ?? transfer.productId}</td>
                    <td className="py-2">{transfer.fromWarehouse?.name ?? transfer.fromWarehouseId}</td>
                    <td className="py-2">{transfer.toWarehouse?.name ?? transfer.toWarehouseId}</td>
                    <td className="py-2">{transfer.quantity}</td>
                    <td className="py-2">{transfer.status}</td>
                    <td className="py-2">
                      <div className="flex gap-2">
                        {transfer.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={completeTransfer.isPending}
                              onClick={() => completeTransfer.mutate(transfer.id)}
                            >
                              Complete
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={cancelTransfer.isPending}
                              onClick={() => cancelTransfer.mutate(transfer.id)}
                            >
                              Cancel
                            </Button>
                          </>
                        )}
                        {transfer.status === "completed" && !transfer.reversalTransferId && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={reverseTransfer.isPending}
                            onClick={() =>
                              reverseTransfer.mutate({
                                id: transfer.id,
                                notes: "Reverse from warehouse workbench",
                              })
                            }
                          >
                            Reverse
                          </Button>
                        )}
                        {transfer.reversalTransferId && (
                          <span className="text-xs text-muted-foreground">Reversed</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-amber-300/30 p-4 bg-white/60 dark:bg-white/5">
        <h4 className="text-sm font-semibold mb-3">Stock Issue & Reversal</h4>
        <form className="grid gap-3 md:grid-cols-4" onSubmit={submitIssue}>
          <div className="space-y-1">
            <Label>Product</Label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={issueForm.productId}
              onChange={(event) =>
                setIssueForm((previous) => ({
                  ...previous,
                  productId: event.target.value,
                }))
              }
            >
              <option value="">Select product</option>
              {transferableProducts.map((allocation) => (
                <option key={allocation.id} value={allocation.productId}>
                  {allocation.product?.name ?? allocation.productId} (avail: {allocation.quantity - allocation.reservedQuantity})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Quantity</Label>
            <Input
              type="number"
              min={1}
              step={1}
              value={issueForm.quantity}
              onChange={(event) =>
                setIssueForm((previous) => ({
                  ...previous,
                  quantity: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Notes</Label>
            <Textarea
              value={issueForm.notes}
              onChange={(event) =>
                setIssueForm((previous) => ({
                  ...previous,
                  notes: event.target.value,
                }))
              }
            />
          </div>
          <div className="md:col-span-4">
            <Button disabled={createIssue.isPending} type="submit" className="w-full md:w-auto">
              Post Stock Issue
            </Button>
          </div>
        </form>

        <div className="mt-4 overflow-x-auto">
          {issues.length === 0 ? (
            <p className="text-sm text-muted-foreground">No stock issues yet.</p>
          ) : (
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2">When</th>
                  <th className="py-2">Product</th>
                  <th className="py-2">Qty Out</th>
                  <th className="py-2">Notes</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((issue) => (
                  <tr key={issue.id} className="border-b">
                    <td className="py-2">{new Date(issue.createdAt).toLocaleString()}</td>
                    <td className="py-2">{issue.product?.name ?? issue.productId}</td>
                    <td className="py-2">{Math.abs(issue.quantityChange)}</td>
                    <td className="py-2">{issue.notes ?? "-"}</td>
                    <td className="py-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={reverseIssue.isPending}
                        onClick={() =>
                          reverseIssue.mutate({
                            id: issue.id,
                            notes: "Reverse stock issue from warehouse workbench",
                          })
                        }
                      >
                        Reverse
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-violet-300/30 p-4 bg-white/60 dark:bg-white/5">
        <h4 className="text-sm font-semibold mb-3">Stock Card (Movement Ledger)</h4>
        <div className="overflow-x-auto">
          {stockCard.length === 0 ? (
            <p className="text-sm text-muted-foreground">No stock movement yet.</p>
          ) : (
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2">Timestamp</th>
                  <th className="py-2">Type</th>
                  <th className="py-2">Product</th>
                  <th className="py-2">Qty Change</th>
                  <th className="py-2">Running Balance</th>
                  <th className="py-2">Reference</th>
                  <th className="py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {stockCard.map((movement) => (
                  <tr key={movement.id} className="border-b">
                    <td className="py-2">{new Date(movement.createdAt).toLocaleString()}</td>
                    <td className="py-2">{movement.movementType}</td>
                    <td className="py-2">{movement.product?.name ?? movement.productId}</td>
                    <td className="py-2">{movement.quantityChange > 0 ? `+${movement.quantityChange}` : movement.quantityChange}</td>
                    <td className="py-2">{movement.runningBalance ?? "-"}</td>
                    <td className="py-2">
                      {movement.referenceType ? `${movement.referenceType}:${movement.referenceId ?? "-"}` : "-"}
                    </td>
                    <td className="py-2">{movement.notes ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-gray-300/30 p-4 bg-white/50 dark:bg-white/5">
        <h4 className="text-sm font-semibold mb-2">Quick Availability</h4>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from(currentWarehouseAllocations.values()).map((allocation) => (
            <div key={allocation.id} className="rounded-lg border p-2 text-xs">
              <p className="font-medium">{allocation.product?.name ?? allocation.productId}</p>
              <p>Qty: {allocation.quantity}</p>
              <p>Reserved: {allocation.reservedQuantity}</p>
              <p>Available: {allocation.quantity - allocation.reservedQuantity}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
