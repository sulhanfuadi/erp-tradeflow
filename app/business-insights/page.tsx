import { redirect } from "next/navigation";
import BusinessInsightPage from "@/components/Pages/BusinessInsightPage";
import { getSession } from "@/lib/auth-server";
import { canAccessRoute } from "@/lib/role-helpers";
import { getProductsForUser } from "@/lib/server/home-data";
import { getOrdersForUser } from "@/lib/server/orders-data";

/**
 * Business Insights route — server component.
 * If user is not logged in, redirect to login. Otherwise fetch products and orders on the server
 * and pass to BusinessInsightPage so the client can hydrate React Query in one round-trip.
 */
export default async function BusinessInsightsRoute() {
  const user = await getSession();
  if (!user) {
    redirect("/login");
  }

  if (!canAccessRoute(user.role, "/business-insights")) {
    redirect("/");
  }
  const [initialProducts, initialOrders] = await Promise.all([
    getProductsForUser(user.id),
    getOrdersForUser(user.id),
  ]);
  return (
    <BusinessInsightPage
      initialProducts={initialProducts}
      initialOrders={initialOrders}
    />
  );
}
