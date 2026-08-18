import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "@/lib/auth";
import LandingPage from "@/components/landing/landing-page";

export const dynamic = "force-dynamic";

// The marketing/landing root. A *validated* signed-in visitor is sent straight
// to the app; a signed-out visitor (or someone carrying an expired/forged
// cookie) sees the landing page. We verify the token rather than merely
// checking that a cookie exists — otherwise a stale cookie bounces users
// between / and /app forever.
export default async function RootPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("bidently_session")?.value;
  if (token && (await verifySessionToken(token))) {
    redirect("/app");
  }
  return <LandingPage />;
}