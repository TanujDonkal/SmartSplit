# SmartSplit Feature Guide

## Overview

SmartSplit is a full-stack expense sharing app that supports both friend-based and group-based splitting. The implementation now includes account management, friend management, group management, rich expense details, balances, settlements, receipt workflows, AI-assisted receipt parsing, an in-app AI assistant, and multi-currency expense support.

## Feature Documentation Index

Each major feature now has a separate implementation guide in `docs/features/`.

- `docs/features/authentication.md`
- `docs/features/friends.md`
- `docs/features/groups.md`
- `docs/features/friend-expenses.md`
- `docs/features/group-expenses.md`
- `docs/features/manual-splitting.md`
- `docs/features/balances-and-settlements.md`
- `docs/features/profile-and-account.md`
- `docs/features/password-recovery.md`
- `docs/features/receipts.md`
- `docs/features/ai-receipt-parsing.md`
- `docs/features/ai-chatbot.md`
- `docs/features/multi-currency.md`

## Suggested Reading Order

1. `docs/features/authentication.md`
2. `docs/features/friends.md`
3. `docs/features/groups.md`
4. `docs/features/friend-expenses.md`
5. `docs/features/group-expenses.md`
6. `docs/features/manual-splitting.md`
7. `docs/features/balances-and-settlements.md`
8. `docs/features/profile-and-account.md`
9. `docs/features/password-recovery.md`
10. `docs/features/receipts.md`
11. `docs/features/ai-receipt-parsing.md`
12. `docs/features/ai-chatbot.md`
13. `docs/features/multi-currency.md`

## Implementation Notes

- Frontend routing is defined in `client/src/App.tsx`
- Shared frontend API calls live in `client/src/api.ts`
- Backend route registration starts in `server/src/app.ts`
- Database structure is defined in `server/prisma/schema.prisma`
- Settlement algorithm details are still documented in `docs/settlement-algorithm.md`

## Current Scope

The feature guides are intended to document the implemented system as it exists in code. They focus on:

- what the feature does
- the user workflow
- the frontend and backend files involved
- the database models involved
- the main API routes
- important implementation behavior
