"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Menu,
  LayoutDashboard,
  Factory,
  FileText,
  CreditCard,
  Settings,
  MessageSquare,
  Shield,
  ClipboardList,
  Newspaper,
} from "lucide-react";
import { ADMIN_EMAIL } from "@/lib/admin-config";

const navItems = [
  { key: "nav.overview" as const, href: "/dashboard", icon: LayoutDashboard },
  { key: "nav.suppliers" as const, href: "/dashboard/suppliers", icon: Factory },
  { key: "nav.reports" as const, href: "/dashboard/reports", icon: FileText },
  { key: "nav.billing" as const, href: "/dashboard/billing", icon: CreditCard },
  { key: "nav.settings" as const, href: "/dashboard/settings", icon: Settings },
  { key: "nav.support" as const, href: "/dashboard/support", icon: MessageSquare },
];

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { data: session } = useSession();
  const { t } = useTranslation();
  const isAdmin = session?.user?.email === ADMIN_EMAIL;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">{t("nav.toggleMenu")}</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <div className="flex flex-col h-full pt-6">
          <div className="flex items-center px-6 mb-6">
            <Logo size={32} />
            <span className="ml-2 text-lg font-bold">{t("common.appName")}</span>
          </div>
          <nav className="flex-1 px-3 space-y-1">
            {navItems.map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {t(item.key)}
                </Link>
              );
            })}

            {isAdmin && (
              <>
                <div className="my-3 border-t" />
                <Link
                  href="/dashboard/admin"
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    pathname === "/dashboard/admin"
                      ? "bg-danger-bg text-danger"
                      : "text-danger hover:bg-danger-bg"
                  )}
                >
                  <Shield className="h-4 w-4" />
                  {t("nav.admin")}
                </Link>
                <Link
                  href="/dashboard/admin/audit"
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    pathname.startsWith("/dashboard/admin/audit")
                      ? "bg-danger-bg text-danger"
                      : "text-danger hover:bg-danger-bg"
                  )}
                >
                  <ClipboardList className="h-4 w-4" />
                  {t("nav.adminAudit")}
                </Link>
                <Link
                  href="/dashboard/admin/news"
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    pathname.startsWith("/dashboard/admin/news")
                      ? "bg-danger-bg text-danger"
                      : "text-danger hover:bg-danger-bg"
                  )}
                >
                  <Newspaper className="h-4 w-4" />
                  {t("nav.adminNews")}
                </Link>
              </>
            )}
          </nav>
          <div className="px-3 pb-4 mt-2 border-t pt-3">
            <LanguageSwitcher />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
