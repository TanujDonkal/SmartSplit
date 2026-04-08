# Receipts

## Purpose

Receipts allow users to attach proof of purchase to friend or group expenses.

## User Workflow

1. User selects a receipt image while creating or editing an expense.
2. The frontend reads the image and submits receipt data to the backend.
3. The backend uploads the receipt to external storage.
4. The hosted receipt URL is saved on the expense.
5. The receipt can later be viewed from expense details or reused during editing.

## Frontend Files

- `client/src/pages/Dashboard.tsx`
- `client/src/pages/FriendDetail.tsx`
- `client/src/pages/GroupDetail.tsx`
- `client/src/api.ts`

## Backend Files

- `server/src/controllers/expenseController.ts`
- `server/src/controllers/friendExpenseController.ts`
- `server/src/utils/receiptStorage.ts`

## Database Models

- `Expense`
- `FriendExpense`

## Main Routes

- `POST /api/expenses`
- `PATCH /api/expenses/:expenseId`
- `POST /api/friends/:friendId/expenses`
- `PATCH /api/friends/:friendId/expenses/:expenseId`

## Implementation Notes

- Receipt uploads are designed around external storage rather than permanent inline storage.
- The expense stores both `receipt_data` and `receipt_storage_key`.
- When a receipt is replaced or removed, the backend can clean up the old stored asset.
