# Authentication

## Purpose

Authentication gives users secure access to SmartSplit and stores the signed-in user in the frontend session.

## User Workflow

1. User opens the landing page.
2. User signs up from the register page or logs in from the login page.
3. The backend returns a JWT token and user data.
4. The frontend stores the token and user profile in local storage.
5. Protected pages use the token for authenticated API requests.

## Frontend Files

- `client/src/App.tsx`
- `client/src/pages/Home.tsx`
- `client/src/pages/Login.tsx`
- `client/src/pages/Register.tsx`
- `client/src/context/AuthContext.tsx`
- `client/src/context/useAuth.ts`
- `client/src/components/ProtectedRoute.tsx`
- `client/src/api.ts`

## Backend Files

- `server/src/routes/auth.ts`
- `server/src/controllers/authController.ts`
- `server/src/middleware/auth.ts`

## Database Models

- `User`

## Main Routes

- `POST /api/auth/register`
- `POST /api/auth/login`

## Implementation Notes

- JWT authentication is handled with bearer tokens.
- The frontend uses `AuthContext` to keep token and user state synchronized.
- Protected backend routes use `authenticate` middleware.
- Group detail and friend detail routes are protected in the frontend through `ProtectedRoute`.
