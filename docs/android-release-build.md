# SmartSplit Android Release Build Guide

Use this guide when you are ready to create the Android bundle that goes to Google Play.

## 1. Make sure you are on the Play Store branch

```powershell
git checkout feat/play-store-readiness
git pull
```

## 2. Verify the project before building

From the repo root:

```powershell
npm.cmd run typecheck:mobile
npm.cmd run build:web
```

These checks are not the Android release itself, but they help catch obvious regressions first.

## 3. Log in to Expo

```powershell
npx.cmd eas-cli@latest login
```

If this is your first time using EAS for the project, Expo may ask to configure signing credentials.

## 4. Build an internal Android APK if you want one last installable test

```powershell
npm.cmd run build:mobile:apk
```

This uses the `preview` profile in `eas.json` and produces an APK for direct device installation.

## 5. Build the Google Play release AAB

```powershell
npm.cmd run build:mobile:aab
```

This uses the `production` profile in `eas.json` and creates the Android App Bundle (`.aab`) for Play Console.

## 6. Download the finished AAB

When the EAS build finishes, Expo gives you a build page URL.

From that page:

- download the `.aab`
- keep the build link for release records
- note the version you uploaded

## 7. Upload to Google Play Console

In Play Console:

1. Open your app
2. Go to the appropriate test or production track
3. Create a new release
4. Upload the `.aab`
5. Complete the release notes
6. Save and review the release

## 8. Fill the manual Play Console fields

Before submitting, complete:

- Data safety
- Content rating
- App access, if required
- Privacy policy URL
- Support website
- Support email
- Store listing text and images

Use:

- `docs/google-play-console-draft.md`
- `docs/google-play-test-plan.md`
- `docs/play-store-readiness.md`

## 9. Final recommendation before production

Run one full pass on a physical Android phone after the APK build and before uploading the `.aab`.

Check:

- login
- friend and group flows
- receipt upload
- AI assistant
- profile updates
- account deletion

## Build profiles currently configured

In `eas.json`:

- `preview`: Android APK for internal testing
- `production`: Android App Bundle for Google Play
