/**
 * useBackWithRefresh
 * Hook that invalidates all related queries before navigating back.
 * Ensures list/dashboard pages (user, admin, client, supplier) show fresh data.
 */

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  invalidateAllRelatedQueries,
  invalidateAfterOrderGraphChange,
} from "@/lib/react-query";

type EntityType =
  | "order"
  | "product"
  | "category"
  | "supplier"
  | "invoice"
  | "warehouse";

function runInvalidations(
  queryClient: ReturnType<typeof import("@tanstack/react-query").useQueryClient>,
  entity: EntityType,
) {
  // Order/invoice flows embed order status on product/category/supplier detail APIs
  if (entity === "order" || entity === "invoice") {
    invalidateAfterOrderGraphChange(queryClient);
    return;
  }
  invalidateAllRelatedQueries(queryClient);
}

/**
 * Returns:
 * - handleBack: invalidates relevant queries, then router.back()
 * - navigateTo: (path) => invalidates relevant queries, then router.push(path)
 * Use on back buttons in detail pages so list/dashboard shows fresh data.
 */
export function useBackWithRefresh(entity: EntityType) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleBack = () => {
    runInvalidations(queryClient, entity);
    router.back();
  };

  const navigateTo = (path: string) => {
    runInvalidations(queryClient, entity);
    router.push(path);
  };

  return { handleBack, navigateTo };
}
