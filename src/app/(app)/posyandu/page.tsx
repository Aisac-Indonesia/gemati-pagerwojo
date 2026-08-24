import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { PosyanduList } from "@/modules/posyandu/PosyanduList";

export default async function PosyanduPage() {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/dashboard");
  return <PosyanduList />;
}
