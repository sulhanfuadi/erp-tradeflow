import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import { canAccessRoute } from "@/lib/role-helpers";
import ProcurementPage from "@/components/Pages/ProcurementPage";

export default async function ProcurementRoute() {
  const user = await getSession();

  if (user == null) {
    redirect("/login");
  }

  if (!canAccessRoute(user.role, "/procurement")) {
    redirect("/");
  }

  return <ProcurementPage />;
}
