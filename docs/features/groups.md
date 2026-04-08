# Groups

## Purpose

Groups let users organize shared expenses among multiple members.

## User Workflow

1. User creates a group from the dashboard.
2. The creator is automatically added as the first member.
3. Additional members can be added by registered email address.
4. Group members can add expenses, review balances, and see settlement suggestions.

## Frontend Files

- `client/src/pages/Dashboard.tsx`
- `client/src/pages/GroupDetail.tsx`
- `client/src/api.ts`

## Backend Files

- `server/src/routes/groups.ts`
- `server/src/controllers/groupController.ts`
- `server/src/controllers/settlementController.ts`

## Database Models

- `Group`
- `GroupMember`
- `User`

## Main Routes

- `GET /api/groups`
- `POST /api/groups`
- `POST /api/groups/:groupId/members`
- `GET /api/groups/:groupId/balances`
- `GET /api/groups/:groupId/settlements`

## Implementation Notes

- The dashboard loads all groups for the signed-in user.
- Group member addition requires the invited user to already exist in the `users` table.
- Group-level balances and settlements are calculated from the expense and split records.
