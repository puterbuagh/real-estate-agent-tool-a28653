import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createHash } from "crypto";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function requireUser(): Promise<
  { ok: true; userId: string } | { ok: false; response: NextResponse }
> {
  const supabase = createServerClient();
  if (!supabase) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "supabase_unavailable" },
        { status: 500 }
      ),
    };
  }

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return {
        ok: false,
        response: NextResponse.json(
          { ok: false, error: "unauthorized" },
          { status: 401 }
        ),
      };
    }

    return { ok: true, userId: user.id };
  } catch (err) {
    console.error("[property-overrides] auth check failed:", err);
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "auth_error" },
        { status: 500 }
      ),
    };
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 }
    );
  }

  const bodyObj = (body ?? {}) as {
    address?: unknown;
    overrides?: unknown;
  };

  const address =
    typeof bodyObj.address === "string" ? bodyObj.address.trim() : "";
  const overrides =
    bodyObj.overrides && typeof bodyObj.overrides === "object"
      ? bodyObj.overrides
      : {};

  if (!address) {
    return NextResponse.json(
      { ok: false, error: "missing_address" },
      { status: 400 }
    );
  }

  const addressHash = createHash("sha256")
    .update(address.toLowerCase().trim())
    .digest("hex");

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "supabase_unavailable" },
      { status: 500 }
    );
  }

  try {
    const { error } = await supabase.from("property_overrides").upsert(
      {
        user_id: auth.userId,
        address_hash: addressHash,
        address,
        overrides,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,address_hash",
      }
    );

    if (error) {
      console.error("[property-overrides POST] upsert failed:", error);
      return NextResponse.json(
        { ok: false, error: "database_error" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[property-overrides POST] threw:", err);
    return NextResponse.json(
      { ok: false, error: "save_failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const address = req.nextUrl.searchParams.get("address");
  if (!address?.trim()) {
    return NextResponse.json(
      { ok: false, error: "missing_address" },
      { status: 400 }
    );
  }

  const addressHash = createHash("sha256")
    .update(address.toLowerCase().trim())
    .digest("hex");

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "supabase_unavailable" },
      { status: 500 }
    );
  }

  try {
    const { error } = await supabase
      .from("property_overrides")
      .delete()
      .eq("user_id", auth.userId)
      .eq("address_hash", addressHash);

    if (error) {
      console.error("[property-overrides DELETE] delete failed:", error);
      return NextResponse.json(
        { ok: false, error: "database_error" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[property-overrides DELETE] threw:", err);
    return NextResponse.json(
      { ok: false, error: "delete_failed" },
      { status: 500 }
    );
  }
}
