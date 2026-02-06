# pnpm workflow (frostdesk-core)

pnpm is the standard package manager and runner for this repo. This doc is the single source of truth for setup, daily use, and verification.

## One-time setup

1. **Approve build scripts** (removes esbuild warning):
   ```bash
   pnpm approve-builds
   ```
   Select `esbuild` when prompted, then confirm.

2. **Rebuild** (optional, after approve-builds):
   ```bash
   pnpm -r rebuild
   ```

## Clean install

From repo root:

```bash
pnpm -r install --no-frozen-lockfile
```

Use this after pulling lockfile changes or when workspace deps feel broken.

## Start dev

- **API + DB (default):** `pnpm -w dev` or `pnpm dev`  
  Runs `@frostdesk/db` and `@frostdesk/api` in parallel. API listens on port 3001.

- **Web app:** `pnpm dev:web` or `pnpm -C apps/web dev`  
  Runs Vite dev server (e.g. port 5173). Start in a separate terminal if needed.

## Troubleshooting

- **TypeScript errors in editor** (“Cannot find type definition file”):  
  Restart the TS server: Command Palette → **TypeScript: Restart TS server**. If it persists, run `pnpm -r install --no-frozen-lockfile` and restart again.

- **Nuke node_modules safely** (from repo root):
  ```bash
  rm -rf node_modules
  find apps packages -maxdepth 2 -type d -name node_modules -exec rm -rf {} + 2>/dev/null || true
  pnpm store prune   # optional
  pnpm -r install --no-frozen-lockfile
  ```

## Repo healthy: verification checklist

Run from root:

1. **Workspace deps:**  
   `pnpm -r list --depth 0`  
   Expect: all 10 workspace packages listed with their deps; no errors.

2. **API health** (with `pnpm -w dev` running):  
   `curl -i http://127.0.0.1:3001/health`  
   Expect: `{"ok":true}` or similar.  
   (0.0.0.0 is a bind address, not a routable destination for curl; use 127.0.0.1 or localhost.)

3. **One-command verify:**  
   `pnpm verify:pnpm`  
   Runs `scripts/verify_repo.sh`: pnpm version, workspace list, optional API health check; prints PASS/FAIL.

4. **Optional:** Start web app with `pnpm dev:web` and confirm it runs on 5173.
