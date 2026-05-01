# Model Sync Agent Workflow

Use this workflow when refreshing free-router model data, benchmark metadata,
OpenCode support, and generated site output.

## Required Rules

- Keep `data/model-rankings.json` as the single source of truth.
- Do not expose Artificial Analysis API keys in browser code, generated site
  files, or committed reports.
- Preserve existing benchmark fields when the Artificial Analysis fetch fails.
- Apply Artificial Analysis metadata only for deterministic or high-confidence
  matches.
- Treat missing OpenCode support as unknown unless a source confirms the model
  is unsupported.
- Keep automated tests optional. The enforced project checks are `lint`,
  `typecheck`, and `build`.
- Commit and push each finished task to remote `dev` before starting the next
  implementation task.

## Workflow

1. Run a dry sync and write a temporary or intentional report:

   ```bash
   bun run models:sync -- --report data/model-sync-report.json
   ```

2. Inspect the report for:

   - added provider models
   - removed provider models
   - benchmark changes
   - unmatched provider models
   - unmatched Artificial Analysis models
   - OpenCode unknown or unsupported models

3. Apply only high-confidence updates:

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

6. Summarize:

   - model additions/removals
   - benchmark updates
   - OpenCode support changes
   - unresolved items requiring manual review
   - verification results

## Commit Gate

After each finished task:

```bash
git status --short
git add <files-for-this-task-only>
git diff --cached
# Generate the message with $write-commit-msg.
git commit -m "<generated message>"
git push origin HEAD:dev
```

Never stage unrelated user changes.
