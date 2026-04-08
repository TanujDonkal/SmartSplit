# Friend Expenses

## Purpose

Friend expenses support direct day-to-day splitting between two users without creating a group.

## User Workflow

1. User opens a friend detail page.
2. User clicks `Add expense`.
3. User enters description, amount, currency, date, note, optional receipt, and split option.
4. The expense is saved against the friendship.
5. The friend detail page updates the running balance and activity history.
6. The user can later edit, delete, comment on, or settle up the friend balance.

## Frontend Files

- `client/src/pages/Dashboard.tsx`
- `client/src/pages/FriendDetail.tsx`
- `client/src/api.ts`

## Backend Files

- `server/src/routes/friends.ts`
- `server/src/controllers/friendExpenseController.ts`

## Database Models

- `FriendExpense`
- `FriendExpenseComment`
- `Friendship`

## Main Routes

- `GET /api/friends/:friendId/expenses`
- `POST /api/friends/:friendId/expenses`
- `GET /api/friends/:friendId/expenses/:expenseId`
- `PATCH /api/friends/:friendId/expenses/:expenseId`
- `DELETE /api/friends/:friendId/expenses/:expenseId`
- `POST /api/friends/:friendId/expenses/:expenseId/comments`
- `POST /api/friends/:friendId/settle`

## Implementation Notes

- Direct friend expenses support both equal and full-amount modes.
- A friend settle-up action is stored as a `FriendExpense` with `activity_type = SETTLEMENT`.
- The friend detail page is the main UI for direct expenses, balance summary, comments, and receipt viewing.
