import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, getErrorMessage } from "@/lib/api";
import { queryKeys, invalidateAfterOrderGraphChange, invalidateAfterStockChange } from "@/lib/react-query";
import { useToast } from "@/hooks/use-toast";
import type {
  CreateInvoiceInput,
  CreateOrderInput,
  Invoice,
  Order,
  ItemFulfillment,
  CreateItemFulfillmentInput,
  CustomerPayment,
  RecordCustomerPaymentInput,
  BillPayment,
  RecordBillPaymentInput,
} from "@/types";

export function useNetSuiteSalesOrders() {
  return useQuery({
    queryKey: queryKeys.netsuite.salesOrders(),
    queryFn: async () => {
      const response = await apiClient.netsuite.getSalesOrders();
      return response.data;
    },
  });
}

export function useCreateNetSuiteSalesOrder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<Order, Error, CreateOrderInput>({
    mutationFn: async (payload) => {
      const response = await apiClient.netsuite.createSalesOrder(payload);
      return response.data;
    },
    onSuccess: () => {
      invalidateAfterOrderGraphChange(queryClient);
      queryClient.invalidateQueries({ queryKey: queryKeys.netsuite.salesOrders() });
      toast({
        title: "Sales order created",
        description: "NetSuite sales order has been created.",
      });
    },
    onError: (error) => {
      toast({
        title: "Create sales order failed",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useNetSuiteItemFulfillments() {
  return useQuery({
    queryKey: queryKeys.netsuite.itemFulfillments(),
    queryFn: async () => {
      const response = await apiClient.netsuite.getItemFulfillments();
      return response.data;
    },
  });
}

export function useCreateNetSuiteItemFulfillment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<ItemFulfillment, Error, CreateItemFulfillmentInput>({
    mutationFn: async (payload) => {
      const response = await apiClient.netsuite.createItemFulfillment(payload);
      return response.data;
    },
    onSuccess: () => {
      invalidateAfterOrderGraphChange(queryClient);
      invalidateAfterStockChange(queryClient);
      queryClient.invalidateQueries({
        queryKey: queryKeys.netsuite.itemFulfillments(),
      });
      toast({
        title: "Item fulfillment posted",
        description: "Item fulfillment has been recorded.",
      });
    },
    onError: (error) => {
      toast({
        title: "Create item fulfillment failed",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useNetSuiteCustomerInvoices() {
  return useQuery({
    queryKey: queryKeys.netsuite.customerInvoices(),
    queryFn: async () => {
      const response = await apiClient.netsuite.getCustomerInvoices();
      return response.data;
    },
  });
}

export function useCreateNetSuiteCustomerInvoice() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<Invoice, Error, CreateInvoiceInput>({
    mutationFn: async (payload) => {
      const response = await apiClient.netsuite.createCustomerInvoice(payload);
      return response.data;
    },
    onSuccess: () => {
      invalidateAfterOrderGraphChange(queryClient);
      queryClient.invalidateQueries({
        queryKey: queryKeys.netsuite.customerInvoices(),
      });
      toast({
        title: "Customer invoice created",
        description: "Customer invoice has been generated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Create customer invoice failed",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useNetSuiteCustomerPayments() {
  return useQuery({
    queryKey: queryKeys.netsuite.customerPayments(),
    queryFn: async () => {
      const response = await apiClient.netsuite.getCustomerPayments();
      return response.data;
    },
  });
}

export function useRecordNetSuiteCustomerPayment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<
    { paymentDoc: CustomerPayment; invoice: Invoice },
    Error,
    RecordCustomerPaymentInput
  >({
    mutationFn: async (payload) => {
      const response = await apiClient.netsuite.recordCustomerPayment(payload);
      return response.data;
    },
    onSuccess: () => {
      invalidateAfterOrderGraphChange(queryClient);
      queryClient.invalidateQueries({
        queryKey: queryKeys.netsuite.customerPayments(),
      });
      toast({
        title: "Customer payment posted",
        description: "Customer payment has been recorded.",
      });
    },
    onError: (error) => {
      toast({
        title: "Record customer payment failed",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}

export function useNetSuiteBillPayments() {
  return useQuery({
    queryKey: queryKeys.netsuite.billPayments(),
    queryFn: async () => {
      const response = await apiClient.netsuite.getBillPayments();
      return response.data;
    },
  });
}

export function useRecordNetSuiteBillPayment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<
    { paymentDoc: BillPayment; vendorBill: unknown },
    Error,
    RecordBillPaymentInput
  >({
    mutationFn: async (payload) => {
      const response = await apiClient.netsuite.recordBillPayment(payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.netsuite.vendorBills() });
      queryClient.invalidateQueries({ queryKey: queryKeys.netsuite.billPayments() });
      toast({
        title: "Bill payment posted",
        description: "Vendor bill payment has been recorded.",
      });
    },
    onError: (error) => {
      toast({
        title: "Record bill payment failed",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    },
  });
}
