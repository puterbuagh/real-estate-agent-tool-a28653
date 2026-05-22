import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createHash } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const SUPABASE_SCHEMA = process.env.NEXT_PUBLIC_SUPABASE_SCHEMA || "agentdesk";

async function requireUser(): Promise<
  { ok: true; userId: string } | { ok: false; response: NextResponse }
> {
  try {
    const supabase = await createServerClient();
    if (!supabase) {
      console.error("[property-overrides] Supabase client creation failed");
      return {
        ok: false,
        response: NextResponse.json(
          { ok: false, error: "supabase_unavailable" },
          { status: 500 }
        ),
      };
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error("[property-overrides] Auth error:", {
        message: authError.message,
        status: authError.status,
        name: authError.name,
      });
      return {
        ok: false,
        response: NextResponse.json(
          { ok: false, error: "auth_error", details: authError.message },
          { status: 401 }
        ),
      };
    }

    if (!user) {
      console.error("[property-overrides] No user found in session");
      return {
        ok: false,
        response: NextResponse.json(
          { ok: false, error: "unauthorized" },
          { status: 401 }
        ),
      };
    }

    console.log("[property-overrides] Auth successful, user ID:", user.id);
    return { ok: true, userId: user.id };
  } catch (err) {
    console.error("[property-overrides] Auth check threw exception:", err);
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "auth_exception", details: String(err) },
        { status: 500 }
      ),
    };
  }
}

export async function POST(req: NextRequest) {
  console.log("[property-overrides POST] Request received");
  console.log("[property-overrides POST] Using schema:", SUPABASE_SCHEMA);
  
  const auth = await requireUser();
  if (!auth.ok) {
    console.error("[property-overrides POST] Auth failed");
    return auth.response;
  }

  console.log("[property-overrides POST] Auth passed, user:", auth.userId);

  let body: unknown;
  try {
    body = await req.json();
    console.log("[property-overrides POST] Request body parsed:", JSON.stringify(body));
  } catch (err) {
    console.error("[property-overrides POST] JSON parse failed:", err);
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
    console.error("[property-overrides POST] Missing address");
    return NextResponse.json(
      { ok: false, error: "missing_address" },
      { status: 400 }
    );
  }

  console.log("[property-overrides POST] Address:", address);
  console.log("[property-overrides POST] Overrides:", JSON.stringify(overrides));

  const addressHash = createHash("sha256")
    .update(address.toLowerCase().trim())
    .digest("hex");

  console.log("[property-overrides POST] Address hash:", addressHash);

  const supabase = await createServerClient();
  if (!supabase) {
    console.error("[property-overrides POST] Supabase client unavailable");
    return NextResponse.json(
      { ok: false, error: "supabase_unavailable" },
      { status: 500 }
    );
  }

  console.log("[property-overrides POST] Attempting upsert...");

  try {
    const upsertData = {
      user_id: auth.userId,
      address_hash: addressHash,
      address,
      overrides,
      updated_at: new Date().toISOString(),
    };

    console.log("[property-overrides POST] Upsert data:", JSON.stringify(upsertData));

    const { data, error } = await supabase
      .schema(SUPABASE_SCHEMA)
      .from("property_overrides")
      .upsert(upsertData, {
        onConflict: "user_id,address_hash",
      })
      .select();

    if (error) {
      console.error("[property-overrides POST] Supabase upsert error:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        fullError: JSON.stringify(error),
      });
      return NextResponse.json(
        {
          ok: false,
          error: "database_error",
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        },
        { status: 500 }
      );
    }

    console.log("[property-overrides POST] Upsert successful:", JSON.stringify(data));
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    console.error("[property-overrides POST] Exception during upsert:", {
      error: err,
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return NextResponse.json(
      {
        ok: false,
        error: "save_failed",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  console.log("[property-overrides DELETE] Request received");
  console.log("[property-overrides DELETE] Using schema:", SUPABASE_SCHEMA);
  
  const auth = await requireUser();
  if (!auth.ok) {
    console.error("[property-overrides DELETE] Auth failed");
    return auth.response;
  }

  console.log("[property-overrides DELETE] Auth passed, user:", auth.userId);

  const address = req.nextUrl.searchParams.get("address");
  if (!address?.trim()) {
    console.error("[property-overrides DELETE] Missing address");
    return NextResponse.json(
      { ok: false, error: "missing_address" },
      { status: 400 }
    );
  }

  console.log("[property-overrides DELETE] Address:", address);

  const addressHash = createHash("sha256")
    .update(address.toLowerCase().trim())
    .digest("hex");

  console.log("[property-overrides DELETE] Address hash:", addressHash);

  const supabase = await createServerClient();
  if (!supabase) {
    console.error("[property-overrides DELETE] Supabase client unavailable");
    return NextResponse.json(
      { ok: false, error: "supabase_unavailable" },
      { status: 500 }
    );
  }

  console.log("[property-overrides DELETE] Attempting delete...");

  try {
    const { data, error } = await supabase
      .schema(SUPABASE_SCHEMA)
      .from("property_overrides")
      .delete()
      .eq("user_id", auth.userId)
      .eq("address_hash", addressHash)
      .select();

    if (error) {
      console.error("[property-overrides DELETE] Supabase delete error:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        fullError: JSON.stringify(error),
      });
      return NextResponse.json(
        {
          ok: false,
          error: "database_error",
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      console.log("[property-overrides DELETE] No matching record found");
      return NextResponse.json(
        { ok: false, error: "not_found" },
        { status: 404 }
      );
    }

    console.log("[property-overrides DELETE] Delete successful:", JSON.stringify(data));
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    console.error("[property-overrides DELETE] Exception during delete:", {
      error: err,
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return NextResponse.json(
      {
        ok: false,
        error: "delete_failed",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
