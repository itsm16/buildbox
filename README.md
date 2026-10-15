
<img width="1130" height="494" alt="image" src="https://github.com/user-attachments/assets/6c4d7aab-9a23-46cf-8fd5-e4c64bb11d12" />

----

🚀 Completed / Ongoing Work
1. Quick & Persistent Sandbox

🔹 Quick Sandbox

Generate a fast frontend preview directly from a GitHub repository URL

Enables rapid testing and iteration

Ideal for validating UI changes instantly

🔹 Persistent Sandbox

Persistent project previews

Access to detailed build logs

Automatic rebuilds on repository updates via GitHub webhooks

🔄 Planned Improvements / Upcoming Updates
1. GitHub Actions Integration

Automate project setup and build workflows

2. Cloudflare R2 for Asset Storage

Scalable and cost-efficient object storage

Faster asset delivery

Better handling of static files and build artifacts

3. AI-Powered File Generation

Automatic generation of essential configuration files

.Dockerfile

CI/CD configuration

Environment setup files

Reduces onboarding friction for beginners

Speeds up project setup for rapid prototyping

----

## Env

### Server (`server/.env`, loaded via `node --env-file=./.env`)

| Var | Required | Used in | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | `prisma/schema.prisma`, `src/prisma.config.ts` | Postgres connection (Prisma + app) |
| `GEMINI_KEY` | Yes (AI features) | `src/index.ts` | Gemini API key for AI file generation |
| `GITHUB_ID` | Yes (repo lookup) | `src/routes/gitRoutes.ts` | GitHub personal access token for Octokit repo APIs |
| `GITHUB_WEBHOOK_SECRET` | Yes (webhooks) | `src/routes/gitRoutes.ts` | Validates `x-hub-signature-256` on push webhooks |
| `NGROK_URL` | Yes (previews) | `src/routes/projectRoutes.ts` | Public base URL prefixed to `api/preview/:dirName` |
| `PORT` | No (default `4000`) | `src/index.ts` | Server listen port |

### Client (`client/.env.local`)

| Var | Required | Used in | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | `lib/auth.ts` | Same Postgres DB — better-auth session/account storage |
| `GITHUB_CLIENT_ID` | Yes (GitHub login) | `lib/auth.ts` | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | Yes (GitHub login) | `lib/auth.ts` | GitHub OAuth app client secret |
| `NEXT_PUBLIC_API_BASE_URL` | No (default `http://localhost:4000`) | `helpers/queries.ts` | Server API base URL (+ WS URL derivation) |
| `BETTER_AUTH_SECRET` | Yes (production) | better-auth (auto-read) | Session signing secret |
| `BETTER_AUTH_URL` | Yes (production) | better-auth (auto-read) | Canonical app URL (e.g. `http://localhost:3000`) |

