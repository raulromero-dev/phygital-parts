# Google sign-in and project storage

Local examples, browser saves and JSON exports work without Supabase. For account
saves, create a Supabase project and apply `supabase/migrations/` with the Supabase
CLI (`supabase link`, then `supabase db push`). Use a separate project for a fork.

Create a Google Cloud OAuth **Web application** client with basic email/profile
access. Set its authorized redirect URI to
`https://<project-ref>.supabase.co/auth/v1/callback`. Configure Google in Supabase
Auth, set your deployed site URL and allow exact OAuth return URLs such as
`https://your-domain/?auth=callback`. Add localhost callbacks only for development.
Set the Google audience to production when ready. A public homepage/privacy
policy is needed for branding. See the [official setup](https://supabase.com/docs/guides/auth/social-sign-in/auth-google).

The checked-in CLI config accepts `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` and
`SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` through environment substitution. Secrets
belong in your deployment/configuration environment, never in source control.
Review the config diff before pushing; retain existing security settings.

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local` and the Vercel
build environment, then rebuild. Both are public client configuration; row-level
security is the access boundary. **Never put a service-role key or OAuth client
secret in a VITE_ variable.** Google auth sessions persist through the SDK.
Visitor OpenAI keys remain in tab memory and are not stored in Supabase.

## Storage contract

- `projects`: owner ID, bounded document and last 40 chat messages, revision and
  timestamps. RLS limits all operations to `auth.uid() = owner_id`; anon has no
  access. Client reads use the public anon key and the signed-in user's JWT.
- `save_project`: inserts a new UUID or updates only the expected revision.
  A stale revision fails with `PROJECT_CONFLICT`. No blind upsert is used.
- `pending_projects`: administrative private staging only. Neither anon nor
  authenticated clients can read it. `claim_pending_projects` requires a matching
  confirmed email **and** verified Google identity. It moves only that user's
  prepared documents into their account. Never commit prepared user documents.
- `src/cloud-sync.js` serializes writes. Offline drafts remain in a user-scoped
  browser cache; conflicts stop automatic writes and offer Save a copy.
- Anonymous discovery never lists account caches. Account changes clear visible
  cloud data and cancel stale save callbacks. Cloud links require the owner’s sign-in. Explicit `/share/<token>` links read
  a separate published snapshot; they never expose private cloud rows. RLS still
  checks every server operation.

Local examples are not uploaded merely by signing in. New prompted builds save
to the signed-in account. **Save to account**, **Save a copy**, and **Import
project** create independent account projects when signed in. Account autosave
includes chat; JSON export does not. Local snapshots remain on that browser.

## Verification

`npm test` covers serialization, offline retries, conflict handling, account-cache
isolation, local-save migration and assistant actions. To verify real database
permissions, run `node tests/integration/projects-rls.mjs` with `DATABASE_URL`,
`PGPASSWORD` and (for Supabase's CA) `PGSSLROOTCERT`. Download the certificate from
Database Settings → SSL configuration. The test verifies TLS and uses a single
rolled-back transaction for two disposable identities, foreign-row denial,
anonymous denial, stale writes and verified Google claims. It sends no mail and
leaves no fixtures. Keep credentials out of shell history and test output.

Also verify Google return navigation, project creation/edit/reload, sign-out,
mobile account controls and a second browser before publishing. Do not claim a
live sign-in test based on mocked auth. OpenAI behavior is tested with mock
providers; paid model access is a separate visitor capability.

## Share and remix

Share → Create share link saves a browser project to the owner's account first,
then publishes a snapshot. The public `/share/<uuid>` page permits inspection,
orbiting, cable inspection and exports without a session. Editing controls offer
Remix. Google sign-in is needed only to create the visitor's independent account
copy; returning from Google resumes the requested remix. Signed-in visitors can
remix directly. The source owner's document and chat are never modified.

`project_shares` has owner-only SELECT and no client table writes. The bounded
`get_shared_project(token)` RPC returns only a snapshot and its publication time;
there is no anonymous listing endpoint. `publish_project` checks ownership and
revision, applies a top-level allowlist, and keeps the existing random link when
updating. Chat, brief, project links, research, review notes and decisions are
excluded. Component descriptions/models, purchase links and cable notes are part
of the shared assembly. Only included custom parts and active conductors publish.
`remix_shared_project` requires auth and chooses the new owner from `auth.uid()`;
callers cannot choose another owner or write to the source. `revoke_project_share`
removes the public snapshot. Republishing generates a new token; existing remixes
and any exported copies remain independent. Anyone holding an active link can
read it; unguessable links are not confidential access controls.

Public routes are marked noindex and skipped by client analytics; public copies
and chat are not inserted into the browser's project library. Future owner edits
remain private until **Update shared version** is selected. The database test
also checks anonymous reads, blocked listing/writes, independent ownership,
private-field omission, snapshot updates, revocation and preserved remixes.
