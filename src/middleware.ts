import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";

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

    // A01: Protect admin routes at the middleware level
    if (pathname.startsWith("/dashboard/admin") || pathname.startsWith("/api/admin")) {
      const email = req.nextauth.token?.email;
      if (email !== ADMIN_EMAIL) {
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
