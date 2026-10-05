import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { FirstSupplierOnboarding } from "@/components/first-supplier-onboarding";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  let supplierCount = 0;
  if (session?.user?.id) {
    supplierCount = await prisma.supplier.count({
      where: { userId: session.user.id },
    });
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Sidebar />
      <div className="md:pl-64">
        <Header />
        <main className="p-4 md:p-6 lg:p-8">{children}</main>
      </div>
      <FirstSupplierOnboarding
        supplierCount={supplierCount}
        userId={session?.user?.id ?? null}
      />
    </div>
  );
}
