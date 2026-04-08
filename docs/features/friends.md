# Friends

## Purpose

The friends feature allows one user to add another registered user by email and create a mutual friendship that can be used for direct expense splitting.

## User Workflow

1. User opens the Friends tab in the dashboard.
2. User enters the email address used by another registered SmartSplit account.
3. The backend creates a friendship record for the two users.
4. Both users can see each other in their friends list.
5. The friendship can then be used for direct friend expenses and settle-up actions.

## Frontend Files

- `client/src/pages/Dashboard.tsx`
- `client/src/pages/FriendDetail.tsx`
- `client/src/api.ts`

## Backend Files

- `server/src/routes/friends.ts`
- `server/src/controllers/friendController.ts`
- `server/src/controllers/friendExpenseController.ts`

## Database Models

- `Friendship`
- `User`

## Main Routes

- `GET /api/friends`
- `POST /api/friends`
- `GET /api/friends/:friendId/summary`

## Implementation Notes

- Friendships are stored as normalized user pairs using `user_a_id` and `user_b_id`.
- Users must already be registered before they can be added as friends.
- The friend summary route is reused by the dashboard and the friend detail screen.
