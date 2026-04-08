# Manual Splitting

## Purpose

Manual splitting allows a group expense to be divided by custom amounts instead of always using equal shares.

## User Workflow

1. User opens the group expense form.
2. User chooses `manual` split mode.
3. The UI shows a custom amount input for each member.
4. User enters all member amounts until the total matches the expense amount.
5. The backend validates the submitted split values.
6. The expense is saved only if the custom split total matches the full expense amount.

## Frontend Files

- `client/src/pages/GroupDetail.tsx`
- `client/src/api.ts`

## Backend Files

- `server/src/controllers/expenseController.ts`

## Database Models

- `Expense`
- `ExpenseSplit`

## Main Routes

- `POST /api/expenses`
- `PATCH /api/expenses/:expenseId`

## Implementation Notes

- Equal splitting still exists and remains the default fallback.
- Manual split validation happens in both the frontend and backend.
- The backend builds `ExpenseSplit` rows using either equal mode or manual mode.
- Converted split amounts are also stored so balances continue to work correctly with currency conversion.
