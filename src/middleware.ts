import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

import { sessionIsAdmin } from "@/lib/admin-guard";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const isAuthenticated = !!req.nextauth.token;

    // Redirect authenticated users away from auth pages
    if (
      isAuthenticated &&
      (pathname === "/login" ||
        pathname === "/register" ||
        pathname === "/forgot-password")
    ) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // A01: Admin routes use the JWT flag copied from User.isAdmin.
    // APIs still call requireAdmin() so a stale token cannot read data.
    if (pathname.startsWith("/dashboard/admin") || pathname.startsWith("/api/admin")) {
      if (!sessionIsAdmin(req.nextauth.token?.isAdmin)) {
        if (pathname.startsWith("/api/")) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Public routes that don't need authentication
        if (
          pathname === "/" ||
          pathname === "/login" ||
          pathname === "/register" ||
          pathname === "/forgot-password" ||
          pathname === "/reset-password" ||
          pathname.startsWith("/reset-password/") ||
          pathname === "/pricing" ||
          pathname.startsWith("/api/auth") ||
          pathname.startsWith("/api/polar/webhook")
        ) {
          return true;
        }

        // Dashboard and API routes require authentication
        if (
          pathname.startsWith("/dashboard") ||
          pathname.startsWith("/api/")
        ) {
          return !!token;
        }

        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/login",
    "/register",
    "/api/suppliers/:path*",
    "/api/reports/:path*",
    "/api/user/:path*",
    "/api/polar/create-checkout",
    "/api/polar/customer-portal",
    "/api/admin/:path*",
  ],
};
