# Engineering, security and release runbook

## Architecture

- Static HTML, CSS and JavaScript are published through GitHub Pages.
- Browser state uses local storage; authenticated family planning uses Supabase.
- Supabase Row Level Security controls access to private family tables.
- The travel-assistant Edge Function verifies the user and family membership before calling OpenAI.
- The service worker caches public application resources, not authenticated API responses.

## Local checks

Run `npm ci`, `npx playwright install chromium webkit`, `npm run format:check`,
`npm run check`, `npm run verify:sri` and `npm test`.
CI tests Chromium and WebKit with desktop, mobile and iPhone SE viewports.
These are emulations, not tests on physical iPhones.

## Release and rollback

1. Confirm that all required PR checks passed on the exact head commit.
2. Merge only reviewed changes that preserve travel and photo approval data.
3. Confirm the Pages workflow's quality gate passed before its deploy job.
4. Verify the live website and photo-review page without altering family data.
5. If a release fails, revert the relevant merge commit in a new PR, rerun checks
   and deploy the verified rollback. Do not rewrite main history.

## Security limitations

The SQL schema in this repository is not proof of the live database configuration.
RLS must be tested in an isolated Supabase project using anonymous, unrelated,
family-member and admin accounts. Verify both allowed and denied reads/writes.
Do not use real family records for destructive tests.

The Edge Function currently has no durable per-user rate limit or enforced cost budget.
Do not claim it is abuse-resistant until these controls are implemented and tested.
The browser tests use deterministic mocked resources; they do not verify the live
Supabase deployment or physical iPhone behavior.

## Troubleshooting

- Formatting failure: inspect the Prettier warnings and run Prettier locally.
- SRI failure: verify the pinned dependency bytes and update the matching integrity
  metadata together; never invent a hash.
- Browser failure: inspect the exact job logs and reproduce with the same browser
  and viewport.
- Auth failure: inspect the user session and family membership without logging tokens.
- Stale client: inspect service-worker version and cached public resources.
- Deployment failure: confirm that every quality-gate job completed successfully.

## Rules for future maintainers and coding agents

Never change the trip dates, activity choices, family records or approved photo
decisions without explicit approval. Never put secrets in public source files.
Keep PRs scoped and tests reproducible. Never treat static RLS checks as proof
of live database permissions. Report unverified checks as unverified.
