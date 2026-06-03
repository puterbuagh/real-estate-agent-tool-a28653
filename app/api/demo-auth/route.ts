import { NextRequest, NextResponse } from "next/server";

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    if (!DEMO_PASSWORD) {
      console.error("DEMO_PASSWORD environment variable not configured");
      return NextResponse.json(
        { error: "Demo password not configured. Contact support." },
        { status: 500 }
      );
    }

    const isValid = password === DEMO_PASSWORD;

    return NextResponse.json({ isValid });
  } catch (error) {
    console.error("Demo auth error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
