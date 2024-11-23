import { NextResponse } from 'next/server';

export async function middleware(request) {
  // Get the token from cookies
  const sessionCookie = request.cookies.get('__session');
  const isLoggedIn = !!sessionCookie;

  // Get the current path
  const { pathname } = request.nextUrl;

  // Paths that don't require authentication
  const publicPaths = ['/login'];
  const isPublicPath = publicPaths.includes(pathname);

  // If trying to access login page while logged in, redirect to home
  if (isLoggedIn && isPublicPath) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // If trying to access protected route while not logged in, redirect to login
  if (!isLoggedIn && !isPublicPath && pathname !== '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

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
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 