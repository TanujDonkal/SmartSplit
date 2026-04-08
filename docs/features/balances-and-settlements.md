# Balances and Settlements

## Purpose

Balances show how much each user owes or should receive. Settlements reduce complex debt into a smaller set of payments.

## User Workflow

1. Users add friend or group expenses.
2. The backend calculates running net balances from those expense records.
3. Group pages show per-member balances and suggested settlements.
4. Friend pages show the direct net balance between two users.
5. Friend settle-up creates a settlement activity that updates the direct balance.

## Frontend Files

- `client/src/pages/Dashboard.tsx`
- `client/src/pages/FriendDetail.tsx`
- `client/src/pages/GroupDetail.tsx`
- `client/src/api.ts`

## Backend Files

- `server/src/controllers/settlementController.ts`
- `server/src/controllers/friendExpenseController.ts`

## Database Models

- `Expense`
- `ExpenseSplit`
- `FriendExpense`

## Main Routes

- `GET /api/groups/:groupId/balances`
- `GET /api/groups/:groupId/settlements`
- `GET /api/friends/:friendId/summary`
- `POST /api/friends/:friendId/settle`

## Implementation Notes

- Group balances are based on `converted_amount` and `converted_amount_owed`.
- Group settlements use the greedy matching approach documented in `docs/settlement-algorithm.md`.
- Friend balances are calculated from direct friend activities and settlement entries.
- The dashboard combines friend and group net balances for the overall summary.
