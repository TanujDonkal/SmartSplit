# Password Recovery

## Purpose

Password recovery allows a user to reset their password through a Supabase-authenticated reset link flow.

## User Workflow

1. User opens the forgot password page.
2. User enters their registered email address.
3. The frontend asks Supabase Auth to send a reset email with a secure recovery link.
4. User opens the link from the email and returns to the SmartSplit update password page.
5. The frontend updates the password through Supabase Auth.

## Frontend Files

- `client/src/pages/ForgotPassword.tsx`
- `client/src/pages/UpdatePassword.tsx`
- `client/src/pages/Login.tsx`
- `client/src/lib/supabase.ts`

## Backend Files

- None required for the current reset-link flow

## Database Models

- Supabase Auth user records

## Main Routes

- No custom backend route is required for the current reset-link flow

## Implementation Notes

- Supabase handles secure recovery token creation and email delivery.
- The frontend redirect target must be allowed in Supabase Auth redirect URL settings.
- The update password screen depends on the recovery session created from the reset link.
