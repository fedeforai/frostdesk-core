import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isValidLang, DEFAULT_LANG } from "@/lib/translations";

const LOCALES = ["en", "it", "fr", "de"];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const segments = pathname.split("/").filter(Boolean);

  // If first segment is a locale, keep it
  if (segments.length > 0 && LOCALES.includes(segments[0])) {
    return NextResponse.next();
  }

  // No locale: redirect to default (en) so / becomes /en
  const locale = DEFAULT_LANG;
  const newUrl = new URL(`/${locale}${pathname === "/" ? "" : pathname}`, request.url);
  return NextResponse.redirect(newUrl);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
