import { NextResponse } from "next/server";
import { z } from "zod";

import { accessToken } from "@/auth/access-token";

const requestSchema = z.object({ code: z.string().min(1).max(256) });

export async function POST(request: Request): Promise<Response> {
  const expected = process.env.ACCESS_CODE;
  if (!expected) return NextResponse.json({ ok: true });

  const body = requestSchema.safeParse(await request.json());
  if (!body.success || (await accessToken(body.data.code)) !== (await accessToken(expected))) {
    return NextResponse.json({ error: "アクセスコードが違います" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("spatial_access", await accessToken(expected), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return response;
}
