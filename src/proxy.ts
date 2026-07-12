import { NextResponse, type NextRequest } from "next/server";

import { accessToken } from "@/auth/access-token";

export async function proxy(request: NextRequest) {
  const code = process.env.ACCESS_CODE;
  if (!code) return NextResponse.next();

  const token = request.cookies.get("spatial_access")?.value;
  if (token === await accessToken(code)) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return Response.json({ error: "アクセスコードが必要です" }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/access";
  url.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!access|api/access|_next/static|_next/image|favicon.ico).*)"],
};
