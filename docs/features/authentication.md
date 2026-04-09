# Authentication

## Purpose

Authentication gives users secure access to SmartSplit and stores the signed-in user in the frontend session.

## User Workflow

1. User opens the landing page.
2. User signs up from the register page or logs in from the login page.
3. The frontend authenticates with Supabase Auth.
4. The frontend receives a Supabase access token and synchronizes the signed-in user into the SmartSplit backend.
5. The frontend stores the active access token and user profile in local storage.
6. Protected pages use that token for authenticated API requests.

## Frontend Files

- `client/src/App.tsx`
- `client/src/pages/Home.tsx`
- `client/src/pages/Login.tsx`
- `client/src/pages/Register.tsx`
- `client/src/context/AuthContext.tsx`
- `client/src/context/useAuth.ts`
- `client/src/components/ProtectedRoute.tsx`
- `client/src/api.ts`
- `client/src/lib/supabase.ts`

## Backend Files

- `server/src/routes/auth.ts`
- `server/src/controllers/authController.ts`
- `server/src/middleware/auth.ts`
- `server/src/utils/supabaseAuth.ts`
- `server/src/utils/supabaseAdmin.ts`

## Database Models

- `User`

## Main Routes

- `POST /api/auth/me/sync`

## Implementation Notes

- Supabase Auth is the primary sign-up, sign-in, and password reset system used by the frontend.
- The frontend uses `AuthContext` to keep the Supabase access token and synced app user state synchronized.
- The backend verifies Supabase bearer tokens and uses `POST /api/auth/me/sync` to upsert the matching SmartSplit user record.
- Group detail and friend detail routes are protected in the frontend through `ProtectedRoute`.
