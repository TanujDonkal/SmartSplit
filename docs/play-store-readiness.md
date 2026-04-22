# SmartSplit Android Play Store Readiness

## Implemented in this branch

- Public web pages for `Privacy Policy`, `Support`, and `Account Deletion`
- Mobile access points for privacy, support, and account deletion guidance
- Sign-up screen links to privacy and support information
- Home page links to public legal/support pages
- Android app config updated with `versionCode`
- Expo image picker plugin configured with clearer permission messaging

## Product flows that should work before release

- Sign up
- Log in
- Forgot password
- Session restore after app restart
- Friends: add, view, delete
- Groups: create, view, add members, delete
- Direct friend expenses: create, edit, delete, comment, settle up
- Group expenses: create, edit, delete, comment
- Receipt upload and parsing
- Profile updates
- Account deletion

## Manual Play Console work still required

- Create the Google Play app entry
- Upload a release `.aab`
- Complete Play App Signing
- Fill out the Data safety form with accurate answers
- Complete the content rating questionnaire
- Add the privacy policy URL
- Add store listing copy, screenshots, icon, and feature graphic
- Add the support contact email and website in Play Console
- Run closed testing if your Play account requires it

## Remaining engineering work before launch

- Verify all key flows on at least two physical Android devices
- Review AI assistant output and decide what moderation or fallback policy is required
- Confirm receipt parsing failure states are clear and recoverable
- Confirm backend rate limits, uptime, and error handling are acceptable for public users
- Decide the final support email and replace it in the legal config if needed
