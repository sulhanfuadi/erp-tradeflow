import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import { canAccessRoute } from "@/lib/role-helpers";
import CategoriesPage from "@/components/Pages/CategoriesPage";
import { getCategoriesForUser } from "@/lib/server/home-data";

/**
 * Categories route — server component.
 * If user is not logged in, redirect to login. Otherwise fetch categories on the server
 * and pass to CategoriesPage so the client can hydrate React Query in one round-trip.
 */
export default async function CategoriesRoute() {
  const user = await getSession();
  if (!user) {
    redirect("/login");
  }

  if (!canAccessRoute(user.role, "/categories")) {
    redirect("/");
  }

  const initialCategories = await getCategoriesForUser(user.id);
  return <CategoriesPage initialCategories={initialCategories} />;
}
