import { Suspense } from "react";
import ClientReportClient from "./ClientReportClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ClientReportClient />
    </Suspense>
  );
}
