import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LandingPage from "@/components/landing/landing-page";

export const dynamic = "force-dynamic";

// The marketing/landing root. A signed-in visitor is sent straight to the
// app; a signed-out visitor sees the landing page. (The auth gate + dashboard
// live at /app/app/page.tsx.)
export default async function RootPage() {
  const cookieStore = await cookies();
  if (cookieStore.has("bidently_session")) {
    redirect("/app");
  }
  return <LandingPage />;
}