# SmartSplit Android Test Plan

Run this before uploading a production Android build to Google Play.

## Authentication

- Sign up with a new account
- Log in with an existing account
- Log out and log back in
- Request a password reset
- Reopen the app and confirm the session restores correctly

## Friends

- Add a friend by username
- Open a friend detail screen
- Add a direct expense
- Edit and delete a direct expense
- Add a comment to a direct expense
- Run settle up

## Groups

- Create a group
- Add a member
- Add a group expense
- Edit and delete a group expense
- Add a comment to a group expense
- Review balances and settlements

## Receipts and AI

- Upload a receipt from the photo library
- Deny photo permission and confirm the app shows a clear message
- Parse a receipt and confirm failure states are understandable
- Open the AI assistant and confirm the disclaimer is visible
- Send a prompt and confirm network failures are handled cleanly

## Account and Compliance

- Open privacy policy, support, and deletion help from the app
- Update profile fields
- Delete account from the app
- Verify support and privacy pages also load on the public website

## Device Coverage

- Test on at least two physical Android devices
- Test on a slower network connection
- Test after reinstalling the app
