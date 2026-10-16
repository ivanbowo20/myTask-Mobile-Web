import { NextResponse } from "next/server";

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Baca token sesi Better Auth dari cookies
  const sessionToken =
    request.cookies.get("better-auth.session_token")?.value ||
    request.cookies.get("__Secure-better-auth.session_token")?.value;

  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");
  const isDashboardPage =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/tugas") ||
    pathname.startsWith("/kategori") ||
    pathname.startsWith("/notifikasi") ||
    pathname.startsWith("/pengaturan");

  // Jika buka root ("/")
  if (pathname === "/") {
    if (sessionToken) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Jika mencoba akses dashboard/tugas/dll tanpa sesi aktif -> lempar ke login
  if (isDashboardPage && !sessionToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Jika sudah login tapi buka /login atau /register -> lempar ke dashboard
  if (isAuthPage && sessionToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/tugas/:path*",
    "/kategori/:path*",
    "/notifikasi/:path*",
    "/pengaturan/:path*",
    "/login",
    "/register",
  ],
};

