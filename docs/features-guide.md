# SmartSplit Feature Guide

## Overview

SmartSplit is a full-stack expense sharing app for small groups. The current implementation supports user accounts, group management, equal-split expenses, balance calculation, and settlement suggestions.

## 1. Authentication

### Register
- Create a new account with name, email, and password
- Backend route: `POST /api/auth/register`
- Frontend page: `client/src/pages/Register.tsx`

### Login
- Sign in with email and password
- Stores the JWT token and user profile in local storage
- Backend route: `POST /api/auth/login`
- Frontend page: `client/src/pages/Login.tsx`

### Protected App Access
- Dashboard and group pages require a valid token
- Frontend component: `client/src/components/ProtectedRoute.tsx`
- Backend protected routes use bearer-token auth middleware

## 2. Dashboard and Groups

### Dashboard
- Loads all groups for the logged-in user
- Shows group cards with member count and expense count
- Frontend page: `client/src/pages/Dashboard.tsx`
- Backend route: `GET /api/groups`

### Create Group
- Create a new expense group from the dashboard
- Creator is automatically added as the first member
- Backend route: `POST /api/groups`

### Group Detail
- Displays group summary, members, expenses, balances, and settlement suggestions
- Frontend page: `client/src/pages/GroupDetail.tsx`

### Add Member
- Add a user to a group by email
- The invited person must already have a registered account
- Backend route: `POST /api/groups/:groupId/members`

## 3. Expense Management

### Add Expense
- Add a group expense with description and amount
- The logged-in user becomes the payer
- Current implementation uses equal split across all group members
- Backend route: `POST /api/expenses`

### Expense Feed
- Loads all expenses for a group in reverse chronological order
- Shows payer, amount, date, and per-member split details
- Backend route: `GET /api/expenses/:groupId`

### Split Preview
- The UI shows a live estimate of how much each member will owe before the expense is submitted

## 4. Balances and Settlements

### Balances
- Calculates each member's net position in the group
- Positive balance means the member should receive money
- Negative balance means the member owes money
- Backend route: `GET /api/groups/:groupId/balances`

### Settlement Suggestions
- Generates a minimal set of debtor-to-creditor payments
- Based on the greedy matching algorithm documented in `docs/settlement-algorithm.md`
- Backend route: `GET /api/groups/:groupId/settlements`

## 5. Frontend Infrastructure

### Client Stack
- React 19
- React Router
- Vite
- Tailwind CSS v4
- PWA support through `vite-plugin-pwa`

### API Integration
- Frontend requests are centralized in `client/src/api.ts`
- Vite proxies `/api` requests to `http://localhost:3000`

## 6. Current Product Limitations

The app is functional for the main coursework flow, but it does not yet include:

- Expense editing or deletion
- Custom split ratios
- Settlement payment recording
- Group deletion or renaming
- Invite links or email invitations
- Password reset
- Real-time updates between devices
- Deployment configuration for public multi-user access

## 7. Best Current Use Case

Right now the app is best suited for:

- Local development and demo use
- Coursework demonstration
- Small-group testing on a shared development setup

For real use with a friend on separate devices, both users need access to the same running backend and the same PostgreSQL database, which usually means deployment or local network hosting.
