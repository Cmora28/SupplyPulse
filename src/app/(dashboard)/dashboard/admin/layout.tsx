import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

/**
 * Database check for every page under /dashboard/admin, including routes
 * added later. Client components under this layout must not be the only gate.
 */
export default async function AdminSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await requireAdmin();
  if (!access.ok) {
    redirect("/dashboard");
  }

  return children;
}
