# Profile and Account

## Purpose

Profile and account management lets users maintain their personal information and remove their account if needed.

## User Workflow

1. User opens the Account tab on the dashboard.
2. User updates name, email, or default currency.
3. The backend saves the profile changes and the frontend updates the active session.
4. User can also choose to permanently delete the account after confirmation.

## Frontend Files

- `client/src/pages/Dashboard.tsx`
- `client/src/context/AuthContext.tsx`
- `client/src/api.ts`

## Backend Files

- `server/src/routes/auth.ts`
- `server/src/controllers/authController.ts`

## Database Models

- `User`

## Main Routes

- `PATCH /api/auth/me`
- `DELETE /api/auth/me`

## Implementation Notes

- Default currency is stored on the user profile and reused by expense forms.
- Account deletion is initiated from the frontend with confirmation prompts.
- The frontend updates the stored user object after profile changes.
