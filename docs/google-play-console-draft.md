# SmartSplit Google Play Console Draft

This file is a repo-side draft for the manual information that still has to be entered in Google Play Console.

## App Details

- App name: `SmartSplit`
- Package name: `com.smartsplit.mobile`
- Support website: `https://smart-split-expanse.vercel.app/support`
- Privacy policy: `https://smart-split-expanse.vercel.app/privacy`
- Account deletion info: `https://smart-split-expanse.vercel.app/delete-account`
- Support email: `tanujdonkal29@gmail.com`

## Short Description Draft

Split shared expenses with friends and groups, upload receipts, track balances, and settle up in one place.

## Full Description Draft

SmartSplit helps friends, roommates, and groups keep shared expenses organized without losing track of who paid and who owes what.

Use SmartSplit to:

- create direct friend expenses
- organize group trips and shared spending
- track balances and settlement suggestions
- upload receipt images
- manage your account across mobile and web

SmartSplit also includes an in-app assistant and receipt tools to help users move faster, while keeping the main expense and balance workflows clear and easy to review.

## Data Safety Draft Notes

Review these carefully before submitting. They are a draft based on the current codebase and backend behavior.

- Personal info:
  - Name
  - Email address
  - Username
- Financial info / app activity:
  - Expenses
  - Balances
  - Group and friend relationships
  - Comments
- Photos and files:
  - Receipt images selected from the photo library
- App interactions:
  - AI assistant prompts and replies

Likely purposes:

- App functionality
- Account management
- Fraud / abuse / security review if needed
- Developer communications when users contact support

## Content Rating Notes

Most likely rating direction:

- General productivity / finance-style utility
- Mild or no mature content expected

Still verify this honestly in the Google questionnaire, especially because the app contains:

- user-entered comments
- uploaded receipt images
- AI assistant text

## Store Listing Assets Still Needed

- App icon for Play listing
- Feature graphic
- Phone screenshots
- Optional tablet screenshots if you want tablet presence

## Release Flow

- Internal test APK:
  - `npm run build:mobile:apk`
- Play Store release AAB:
  - `npm run build:mobile:aab`
