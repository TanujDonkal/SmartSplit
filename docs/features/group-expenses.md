# Group Expenses

## Purpose

Group expenses track shared costs inside a group and connect them to balances and settlement suggestions.

## User Workflow

1. User opens a group detail page.
2. User clicks `Add expense`.
3. User enters description, amount, currency, date, note, optional receipt, and split mode.
4. The backend creates the expense and the related split rows.
5. The group detail page refreshes expenses, balances, and suggested settlements.
6. Existing expenses can be viewed, edited, commented on, or deleted.

## Frontend Files

- `client/src/pages/Dashboard.tsx`
- `client/src/pages/GroupDetail.tsx`
- `client/src/api.ts`

## Backend Files

- `server/src/routes/expenses.ts`
- `server/src/controllers/expenseController.ts`
- `server/src/controllers/settlementController.ts`

## Database Models

- `Expense`
- `ExpenseSplit`
- `ExpenseComment`
- `Group`

## Main Routes

- `POST /api/expenses`
- `GET /api/expenses/group/:groupId`
- `GET /api/expenses/:expenseId`
- `PATCH /api/expenses/:expenseId`
- `DELETE /api/expenses/:expenseId`
- `POST /api/expenses/:expenseId/comments`

## Implementation Notes

- The payer is always the signed-in user who creates the expense.
- Group expenses store both original currency values and normalized converted amounts.
- Expense comments are stored separately from the main expense record.
