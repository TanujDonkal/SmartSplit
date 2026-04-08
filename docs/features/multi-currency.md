# Multi-Currency

## Purpose

Multi-currency support allows expenses to be created in supported currencies while balances and settlements stay consistent through normalized converted values.

## User Workflow

1. User chooses a default currency in profile settings.
2. User can still choose a currency per expense.
3. When the expense is saved, the backend converts the original amount to the base currency.
4. Balances and settlements are calculated from the normalized converted values.
5. The UI still shows the original expense currency where relevant.

## Frontend Files

- `client/src/pages/Dashboard.tsx`
- `client/src/pages/FriendDetail.tsx`
- `client/src/pages/GroupDetail.tsx`
- `client/src/api.ts`

## Backend Files

- `server/src/controllers/authController.ts`
- `server/src/controllers/expenseController.ts`
- `server/src/controllers/friendExpenseController.ts`
- `server/src/controllers/settlementController.ts`
- `server/src/utils/currency.ts`

## Database Models

- `User`
- `Expense`
- `ExpenseSplit`
- `FriendExpense`

## Main Routes

- `PATCH /api/auth/me`
- `POST /api/expenses`
- `PATCH /api/expenses/:expenseId`
- `POST /api/friends/:friendId/expenses`
- `PATCH /api/friends/:friendId/expenses/:expenseId`

## Implementation Notes

- Supported currencies are shared in the frontend API layer.
- Expenses store original currency, exchange rate to base, and converted amount.
- Group split rows also store normalized converted owed amounts.
- The balance engine uses converted values so cross-currency calculations remain consistent.
