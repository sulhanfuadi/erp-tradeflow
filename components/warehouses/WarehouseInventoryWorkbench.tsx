"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import { useAuth } from "@/contexts";
import {
  canAdjustInventory,
  canApproveInventoryAdjustment,
  canManageItemMaster,
  canMonitorInventory,
} from "@/lib/role-helpers";

interface WarehouseInventoryWorkbenchProps {
  warehouseId: string;
  stockAllocations: StockAllocation[];
}

export default function WarehouseInventoryWorkbench({
  warehouseId,
  stockAllocations,
}: WarehouseInventoryWorkbenchProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const canAdjust = canAdjustInventory(user);
  const canApproveAdjustment = canApproveInventoryAdjustment(user);
  const canManageItems = canManageItemMaster(user);
  const canMonitor = canMonitorInventory(user);
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

  const [adjustmentRequests, setAdjustmentRequests] = useState<any[]>([]);
  const fetchRequests = React.useCallback(async () => {
    try {
      const res = await fetch('/api/stock-allocations/adjustments');
      if (res.ok) setAdjustmentRequests(await res.json());
    } catch (e) {
      console.error(e);
    }
  }, []);

  React.useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

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

  const latestInventoryEvidence = useMemo(() => {
    const latestMovement = stockCard[0] ?? null;
    const latestIssue = issues[0] ?? null;
    const latestTransfer = transfers[0] ?? null;
    const allocation = stockAllocations[0] ?? null;
    const pendingRequest = adjustmentRequests.find(r => r.details?.warehouseId === warehouseId) ?? null;
    
    const product = products.find((entry) => entry.id === allocation?.productId) ??
      products.find((entry) => entry.id === latestMovement?.productId) ??
      products.find((entry) => entry.id === pendingRequest?.details?.productId) ??
      products[0] ?? null;
    const warehouse = warehouses.find((entry) => entry.id === warehouseId) ?? null;
    const safeReserved = Math.max(0, Number(allocation?.reservedQuantity ?? 0));
    const quantity = Number(allocation?.quantity ?? 0);
    const adjustmentId = pendingRequest?.id ?? latestMovement?.referenceId ?? latestMovement?.id ?? latestIssue?.id ?? "pending-adjustment";

    let adjustmentStatus = "pending_approval";
    if (pendingRequest) {
      adjustmentStatus = pendingRequest.details?.status ?? "pending_approval";
    } else if (latestMovement != null) {
      adjustmentStatus = "approved";
    }

    return {
      latestMovement,
      latestIssue,
      latestTransfer,
      allocation,
      product,
      warehouse,
      safeReserved,
      quantity,
      available: Math.max(0, quantity - safeReserved),
      adjustmentId,
      adjustmentStatus,
      adjustmentReason: pendingRequest?.details?.notes ?? latestMovement?.notes ?? latestIssue?.notes ?? "Evidence adjustment request",
      pendingRequest,
    };
  }, [stockCard, issues, transfers, stockAllocations, products, warehouses, warehouseId, adjustmentRequests]);

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

    const response = await fetch('/api/stock-allocations/adjustments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: allocationForm.productId,
        warehouseId,
        quantity,
        notes: `Manual allocation adjustment requested by ${user?.role}`,
      }),
    });

    if (!response.ok) {
      toast({
        title: "Request failed",
        description: "Failed to submit adjustment request.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Request submitted",
      description: "Adjustment request is pending approval.",
    });

    setAllocationForm({ productId: "", quantity: "" });
    fetchRequests();
  }

  async function handleApproveAdjustment() {
    if (!latestInventoryEvidence.pendingRequest) return;
    const id = latestInventoryEvidence.pendingRequest.id;
    const res = await fetch(`/api/stock-allocations/adjustments/${id}/approve`, { method: 'POST' });
    if (res.ok) {
      toast({ title: "Adjustment Approved" });
      fetchRequests();
      setTimeout(() => window.location.reload(), 1000);
    } else {
      toast({ title: "Failed to approve", variant: "destructive" });
    }
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
        <h4 className="text-sm font-semibold mb-1">Inventory Adjustment (Manual Allocation)</h4>
        <p className="mb-3 text-xs text-muted-foreground">
          Product master context: {canManageItems ? "you can manage item master records" : "item master is read-only for this role"}.
        </p>
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
          <div className="flex flex-col items-start justify-end gap-1">
            <Button 
              type="submit" 
              className="w-full"
            >
              Request Adjustment
            </Button>
          </div>
        </form>

        <div className="mt-6 overflow-x-auto">
          {adjustmentRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending adjustments.</p>
          ) : (
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2">Date</th>
                  <th className="py-2">Product ID</th>
                  <th className="py-2">Requested Qty</th>
                  <th className="py-2">Notes</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {adjustmentRequests.map((req) => (
                  <tr key={req.id} className="border-b">
                    <td className="py-2">{new Date(req.createdAt).toLocaleString()}</td>
                    <td className="py-2">{req.details?.productId}</td>
                    <td className="py-2">{req.details?.quantity}</td>
                    <td className="py-2">{req.details?.notes || "-"}</td>
                    <td className="py-2">{req.details?.status}</td>
                    <td className="py-2">
                      {req.details?.status === "pending_approval" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              disabled={!canApproveAdjustment}
                              title={!canApproveAdjustment ? "Requires Inventory Manager role" : ""}
                            >
                              Approve
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Approve Inventory Adjustment</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to approve this adjustment of {req.details?.quantity} units for product ID: {req.details?.productId}? This will immediately update the stock balance and create a movement ledger entry.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => {
                                  fetch(`/api/stock-allocations/adjustments/${req.id}/approve`, { method: "POST" })
                                    .then((res) => {
                                      if (res.ok) {
                                        toast({ title: "Adjustment Approved" });
                                        fetchRequests();
                                        setTimeout(() => window.location.reload(), 1000);
                                      } else {
                                        toast({ title: "Failed to approve", variant: "destructive" });
                                      }
                                    });
                                }}
                              >
                                Confirm Approval
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-sky-300/30 p-4 bg-white/60 dark:bg-white/5">
        <h4 className="text-sm font-semibold mb-3">Inventory Transfer</h4>
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
                  {allocation.product?.name ?? allocation.productId} (avail: {Math.max(0, allocation.quantity - Math.max(0, allocation.reservedQuantity))})
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
            <Button 
              disabled={createTransfer.isPending || !canAdjust} 
              title={!canAdjust ? "Requires Inventory Manager/Admin" : ""}
              type="submit" 
              className="w-full md:w-auto"
            >
              Create Transfer (Pending)
            </Button>
            {!canAdjust && <p className="text-xs text-muted-foreground mt-1">Requires Inventory Manager/Admin</p>}
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
                              disabled={completeTransfer.isPending || !canAdjust}
                              title={!canAdjust ? "Requires Inventory Manager/Admin" : ""}
                              onClick={() => completeTransfer.mutate(transfer.id)}
                            >
                              Complete
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={cancelTransfer.isPending || !canAdjust}
                              title={!canAdjust ? "Requires Inventory Manager/Admin" : ""}
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
                            disabled={reverseTransfer.isPending || !canAdjust}
                            title={!canAdjust ? "Requires Inventory Manager/Admin" : ""}
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
        <h4 className="text-sm font-semibold mb-3">Stock Issue / Item Issue & Reversal</h4>
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
                  {allocation.product?.name ?? allocation.productId} (avail: {Math.max(0, allocation.quantity - Math.max(0, allocation.reservedQuantity))})
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
            <Button 
              disabled={createIssue.isPending || !canAdjust} 
              title={!canAdjust ? "Requires Inventory Manager/Admin" : ""}
              type="submit" 
              className="w-full md:w-auto"
            >
              Post Stock Issue
            </Button>
            {!canAdjust && <p className="text-xs text-muted-foreground mt-1">Requires Inventory Manager/Admin</p>}
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
                        disabled={reverseIssue.isPending || !canAdjust}
                        title={!canAdjust ? "Requires Inventory Manager/Admin" : ""}
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
        <h4 className="text-sm font-semibold mb-1">Stock Card / Movement Ledger</h4>
        {!canMonitor && (
          <p className="mb-3 text-xs text-muted-foreground">
            Monitoring view requires Inventory Manager, Warehouse Staff, or Admin.
          </p>
        )}
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
                  <th className="py-2">Warehouse</th>
                  <th className="py-2">Qty Change</th>
                  <th className="py-2">Running Balance</th>
                  <th className="py-2">Reference</th>
                  <th className="py-2">Created By</th>
                  <th className="py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {stockCard.map((movement) => (
                  <tr key={movement.id} className="border-b">
                    <td className="py-2">{new Date(movement.createdAt).toLocaleString()}</td>
                    <td className="py-2">{movement.movementType}</td>
                    <td className="py-2">{movement.product?.name ?? movement.productId}</td>
                    <td className="py-2">{movement.warehouse?.name ?? movement.warehouseId}</td>
                    <td className="py-2">{movement.quantityChange > 0 ? `+${movement.quantityChange}` : movement.quantityChange}</td>
                    <td className="py-2">{movement.runningBalance ?? "-"}</td>
                    <td className="py-2">
                      {movement.referenceType ? `${movement.referenceType}:${movement.referenceId ?? "-"}` : "-"}
                    </td>
                    <td className="py-2">{movement.userId ?? "-"}</td>
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
              <p>Reserved: {Math.max(0, allocation.reservedQuantity)}</p>
              <p>Available: {Math.max(0, allocation.quantity - Math.max(0, allocation.reservedQuantity))}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}