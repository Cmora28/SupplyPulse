"use client";

import { useSession, signOut } from "next-auth/react";
import { useTranslation } from "@/i18n/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MobileNav } from "@/components/mobile-nav";
import { User, Settings, LogOut } from "lucide-react";
import Link from "next/link";

function getTierColor(tier: string) {
  switch (tier) {
    case "STANDARD":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "PREMIUM":
      return "bg-purple-100 text-purple-700 border-purple-200";
    case "ENTERPRISE":
      return "bg-amber-100 text-amber-700 border-amber-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

export function Header() {
  const { data: session } = useSession();
  const { t } = useTranslation();

  const initials = session?.user?.name
    ? session.user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <header className="sticky top-0 z-40 border-b bg-card">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2 md:hidden">
          <MobileNav />
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">S</span>
            </div>
            <span className="font-bold">{t("common.appName")}</span>
          </Link>
        </div>
        <div className="hidden md:block" />
        <div className="flex items-center gap-3">
          {session?.user?.subscriptionTier && (
            <Badge
              variant="outline"
              className={getTierColor(session.user.subscriptionTier)}
            >
              {session.user.subscriptionTier}
            </Badge>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{session?.user?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {session?.user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings" className="flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  {t("common.settings")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/billing" className="flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  {t("common.billing")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive cursor-pointer"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {t("common.signOut")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
