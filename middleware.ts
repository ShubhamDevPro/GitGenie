import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";

// Define routes that don't require authentication
const publicRoutes = [
     "/",
     "/login",
     "/register",
     "/api/auth/register",
     "/api/auth/signin",
     "/api/auth/callback",
     "/api/auth/signout",
     "/api/auth/session",
     "/api/auth/csrf",
     "/api/auth/providers",
];

// Define routes that require authentication
const protectedRoutes = [
     "/dashboard",
     "/my-repositories",
     "/profile",
     "/settings",
     "/admin",
];

// Define API routes that require authentication
const protectedApiRoutes = [
     "/api/github",
     "/api/user",
     "/api/repositories",
     "/api/admin",
];

export default async function middleware(request: NextRequest) {
     // Block any attempts to access Gitea web interface
     // This prevents users from trying to access Gitea UI via proxy or redirects
     const { pathname } = request.nextUrl;
     const host = request.headers.get('host');
     const referer = request.headers.get('referer');

     if (pathname.includes('/gitea') ||
          pathname.includes('/git-web') ||
          host?.includes('34.0.3.6') ||
          referer?.includes('34.0.3.6:3000') ||
          request.nextUrl.searchParams.get('gitea_redirect')) {

          console.log(`🚫 Blocked Gitea UI access attempt: ${pathname} from ${request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'}`);

          return NextResponse.json(
               {
                    error: 'Git web interface access is not permitted',
                    message: 'Please use the provided clone URLs with your Git client',
                    redirectTo: '/dashboard',
                    supportedOperations: ['git clone', 'git push', 'git pull']
               },
               { status: 403 }
          );
     }

     // Log OAuth-related requests for debugging
     if (request.nextUrl.pathname.includes('/api/auth/')) {
          console.log(`🔍 Auth Request: ${request.method} ${request.nextUrl.pathname}`);

          // Log query parameters for OAuth callbacks
          if (request.nextUrl.searchParams.size > 0) {
               console.log('Query params:', Object.fromEntries(request.nextUrl.searchParams));
          }
     }

     // Get the session
     const session = await auth();
     const isAuthenticated = !!session?.user;

     // Check if route is public
     const isPublicRoute = publicRoutes.some(route =>
          pathname === route || pathname.startsWith(`${route}/`)
     );

     // Check if route is protected
     const isProtectedRoute = protectedRoutes.some(route =>
          pathname === route || pathname.startsWith(`${route}/`)
     );     // Check if API route is protected
     const isProtectedApiRoute = protectedApiRoutes.some(route =>
          pathname.startsWith(route)
     );

     // Handle authentication logic
     if (isProtectedRoute || isProtectedApiRoute) {
          if (!isAuthenticated) {
               // Redirect to login for protected routes
               if (isProtectedRoute) {
                    const loginUrl = new URL("/login", request.url);
                    loginUrl.searchParams.set("callbackUrl", pathname);
                    return NextResponse.redirect(loginUrl);
               }

               // Return 401 for protected API routes
               if (isProtectedApiRoute) {
                    return NextResponse.json(
                         { error: "Authentication required" },
                         { status: 401 }
                    );
               }
          }
     }

     // Redirect authenticated users away from auth pages
     if (isAuthenticated && (pathname === "/login" || pathname === "/register")) {
          const callbackUrl = request.nextUrl.searchParams.get("callbackUrl");
          const redirectUrl = callbackUrl || "/dashboard";
          return NextResponse.redirect(new URL(redirectUrl, request.url));
     }

     // Add security headers
     const response = NextResponse.next();

     // Security headers
     response.headers.set("X-Frame-Options", "DENY");
     response.headers.set("X-Content-Type-Options", "nosniff");
     response.headers.set("Referrer-Policy", "origin-when-cross-origin");
     response.headers.set(
          "Permissions-Policy",
          "camera=(), microphone=(), geolocation=()"
     );

     // Add user info to headers for server components (optional)
     if (isAuthenticated && session?.user) {
          response.headers.set("x-user-id", session.user.id);
          response.headers.set("x-user-email", session.user.email || "");
          response.headers.set("x-user-verified", session.user.isVerified.toString());
     }

     return response;
}

export const config = {
     matcher: [
          /*
           * Match all request paths except for the ones starting with:
           * - _next/static (static files)
           * - _next/image (image optimization files)
           * - favicon.ico (favicon file)
           * - public folder
           */
          "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
     ],
};
