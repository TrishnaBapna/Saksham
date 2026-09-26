import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD || "trishna-admin-secure-2026";
const SESSION_COOKIE_NAME = "trishna_admin_session";

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    if (password === ADMIN_PASSWORD) {
      const response = NextResponse.json({
        success: true,
        message: "Authentication successful",
      });

      // Set secure HTTP-only session cookie
      response.cookies.set({
        name: SESSION_COOKIE_NAME,
        value: "authenticated-session-trishna-2026",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      return response;
    }

    return NextResponse.json(
      { error: "Incorrect admin password" },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Authentication request failed" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true, message: "Logged out" });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
