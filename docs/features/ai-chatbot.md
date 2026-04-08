# AI Chatbot

## Purpose

The AI chatbot gives the user an in-app SmartSplit assistant that can answer questions using the signed-in user’s actual app context.

## User Workflow

1. User clicks `Ask AI` from the dashboard.
2. The chatbot panel opens.
3. User sends a question about balances, friends, groups, expenses, or settlements.
4. The frontend sends the chat history to the backend.
5. The backend loads the user’s SmartSplit context and sends that context to OpenAI.
6. The assistant reply is shown in the chat panel.

## Frontend Files

- `client/src/pages/Dashboard.tsx`
- `client/src/api.ts`

## Backend Files

- `server/src/routes/assistant.ts`
- `server/src/controllers/assistantController.ts`
- `server/src/utils/chatAssistant.ts`

## Database Models

- `User`
- `Friendship`
- `FriendExpense`
- `Group`
- `GroupMember`
- `Expense`
- `ExpenseSplit`

## Main Routes

- `POST /api/assistant/chat`

## Implementation Notes

- The dashboard still uses the same panel-style UI with a close button.
- The backend builds a compact context including friends, groups, balances, and recent expenses.
- The assistant is designed to answer from SmartSplit data rather than generic unsupported claims.
- Production use requires `OPENAI_API_KEY` and optionally `OPENAI_CHAT_MODEL`.
