# SmartSplit Mobile

React Native + Expo mobile client for SmartSplit. This app is intended to share the same backend, auth project, and business flows as the existing web app.

## Local development

1. Start the backend:

```bash
npm run dev:server
```

2. Add a local `mobile/.env` based on `.env.example`.

Use your computer's LAN IP for `EXPO_PUBLIC_API_BASE_URL` when testing on a physical device.

3. Install dependencies from the repo root:

```bash
npm install
```

4. Start the mobile app:

```bash
npm run dev:mobile
```

## Current scope

- Shared SmartSplit brand/theme
- Landing screen
- Login/register/reset screens
- Bottom-tab app shell
- Shared API and Supabase config foundation

## Planned next steps

- Reuse auth and API flows from the web app
- Add groups/friends/activity/account data screens
- Add receipt upload, AI assistant, and offline-friendly caching
- Add consent, privacy, and moderation flows required for app-store launch
