# Password Recovery

## Purpose

Password recovery allows a user to reset their password by receiving an OTP at their registered email address.

## User Workflow

1. User opens the forgot password page.
2. User enters their registered email address.
3. The backend generates an OTP, stores its hash, and sends the OTP by email.
4. User enters the OTP and a new password.
5. The backend verifies the OTP and updates the password.

## Frontend Files

- `client/src/pages/ForgotPassword.tsx`
- `client/src/pages/Login.tsx`
- `client/src/api.ts`

## Backend Files

- `server/src/routes/auth.ts`
- `server/src/controllers/authController.ts`
- `server/src/utils/mailer.ts`

## Database Models

- `PasswordResetOtp`
- `User`

## Main Routes

- `POST /api/auth/forgot-password/request`
- `POST /api/auth/forgot-password/reset`

## Implementation Notes

- OTP values are stored as hashes rather than raw codes.
- Email delivery depends on SMTP environment variables in the deployed backend.
- OTPs have expiration and one-time-use behavior.
