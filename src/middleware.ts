import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const isAuthenticated = !!req.nextauth.token;

    // Redirect authenticated users away from auth pages
    if (isAuthenticated && (pathname === "/login" || pathname === "/register")) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
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
          pathname === "/pricing" ||
          pathname.startsWith("/api/auth") ||
          pathname.startsWith("/api/polar/webhook")
        ) {
          return true;
        }

        // Dashboard routes require authentication
        if (pathname.startsWith("/dashboard") || pathname.startsWith("/api/")) {
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
  ],
};
