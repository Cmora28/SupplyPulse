"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";
import {
  LayoutDashboard,
  Factory,
  FileText,
  CreditCard,
  Settings,
  MessageSquare,
  Shield,
} from "lucide-react";

const ADMIN_EMAIL = "admin@example.com";

const navItems = [
  { key: "nav.overview" as const, href: "/dashboard", icon: LayoutDashboard },
  { key: "nav.suppliers" as const, href: "/dashboard/suppliers", icon: Factory },
  { key: "nav.reports" as const, href: "/dashboard/reports", icon: FileText },
  { key: "nav.billing" as const, href: "/dashboard/billing", icon: CreditCard },
  { key: "nav.settings" as const, href: "/dashboard/settings", icon: Settings },
  { key: "nav.support" as const, href: "/dashboard/support", icon: MessageSquare },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { t } = useTranslation();
  const isAdmin = session?.user?.email === ADMIN_EMAIL;

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-30">
      <div className="flex flex-col flex-grow border-r bg-card pt-5 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-6 mb-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Logo size={32} />
            <span className="text-lg font-bold">{t("common.appName")}</span>
          </Link>
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
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  pathname.startsWith("/dashboard/admin")
                    ? "bg-red-50 text-red-600"
                    : "text-red-400 hover:bg-red-50 hover:text-red-600"
                )}
              >
                <Shield className="h-4 w-4" />
                {t("nav.admin")}
              </Link>
            </>
          )}
        </nav>
        <div className="px-3 pb-4 mt-2 border-t pt-3">
          <LanguageSwitcher />
        </div>
      </div>
    </aside>
  );
}
