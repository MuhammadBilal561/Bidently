import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { organizations, users, contentLibraryItems } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth";
import { setSessionCookie } from "@/lib/session";
import { SEED_CONTENT_LIBRARY } from "@/lib/content-library";
import { signupSchema } from "@/lib/validation";
import { AppError, ok, toErrorResponse, fail } from "@/lib/http";
import { clientKey, rateLimit, tooManyRequestsMsg } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const rl = rateLimit(`signup:${clientKey(req)}`, { limit: 5, windowMs: 60_000 });
  if (!rl.ok) return fail(tooManyRequestsMsg(), 429);

  try {
    const input = signupSchema.parse(await req.json());

    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, input.email));
    if (existing) {
      throw new AppError("An account with that email already exists.", 409);
    }

    const orgId = crypto.randomUUID();
    const userId = crypto.randomUUID();
    const now = new Date();

    await db.insert(organizations)
      .values({
        id: orgId,
        name: input.orgName || `${input.fullName || input.email}'s workspace`,
        planTier: "free",
        createdAt: now,
      });

    await db.insert(users)
      .values({
        id: userId,
        orgId,
        email: input.email,
        passwordHash: await hashPassword(input.password),
        fullName: input.fullName || null,
        role: "owner",
        createdAt: now,
      });

    for (const item of SEED_CONTENT_LIBRARY) {
      await db.insert(contentLibraryItems)
        .values({
          id: crypto.randomUUID(),
          orgId,
          title: item.title,
          body: item.body,
          category: item.category,
          tags: item.tags,
          createdAt: now,
        });
    }

    const res = ok({
      user: { id: userId, email: input.email, fullName: input.fullName, role: "owner" },
      orgId,
    }, 201);
    await setSessionCookie(res, { userId, orgId, email: input.email, role: "owner" });
    return res;
  } catch (err) {
    console.error("Signup failed:", err);
    return toErrorResponse(err, "Signup failed.");
  }
}

