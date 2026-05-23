/**
 * Stock Allocation, Transfer, and Stock Card query hooks
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, getErrorMessage } from "@/lib/api";
import { invalidateAfterStockChange, queryKeys } from "@/lib/react-query";
import { useToast } from "@/hooks/use-toast";
import type {
  StockAllocation,
  CreateStockAllocationInput,
  WarehouseStockSummary,
  CreateStockTransferInput,
  StockTransfer,
  StockMovement,
  CreateStockIssueInput,
} from "@/types";

/**
 * Get all stock allocations
 */
export function useStockAllocations() {
  return useQuery({
    queryKey: queryKeys.stockAllocation.lists(),
    queryFn: async () => {
      const response = await apiClient.stockAllocations.getAll();
      return response.data;
    },
  });
}

/**
 * Get warehouse stock summary
 */
export function useWarehouseStockSummary() {
  return useQuery({
    queryKey: queryKeys.stockAllocation.summary(),
    queryFn: async () => {
      const response = await apiClient.stockAllocations.getSummary();
      return response.data;
    },
  });
}

/**
 * Get stock allocations for a specific warehouse
 */
export function useStockByWarehouse(warehouseId: string) {
  return useQuery({
    queryKey: queryKeys.stockAllocation.byWarehouse(warehouseId),
    queryFn: async () => {
      const response =
        await apiClient.stockAllocations.getByWarehouse(warehouseId);
      return response.data;
    },
    enabled: !!warehouseId,
  });
}

/**
 * Get stock transfer list
 */
export function useStockTransfers(filters?: {
  productId?: string;
  warehouseId?: string;
}) {
  return useQuery({
    queryKey: [queryKeys.stockAllocation.transfers(), filters] as const,
    queryFn: async () => {
      const response = await apiClient.stockAllocations.getTransfers(filters);
      return response.data;
    },
  });
}

/**
 * Get stock issue list
 */
export function useStockIssues(filters?: {
  productId?: string;
  warehouseId?: string;
}) {
  return useQuery({
    queryKey: [queryKeys.stockAllocation.issues(), filters] as const,
    queryFn: async () => {
      const response = await apiClient.stockAllocations.getIssues(filters);
      return response.data;
    },
  });
}

/**
 * Get stock card movement log
 */
export function useStockCard(filters?: {
  productId?: string;
  warehouseId?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: queryKeys.stockAllocation.stockCard(
      filters?.warehouseId,
      filters?.productId,
    ),
    queryFn: async () => {
      const response = await apiClient.stockAllocations.getStockCard(filters);
      return response.data;
    },
  });
}

/**
 * Create or update stock allocation
 */
export function useCreateStockAllocation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateStockAllocationInput) => {
      const response = await apiClient.stockAllocations.create(data);
      return response.data;
    },
    onSuccess: (data: StockAllocation) => {
      invalidateAfterStockChange(queryClient);
      toast({
        title: "Stock allocation saved",
        description: `Stock allocated to ${data.warehouse?.name ?? "warehouse"}.`,
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Allocation failed",
        description:
          getErrorMessage(error) || "Failed to save stock allocation.",
        variant: "destructive",
      });
    },
  });
}

/**
 * Create transfer
 */
export function useCreateStockTransfer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateStockTransferInput) => {
      const response = await apiClient.stockAllocations.createTransfer(data);
      return response.data;
    },
    onSuccess: (transfer: StockTransfer) => {
      invalidateAfterStockChange(queryClient);
      toast({
        title: "Transfer created",
        description: `Transfer #${transfer.id.slice(-6)} is pending completion.`,
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Create transfer failed",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

/**
 * Complete transfer
 */
export function useCompleteStockTransfer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.stockAllocations.completeTransfer(id);
      return response.data;
    },
    onSuccess: () => {
      invalidateAfterStockChange(queryClient);
      toast({
        title: "Transfer completed",
        description: "Stock moved between warehouses successfully.",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Complete transfer failed",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

/**
 * Cancel transfer
 */
export function useCancelStockTransfer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.stockAllocations.cancelTransfer(id);
      return response.data;
    },
    onSuccess: () => {
      invalidateAfterStockChange(queryClient);
      toast({
        title: "Transfer cancelled",
        description: "Pending transfer has been cancelled.",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Cancel transfer failed",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

/**
 * Reverse completed transfer
 */
export function useReverseStockTransfer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const response = await apiClient.stockAllocations.reverseTransfer(id, {
        notes,
      });
      return response.data;
    },
    onSuccess: () => {
      invalidateAfterStockChange(queryClient);
      toast({
        title: "Transfer reversed",
        description: "Reversal transfer created and stock balances restored.",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Reverse transfer failed",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

/**
 * Create issue movement
 */
export function useCreateStockIssue() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateStockIssueInput) => {
      const response = await apiClient.stockAllocations.createIssue(data);
      return response.data;
    },
    onSuccess: (issue: StockMovement) => {
      invalidateAfterStockChange(queryClient);
      toast({
        title: "Stock issued",
        description: `Issue posted (${Math.abs(issue.quantityChange)} units).`,
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Stock issue failed",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

/**
 * Reverse issue movement
 */
export function useReverseStockIssue() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const response = await apiClient.stockAllocations.reverseIssue(id, {
        notes,
      });
      return response.data;
    },
    onSuccess: () => {
      invalidateAfterStockChange(queryClient);
      toast({
        title: "Issue reversed",
        description: "Issued stock has been restored.",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Reverse issue failed",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}
