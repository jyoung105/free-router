# /model-sync

Run the free-router model sync workflow from `docs/model-sync-agent.md`.

Steps:

1. Run:

   ```bash
   bun run models:sync -- --report data/model-sync-report.json
   ```

2. Inspect `data/model-sync-report.json` for added/removed models, benchmark
   changes, unresolved Artificial Analysis matches, and OpenCode unknown or
   unsupported entries.

3. Apply only high-confidence changes:

   ```bash
   bun run models:sync:apply -- --report data/model-sync-report.json
   ```

4. Regenerate the site:

   ```bash
   cd site && bun run generate
   ```

5. Verify:

   ```bash
   bun run lint
   bun run typecheck
   bun run build
   cd site && bun run build
   ```

Rules:

- Do not expose Artificial Analysis API keys in committed files or site output.
- Preserve existing benchmark data if the Artificial Analysis fetch fails.
- Do not apply low-confidence model matches silently.
- Treat OpenCode missing support as unknown unless confirmed unsupported.
- Keep automated tests optional; enforce only lint, typecheck, and build.
- Commit and push each completed task to `origin/dev` before moving on.
- Never stage unrelated user changes.

Final response must summarize model changes, benchmark changes, OpenCode support
changes, unresolved items, commits pushed, and verification results.
