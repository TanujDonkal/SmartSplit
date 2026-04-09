# SmartSplit Run Guide and Current Status

## Current Status

### What is connected
- The React frontend is connected to the Express backend through `/api`
- Supabase Auth is used for sign up, sign in, password reset, and password updates
- Auth, groups, expenses, balances, and settlements all have matching frontend screens and backend routes
- Frontend production build passes
- Backend TypeScript build passes

### What is not confirmed as running right now
- PostgreSQL is not currently listening on `localhost:5432` in this environment
- Prisma could not confirm a live database connection

That means the codebase is connected, but the full app is not ready for actual end-to-end use until the database is running and migrated.

## Can You Use It With a Friend Right Now?

### Short answer
Not yet as a real shared app.

### Why
- The backend depends on PostgreSQL
- The local database is not running right now
- Even after local setup works, your friend cannot use your local app unless they can reach the same server and database

### What is needed for real shared use
- A running PostgreSQL instance
- Prisma migration applied
- Backend server running
- Frontend dev server or deployed frontend running
- Shared hosting or local network access so both users hit the same backend

## Local Setup Checklist

### 1. Start PostgreSQL

Make sure PostgreSQL is installed and running on port `5432`.

Expected database settings from `server/.env.example`:
- Database: `smartsplit`
- Host: `localhost`
- Port: `5432`

### 2. Check Server Environment

The server expects:
- `PORT`
- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

The repo already contains:
- `server/.env`
- `server/.env.example`

If needed, update `server/.env` to match your local PostgreSQL credentials.

### 3. Apply Prisma Migration

From `server/`:

```powershell
npx prisma migrate dev
```

If the database already exists and only needs schema sync:

```powershell
npx prisma migrate deploy
```

### 4. Run the Backend

From `server/`:

```powershell
npm.cmd run dev
```

Expected API base URL:
- `http://localhost:3000`

Health check:
- `GET http://localhost:3000/api/health`

### 5. Run the Frontend

From `client/`:

```powershell
npm.cmd run dev
```

Expected app URL:
- `http://localhost:5173`

The Vite proxy forwards frontend `/api` calls to the backend.

Required frontend environment values:
- `VITE_API_BASE_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### 6. End-to-End Manual Test

After both apps are running:

1. Register User A through Supabase Auth
2. Register User B through Supabase Auth
3. Log in as User A
4. Create a group
5. Add User B by email
6. Add an expense
7. Confirm balances appear
8. Confirm settlement suggestions appear

If all of that works, then SmartSplit is functioning correctly for the current feature set.

## Verified During Review

The following checks succeeded in this workspace:
- `server`: `npm.cmd run build`
- `client`: `npm.cmd run build`

The following runtime checks did not pass:
- Prisma live database status check
- PostgreSQL listener check on `localhost:5432`

## Practical Conclusion

### Is frontend connected to backend?
Yes, at the code and route level.

### Is the app fully working right now on this machine?
Not yet, because the database and required Supabase environment values are not currently available in this workspace.

### Can you use it as an expense split app with your friend right now?
Not yet for real shared use. First get PostgreSQL running, apply migrations, start both apps, and make the backend accessible to both users.
