import { NextResponse } from "next/server";
import { fail } from "./http";

/**
 * Role-based access control.
 *
 * A user's role lives in the JWT session (created at signup, updated when an
 * owner/admin changes it). Every gate here maps an action to the set of roles
 * allowed to perform it. All mutating routes must call `assertRole` after
 * `requireSession` and short-circuit on the returned error.
 */

export type AppRole = "owner" | "admin" | "bid_manager" | "contributor" | "reviewer";

export const ALL_ROLES: AppRole[] = [
  "owner",
  "admin",
  "bid_manager",
  "contributor",
  "reviewer",
];

export type AuthzGate =
  | "library:manage" // add/edit/delete content-library items
  | "tender:manage" // change tender status / delete a tender
  | "members:manage" // add/remove/changeroles of org members
  | "draft:write" // generate draft answers
  | "extract"; // run extraction on a document

const GATES: Record<AuthzGate, AppRole[]> = {
  "library:manage": ["owner", "admin", "bid_manager"],
  "tender:manage": ["owner", "admin", "bid_manager"],
  "members:manage": ["owner", "admin"],
  "draft:write": ["owner", "admin", "bid_manager", "contributor"],
  extract: ["owner", "admin", "bid_manager", "contributor", "reviewer"],
};

/**
 * Returns a 403 `NextResponse` if the given role isn't allowed for `gate`,
 * otherwise an empty (success) object. Use as:
 *
 *   const denied = assertRole(session.role, "library:manage");
 *   if (denied.error) return denied.error;
 */
export function assertRole(
  role: string | undefined,
  gate: AuthzGate
): { error?: NextResponse } {
  const allowed = GATES[gate];
  if (!allowed || !role || !allowed.includes(role as AppRole)) {
    return {
      error: fail("You don't have permission for this action.", 403),
    };
  }
  return {};
}