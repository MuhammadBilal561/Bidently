// Standalone entry point for running migrations without starting the app —
// useful in a deploy pipeline (`npm run db:migrate` as a build step).
// The dev server also auto-migrates on boot (see ./index.ts), so this
// script is optional for local development, not required.
import "./index";

console.log("✓ Migrations applied to data/bidently.db");
