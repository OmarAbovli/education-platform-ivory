import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getCurrentUser } from './lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('session_id')?.value;

  // Debug log (shown in terminal)
  // console.log(`Middleware: ${pathname} | Session: ${sessionCookie ? 'Yes' : 'No'}`);

  let user = null;
  try {
    user = await getCurrentUser(sessionCookie);
  } catch (err) {
    console.error("Middleware Auth Error:", err);
  }

  // Allow access to public pages
  if (pathname === '/login' || pathname === '/') {
    // If user is logged in and tries to access /login or /, redirect to their dashboard OR last visited page
    if (user) {
      const lastPath = request.cookies.get("last_visited_path")?.value

      // If we have a saved path and it matches the user's role (security check), go there
      if (lastPath && lastPath.startsWith(`/${user.role}`)) {
        return NextResponse.redirect(new URL(lastPath, request.url));
      }

      // Fallback to default dashboards
      if (user.role === 'admin') return NextResponse.redirect(new URL('/admin', request.url));
      if (user.role === 'teacher') return NextResponse.redirect(new URL('/teacher', request.url));
      if (user.role === 'student') return NextResponse.redirect(new URL('/student', request.url));
    }
    return NextResponse.next();
  }

  // Protected routes
  if (pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (user.role !== 'admin') {
      return NextResponse.redirect(new URL('/access-denied', request.url)); // Or redirect to their own dashboard
    }
  }

  if (pathname.startsWith('/teacher')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (user.role !== 'teacher' && user.role !== 'admin') { // Admin can also access teacher routes
      return NextResponse.redirect(new URL('/access-denied', request.url));
    }
  }

  if (pathname.startsWith('/student')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (user.role !== 'student' && user.role !== 'admin') { // Admin can also access student routes
      return NextResponse.redirect(new URL('/access-denied', request.url));
    }
  }

  // If no specific redirection, continue
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - paymob (payment callbacks)
     * - public files with extensions: png, jpg, jpeg, gif, svg
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg)$).*)',
  ],
};
