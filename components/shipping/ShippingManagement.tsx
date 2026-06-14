"use client";

/**
 * Shipping Management Component
 * Admin component for generating labels and managing tracking
 */

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys, invalidateAllRelatedQueries } from "@/lib/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  useGenerateShippingLabel,
  useAddTrackingNumber,
} from "@/hooks/queries";
import {
  Truck,
  Package,
  Loader2,
  Tag,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import type { Order, ShippingCarrier } from "@/types";

interface ShippingManagementProps {
  order: Order;
  disabled?: boolean;
  trigger?: React.ReactNode;
  userRole?: string;
}

const CARRIERS: { value: ShippingCarrier; label: string }[] = [
  { value: "usps", label: "USPS" },
  { value: "ups", label: "UPS" },
  { value: "fedex", label: "FedEx" },
  { value: "dhl", label: "DHL" },
  { value: "other", label: "Other" },
];

export default function ShippingManagement({
  order,
  disabled,
  trigger,
  userRole,
}: ShippingManagementProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"auto" | "manual" | "fulfillment">("auto");

  // Fetch item fulfillments if fulfillment tab is active
  const [fulfillments, setFulfillments] = useState<any[]>([]);
  const [isFetchingFulfillments, setIsFetchingFulfillments] = useState(false);
  const [isFulfilling, setIsFulfilling] = useState(false);

  const isInventoryManager = userRole === "inventory_manager" || userRole === "admin";

  // Auto generate form state
  const [carrier, setCarrier] = useState<ShippingCarrier>("usps");

  // Manual tracking form state
  const [manualTrackingNumber, setManualTrackingNumber] = useState("");
  const [manualCarrier, setManualCarrier] = useState<ShippingCarrier>("usps");

  const generateLabelMutation = useGenerateShippingLabel();
  const addTrackingMutation = useAddTrackingNumber();

  const hasTrackingInfo = order.trackingNumber;
  const isShipped = order.status === "shipped" || order.status === "delivered";

  const handleGenerateLabel = () => {
    generateLabelMutation.mutate(
      {
        orderId: order.id,
        carrier,
      },
      {
        onSuccess: () => {
          setOpen(false);
        },
      },
    );
  };

  const handleAddTracking = () => {
    if (!manualTrackingNumber.trim()) return;

    addTrackingMutation.mutate(
      {
        orderId: order.id,
        trackingNumber: manualTrackingNumber.trim(),
        trackingCarrier: manualCarrier,
      },
      {
        onSuccess: () => {
          setOpen(false);
          setManualTrackingNumber("");
        },
      },
    );
  };

  const isLoading =
    generateLabelMutation.isPending || addTrackingMutation.isPending;

  // If already shipped, show tracking info
  if (hasTrackingInfo) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <CheckCircle className="h-4 w-4 text-green-500" />
        <span className="text-muted-foreground">
          Tracking: {order.trackingNumber}
        </span>
        <Badge variant="secondary" className="text-xs">
          {order.trackingCarrier?.toUpperCase() || "Unknown"}
        </Badge>
      </div>
    );
  }

  // Don't show for cancelled orders
  if (order.status === "cancelled") {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            disabled={disabled || isLoading}
            className="gap-2"
          >
            <Truck className="h-4 w-4" />
            {order.paymentStatus === "paid" ? "Ship Order" : "Add Shipping"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="p-4 sm:p-7 sm:px-8 poppins max-h-[90vh] overflow-y-auto flex flex-col overflow-hidden gap-8 border-emerald-400/30 dark:border-emerald-400/30 shadow-[0_30px_80px_rgba(16,185,129,0.35)] dark:shadow-[0_30px_80px_rgba(16,185,129,0.25)]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-white">
            <Package className="h-5 w-5" />
            Shipping Management
          </DialogTitle>
          <DialogDescription className="text-white/80">
            Generate a shipping label or add a tracking number for order{" "}
            <span className="font-mono font-medium text-white">
              {order.orderNumber}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 overflow-y-auto flex-1 pr-1 min-h-[340px]">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "auto" | "manual")}
            className="flex flex-col min-h-full"
          >
            <TabsList className="grid w-full grid-cols-3 h-11 p-1 rounded-lg bg-white/30 dark:bg-white/10 text-white shrink-0 border border-emerald-400/30 dark:border-white/20 shadow-[0_10px_30px_rgba(16,185,129,0.15)] dark:shadow-[0_10px_30px_rgba(16,185,129,0.1)]">
              <TabsTrigger
                value="auto"
                className="h-9 gap-2 rounded-md data-[state=active]:border data-[state=active]:border-emerald-400 data-[state=active]:ring-2 data-[state=active]:ring-emerald-500/50 data-[state=active]:bg-background data-[state=active]:text-slate-700 dark:data-[state=active]:text-white dark:data-[state=active]:bg-white/20 data-[state=active]:shadow-[0_10px_30px_rgba(16,185,129,0.15)]"
              >
                <Truck className="h-4 w-4" />
                Auto Generate
              </TabsTrigger>
              <TabsTrigger
                value="manual"
                className="h-9 gap-2 rounded-md data-[state=active]:border data-[state=active]:border-emerald-400 data-[state=active]:ring-2 data-[state=active]:ring-emerald-500/50 data-[state=active]:bg-background data-[state=active]:text-slate-700 dark:data-[state=active]:text-white dark:data-[state=active]:bg-white/20 data-[state=active]:shadow-[0_10px_30px_rgba(16,185,129,0.15)]"
              >
                <Tag className="h-4 w-4" />
                Manual Entry
              </TabsTrigger>
              {isInventoryManager && (
                <TabsTrigger
                  value="fulfillment"
                  onClick={async () => {
                    setIsFetchingFulfillments(true);
                    try {
                      const res = await fetch("/api/netsuite/item-fulfillments");
                      const data = await res.json();
                      const myFulfills = Array.isArray(data) ? data.filter(f => f.orderId === order.id) : [];
                      setFulfillments(myFulfills);
                    } catch (e) {
                      console.error(e);
                    } finally {
                      setIsFetchingFulfillments(false);
                    }
                  }}
                  className="h-9 gap-2 rounded-md data-[state=active]:border data-[state=active]:border-emerald-400 data-[state=active]:ring-2 data-[state=active]:ring-emerald-500/50 data-[state=active]:bg-background data-[state=active]:text-slate-700 dark:data-[state=active]:text-white dark:data-[state=active]:bg-white/20 data-[state=active]:shadow-[0_10px_30px_rgba(16,185,129,0.15)]"
                >
                  <Package className="h-4 w-4" />
                  Fulfillment
                </TabsTrigger>
              )}
            </TabsList>

            {/* Auto Generate Tab */}
            <TabsContent
              value="auto"
              className="space-y-4 mt-4 flex-1 min-h-0 data-[state=inactive]:hidden"
            >
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    This will generate a shipping label via Shippo and
                    automatically update the order status to
                    &quot;shipped&quot;. Label costs will be charged to your
                    Shippo account.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="carrier" className="text-white/90">
                  Carrier
                </Label>
                <Select
                  value={carrier}
                  onValueChange={(v) => setCarrier(v as ShippingCarrier)}
                >
                  <SelectTrigger
                    id="carrier"
                    className="h-11 w-full border-emerald-400/30 dark:border-white/20 bg-white/10 dark:bg-white/5 backdrop-blur-sm text-white placeholder:text-white/40 focus:border-emerald-400 focus:ring-emerald-500/50 shadow-[0_10px_30px_rgba(16,185,129,0.15)] dark:shadow-[0_10px_30px_rgba(16,185,129,0.1)]"
                  >
                    <SelectValue placeholder="Select carrier" />
                  </SelectTrigger>
                  <SelectContent
                    className="border-emerald-400/20 dark:border-white/10 bg-white/80 dark:bg-popover/50 backdrop-blur-sm z-[100]"
                    position="popper"
                    sideOffset={5}
                    align="start"
                  >
                    {CARRIERS.map((c) => (
                      <SelectItem
                        key={c.value}
                        value={c.value}
                        className="cursor-pointer text-gray-900 dark:text-white focus:bg-emerald-100 dark:focus:bg-white/10 focus:text-gray-900 dark:focus:text-white"
                      >
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleGenerateLabel}
                disabled={isLoading}
                className="h-11 w-full rounded-xl border border-emerald-400/30 dark:border-emerald-400/30 bg-gradient-to-r from-emerald-500/70 via-emerald-500/50 to-emerald-500/30 dark:from-emerald-500/70 dark:via-emerald-500/50 dark:to-emerald-500/30 text-white shadow-[0_15px_35px_rgba(16,185,129,0.45)] dark:shadow-[0_15px_35px_rgba(16,185,129,0.25)] backdrop-blur-sm transition duration-200 hover:border-emerald-300/40 hover:from-emerald-500/80 hover:via-emerald-500/60 hover:to-emerald-500/40 dark:hover:border-emerald-300/40 dark:hover:from-emerald-500/80 dark:hover:via-emerald-500/60 dark:hover:to-emerald-500/40 hover:shadow-[0_20px_45px_rgba(16,185,129,0.6)] dark:hover:shadow-[0_20px_45px_rgba(16,185,129,0.35)] focus-visible:ring-emerald-500/50"
              >
                {generateLabelMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Label...
                  </>
                ) : (
                  <>
                    <Truck className="mr-2 h-4 w-4" />
                    Generate Shipping Label
                  </>
                )}
              </Button>
            </TabsContent>

            {/* Manual Entry Tab */}
            <TabsContent
              value="manual"
              className="space-y-4 mt-4 flex-1 min-h-0 data-[state=inactive]:hidden"
            >
              <p className="text-sm text-white/70">
                Already have a tracking number from another source? Enter it
                here to update the order.
              </p>

              <div className="space-y-2">
                <Label htmlFor="manual-carrier" className="text-white/90">
                  Carrier
                </Label>
                <Select
                  value={manualCarrier}
                  onValueChange={(v) => setManualCarrier(v as ShippingCarrier)}
                >
                  <SelectTrigger
                    id="manual-carrier"
                    className="h-11 w-full border-emerald-400/30 dark:border-white/20 bg-white/10 dark:bg-white/5 backdrop-blur-sm text-white placeholder:text-white/40 focus:border-emerald-400 focus:ring-emerald-500/50 shadow-[0_10px_30px_rgba(16,185,129,0.15)] dark:shadow-[0_10px_30px_rgba(16,185,129,0.1)]"
                  >
                    <SelectValue placeholder="Select carrier" />
                  </SelectTrigger>
                  <SelectContent
                    className="border-emerald-400/20 dark:border-white/10 bg-white/80 dark:bg-popover/50 backdrop-blur-sm z-[100]"
                    position="popper"
                    sideOffset={5}
                    align="start"
                  >
                    {CARRIERS.map((c) => (
                      <SelectItem
                        key={c.value}
                        value={c.value}
                        className="cursor-pointer text-gray-900 dark:text-white focus:bg-emerald-100 dark:focus:bg-white/10 focus:text-gray-900 dark:focus:text-white"
                      >
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tracking-number" className="text-white/90">
                  Tracking Number
                </Label>
                <Input
                  id="tracking-number"
                  placeholder="Enter tracking number"
                  value={manualTrackingNumber}
                  onChange={(e) => setManualTrackingNumber(e.target.value)}
                  className="h-11 w-full border-emerald-400/30 dark:border-white/20 bg-white/10 dark:bg-white/5 backdrop-blur-sm text-white placeholder:text-white/40 focus-visible:border-emerald-400 focus-visible:ring-emerald-500/50 shadow-[0_10px_30px_rgba(16,185,129,0.15)] dark:shadow-[0_10px_30px_rgba(16,185,129,0.1)]"
                />
              </div>

              <Button
                onClick={handleAddTracking}
                disabled={isLoading || !manualTrackingNumber.trim()}
                className="h-11 w-full rounded-xl border border-emerald-400/30 dark:border-emerald-400/30 bg-gradient-to-r from-emerald-500/70 via-emerald-500/50 to-emerald-500/30 dark:from-emerald-500/70 dark:via-emerald-500/50 dark:to-emerald-500/30 text-white shadow-[0_15px_35px_rgba(16,185,129,0.45)] dark:shadow-[0_15px_35px_rgba(16,185,129,0.25)] backdrop-blur-sm transition duration-200 hover:border-emerald-300/40 hover:from-emerald-500/80 hover:via-emerald-500/60 hover:to-emerald-500/40 dark:hover:border-emerald-300/40 dark:hover:from-emerald-500/80 dark:hover:via-emerald-500/60 dark:hover:to-emerald-500/40 hover:shadow-[0_20px_45px_rgba(16,185,129,0.6)] dark:hover:shadow-[0_20px_45px_rgba(16,185,129,0.35)] focus-visible:ring-emerald-500/50"
              >
                {addTrackingMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding Tracking...
                  </>
                ) : (
                  <>
                    <Tag className="mr-2 h-4 w-4" />
                    Add Tracking Number
                  </>
                )}
              </Button>
            </TabsContent>

            {/* NetSuite Fulfillment Tab */}
            {isInventoryManager && (
              <TabsContent
                value="fulfillment"
                className="space-y-4 mt-4 flex-1 min-h-0 data-[state=inactive]:hidden"
              >
                <p className="text-sm text-white/70">
                  Manage NetSuite Item Fulfillments (Pick, Pack, Ship).
                </p>

                {isFetchingFulfillments ? (
                  <p className="text-sm text-white">Loading...</p>
                ) : fulfillments.length === 0 ? (
                  <div className="space-y-4">
                    <p className="text-sm text-white">No fulfillments found for this order.</p>
                    <Button
                      disabled={isFulfilling}
                      onClick={async () => {
                        setIsFulfilling(true);
                        try {
                          // Pass all items
                          const items = order.items.map((i: any) => ({
                            orderItemId: i.id,
                            quantity: i.quantity,
                          }));
                          const response = await fetch("/api/netsuite/item-fulfillments", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ orderId: order.id, items }),
                          });
                          if (!response.ok) {
                            const errData = await response.json().catch(() => ({}));
                            alert("Failed to pick: " + (errData.error || response.statusText));
                            return;
                          }
                          await invalidateAllRelatedQueries(queryClient);
                          // Refresh
                          const res = await fetch("/api/netsuite/item-fulfillments");
                          const data = await res.json();
                          const myFulfills = Array.isArray(data) ? data.filter((f: any) => f.orderId === order.id) : [];
                          setFulfillments(myFulfills);
                        } catch (e) {
                          console.error(e);
                        } finally {
                          setIsFulfilling(false);
                        }
                      }}
                      className="w-full h-11 bg-white/20 hover:bg-white/30 text-white"
                    >
                      {isFulfilling ? "Picking..." : "Pick (Create Fulfillment)"}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {fulfillments.map((f: any) => (
                      <div key={f.id} className="p-3 border border-white/20 rounded-lg bg-white/5 space-y-3">
                        <div className="flex justify-between items-center text-white">
                          <span className="font-medium">{f.fulfillmentNumber || f.id}</span>
                          <Badge variant="outline" className="text-white border-white/30">{f.status}</Badge>
                        </div>
                        <div className="flex gap-2">
                          {f.status === "picked" && (
                            <Button
                              size="sm"
                              disabled={isFulfilling}
                              onClick={async () => {
                                setIsFulfilling(true);
                                try {
                                  const response = await fetch(`/api/netsuite/item-fulfillments/${f.id}/pack`, { method: "POST" });
                                  if (!response.ok) {
                                    const errData = await response.json().catch(() => ({}));
                                    alert("Failed to pack: " + (errData.error || response.statusText));
                                    return;
                                  }
                                  await invalidateAllRelatedQueries(queryClient);
                                  const res = await fetch("/api/netsuite/item-fulfillments");
                                  const data = await res.json();
                                  const myFulfills = Array.isArray(data) ? data.filter((ff: any) => ff.orderId === order.id) : [];
                                  setFulfillments(myFulfills);
                                } catch (e) {
                                  console.error(e);
                                } finally {
                                  setIsFulfilling(false);
                                }
                              }}
                              className="flex-1 bg-amber-500/50 hover:bg-amber-500/70 text-white"
                            >
                              Pack
                            </Button>
                          )}
                          {f.status === "packed" && (
                            <Button
                              size="sm"
                              disabled={isFulfilling}
                              onClick={async () => {
                                setIsFulfilling(true);
                                try {
                                  const response = await fetch(`/api/netsuite/item-fulfillments/${f.id}/ship`, { method: "POST" });
                                  if (!response.ok) {
                                    const errData = await response.json().catch(() => ({}));
                                    alert("Failed to ship: " + (errData.error || response.statusText));
                                    return;
                                  }
                                  await invalidateAllRelatedQueries(queryClient);
                                  const res = await fetch("/api/netsuite/item-fulfillments");
                                  const data = await res.json();
                                  const myFulfills = Array.isArray(data) ? data.filter((ff: any) => ff.orderId === order.id) : [];
                                  setFulfillments(myFulfills);
                                } catch (e) {
                                  console.error(e);
                                } finally {
                                  setIsFulfilling(false);
                                }
                              }}
                              className="flex-1 bg-emerald-500/50 hover:bg-emerald-500/70 text-white"
                            >
                              Ship
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
