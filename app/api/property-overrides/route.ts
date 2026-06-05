import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const STORAGE_KEY_PREFIX = "agentdesk:property-overrides:";

function hashAddress(address: string): string {
  return createHash("sha256")
    .update(address.toLowerCase().trim())
    .digest("hex");
}

export async function POST(req: NextRequest) {
  console.log("[property-overrides POST] Request received (localStorage-only mode)");

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

  const addressHash = hashAddress(address);
  const storageKey = `${STORAGE_KEY_PREFIX}${addressHash}`;
  console.log("[property-overrides POST] Storage key:", storageKey);

  const data = {
    address,
    addressHash,
    storageKey,
    overrides,
    updatedAt: new Date().toISOString(),
  };

  console.log("[property-overrides POST] Save successful (localStorage-only):", JSON.stringify(data));
  return NextResponse.json({ ok: true, data });
}

export async function DELETE(req: NextRequest) {
  console.log("[property-overrides DELETE] Request received (localStorage-only mode)");

  const address = req.nextUrl.searchParams.get("address");
  if (!address?.trim()) {
    console.error("[property-overrides DELETE] Missing address");
    return NextResponse.json(
      { ok: false, error: "missing_address" },
      { status: 400 }
    );
  }

  console.log("[property-overrides DELETE] Address:", address);

  const addressHash = hashAddress(address);
  const storageKey = `${STORAGE_KEY_PREFIX}${addressHash}`;
  console.log("[property-overrides DELETE] Storage key:", storageKey);

  const data = {
    address,
    addressHash,
    storageKey,
    deletedAt: new Date().toISOString(),
  };

  console.log("[property-overrides DELETE] Delete successful (localStorage-only):", JSON.stringify(data));
  return NextResponse.json({ ok: true, data });
}
