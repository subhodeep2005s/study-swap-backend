
## Setup

1. **Install dependencies**

```bash
pnpm install
```

2. **Configure environment**

```bash
cp .env.example .env
```


ghj
Edit `.env` with your configuration values.

3. **Run database migrations**

```bash
pnpm db:migrate
```

4. **Start development server**

```bash
pnpm dev
```

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start dev server with hot-reload |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm typecheck` | Type check without building |
| `pnpm lint` | Check code for issues |
| `pnpm lint:fix` | Auto-fix lint issues |
| `pnpm format` | Format code |
| `pnpm db:migrate` | Run pending migrations |
| `pnpm db:migrate:new` | Create a new migration file |

## Project Structure

```
src/
├── config/          # App configuration (db, env, redis, logger, etc.)
├── core/
│   ├── errors/      # Custom error classes and error handler
│   ├── events/      # Event subscriber registrations
│   ├── middleware/   # Auth, RBAC, audit, validation, logging
│   ├── services/    # Core services (audit log)
│   └── utils/       # JWT, hashing, pagination, async handler
├── db/
│   └── migrations/  # SQL migration files
├── modules/
│   ├── auth/        # Authentication (register, login, OTP)
├── types/           # TypeScript type declarations
├── utils/           # Cache service, rate limiting
├── app.ts           # Express app setup
├── server.ts        # Server entry point
```

## Adding a New Module

1. Create a directory under `src/modules/your-module/`
2. Add the standard files:
   - `your-module.schema.ts` — Zod validation schemas
   - `your-module.service.ts` — Business logic
   - `your-module.controller.ts` — Request handlers
   - `your-module.routes.ts` — Route definitions
   - `your-module.openapi.ts` — OpenAPI registration
3. Register routes in `src/app.ts`
4. Create a migration: `pnpm db:migrate:new your-migration-name`

## API Documentation

Scalar API reference is available at `/docs` when the server is running.
The raw OpenAPI document is available at `/openapi`.
