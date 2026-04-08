# AI Receipt Parsing

## Purpose

AI receipt parsing extracts useful expense fields from an uploaded receipt image so the expense form can be prefilled automatically.

## User Workflow

1. User uploads a receipt image in a friend or group expense form.
2. User clicks `Parse receipt with AI`.
3. The backend sends the hosted receipt image to OpenAI.
4. The returned parsed fields are sent back to the frontend.
5. The form is prefilled with description, amount, currency, date, and note.
6. The user can still manually edit any field before saving the expense.

## Frontend Files

- `client/src/pages/Dashboard.tsx`
- `client/src/pages/FriendDetail.tsx`
- `client/src/pages/GroupDetail.tsx`
- `client/src/api.ts`

## Backend Files

- `server/src/routes/receipts.ts`
- `server/src/controllers/receiptController.ts`
- `server/src/utils/receiptParser.ts`
- `server/src/utils/receiptStorage.ts`

## Database Models

- `Expense`
- `FriendExpense`

## Main Routes

- `POST /api/receipts/parse`

## Implementation Notes

- Parsing is powered by OpenAI through the Responses API.
- The parser requests structured JSON output for known fields.
- Receipt parsing builds on top of the receipt upload and storage workflow.
- If parsing fails, manual form entry still works.
