import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import ProcurementPage from "@/components/Pages/ProcurementPage";

export default async function ProcurementRoute() {
  const user = await getSession();

  if (user == null) {
    redirect("/login");
  }

  if (user.role === "client" || user.role === "supplier") {
    redirect("/");
  }

  return <ProcurementPage />;
}
