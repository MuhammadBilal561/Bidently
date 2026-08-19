# GEMINI_MODEL Configuration Verification

## Issue
Production was potentially using `GEMINI_MODEL=gemini-3.7-flash` or an outdated model reference due to inconsistency between code defaults and documentation.

## Investigation Results

### 1. Exact GEMINI_MODEL Values

**Code Default (lib/gemini.ts, lib/draft.ts):**
```typescript
const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
```

**.env.example:**
```bash
GEMINI_MODEL=gemini-flash-latest  # ✅ Correct
```

**docs/OWNER_GUIDE.md (before fix):**
```bash
GEMINI_MODEL=gemini-2.0-flash  # ❌ DEPRECATED MODEL
```

### 2. No Hardcoded Model Override
✅ The code uses `process.env.GEMINI_MODEL` with proper fallback. No hardcoded overrides found.

### 3. Currently Supported Models (as of August 2026)

**Recommended (Stable):**
- `gemini-flash-latest` - Alias that auto-updates to latest stable Flash (currently `gemini-3.7-flash`)
- `gemini-3.7-flash` - Latest stable Flash model (best for production)
- `gemini-3.6-flash` - Previous stable Flash
- `gemini-3.5-flash` - Legacy stable Flash

**Deprecated/Shut Down:**
- `gemini-2.0-flash` ❌ (Shut down - do NOT use)
- `gemini-2.0-flash-lite` ❌ (Shut down - do NOT use)

Source: https://ai.google.dev/gemini-api/docs/models

### 4. Production Environment Variables

**For Production Deployment:**

Set in Vercel/Render environment variables:
```bash
GEMINI_API_KEY=<your-api-key>         # Required
GEMINI_MODEL=gemini-flash-latest      # Recommended (auto-updates)
# OR
GEMINI_MODEL=gemini-3.7-flash         # Alternative (pinned version)
```

**Why `gemini-flash-latest` is recommended:**
- Automatically updates to latest stable Flash model
- No manual version updates needed
- Always uses best available free-tier model
- 2-week notice provided before breaking changes

**When to use specific version (e.g., `gemini-3.7-flash`):**
- Need predictable behavior for testing
- Concerned about automatic updates
- Experiencing issues with latest release

### 5. Fixed Documentation

**Updated docs/OWNER_GUIDE.md:**
- Changed example from `gemini-2.0-flash` (deprecated) to `gemini-3.7-flash` (current)
- Clarified that `gemini-flash-latest` is an alias that points to latest stable
- Added note about current model (`gemini-3.7-flash`)

## Consistency Verification

✅ **Code default:** `gemini-flash-latest`  
✅ **.env.example:** `gemini-flash-latest`  
✅ **docs/OWNER_GUIDE.md:** Now shows `gemini-3.7-flash` as example (correct)

## Production Checklist

If production is failing with model-related errors:

1. Check Vercel environment variables:
   - Go to Project → Settings → Environment Variables
   - Verify `GEMINI_MODEL` is set to `gemini-flash-latest` or `gemini-3.7-flash`
   - If it's set to `gemini-2.0-flash` or `gemini-3.7-flash` (typo), update it

2. Verify GEMINI_API_KEY is valid:
   ```bash
   curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=YOUR_KEY" \
     -H 'Content-Type: application/json' \
     -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
   ```

3. If no `GEMINI_MODEL` is set in production:
   - The code will default to `gemini-flash-latest` ✅
   - This is the correct behavior

## Files Changed
- `docs/OWNER_GUIDE.md` - Updated model recommendation from `gemini-2.0-flash` to `gemini-3.7-flash`
