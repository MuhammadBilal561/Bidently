// Verifies the role-based access-control table in lib/authz.ts.
// Run with: npm run test:authz
import assert from "node:assert";
import { assertRole } from "../lib/authz";

async function run() {
  // owners/admin manage members
  assert.ok(!assertRole("owner", "members:manage").error, "owner can manage members");
  assert.ok(!assertRole("admin", "members:manage").error, "admin can manage members");
  assert.ok(assertRole("bid_manager", "members:manage").error, "bid_manager cannot manage members");
  assert.ok(assertRole("reviewer", "members:manage").error, "reviewer cannot manage members");

  // library + tender management are owner/admin/bid_manager
  for (const role of ["owner", "admin", "bid_manager"]) {
    assert.ok(!assertRole(role, "library:manage").error, `${role} can manage library`);
    assert.ok(!assertRole(role, "tender:manage").error, `${role} can manage tenders`);
  }
  assert.ok(assertRole("contributor", "tender:manage").error, "contributor cannot delete tenders");

  // drafting is open to contributors, not to reviewers
  assert.ok(!assertRole("contributor", "draft:write").error, "contributor can draft");
  assert.ok(assertRole("reviewer", "draft:write").error, "reviewer cannot draft");

  // extraction is open to every role
  for (const role of ["owner", "admin", "bid_manager", "contributor", "reviewer"]) {
    assert.ok(!assertRole(role, "extract").error, `${role} can extract`);
  }

  // a missing role is treated as unauthorized
  assert.ok(assertRole(undefined, "extract").error, "missing role is denied");

  console.log("PASS — authz role gates behave as specified.");
}

run().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
