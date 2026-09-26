# Push notifications (free)

Project W sends real push notifications, which arrive even when the app is closed, through a small
Cloudflare Worker. Firebase stays on the free Spark plan: no Cloud
Functions and no card needed. Cloudflare's free plan covers 100,000
requests a day.

People get notified when:

- someone adds or edits a bill they're in (with their share)
- someone marks a payment to or from them
- someone asks to join (organisers only)

## One-time setup (about 5 minutes)

1. Sign up at <https://dash.cloudflare.com/sign-up>. It's free and needs no card.
2. **Create a KV store:** *Storage & Databases → KV → Create*. Name it
   `project-w-push`.
3. **Create the worker:** *Workers & Pages → Create → Worker*. Start from
   "Hello World", name it `project-w-push`, and click **Deploy**.
4. **Paste the code:** click **Edit code**, replace everything with the
   contents of [`worker.js`](worker.js), and click **Deploy**.
5. **Connect the KV store:** in the worker, go to *Settings → Bindings → Add →
   KV namespace*. Set the variable name to exactly `PUSH_KV` and pick
   `project-w-push`. Save/deploy.
6. **Check it:** open `https://project-w-push.<your-subdomain>.workers.dev/vapid`.
   You should see `{"key":"B…"}`. The worker created its own keys and saved
   them in KV.
7. **Point the app at it:** in [`../firebase-config.js`](../firebase-config.js),
   set

   ```js
   var PUSH_WORKER_URL = "https://project-w-push.<your-subdomain>.workers.dev";
   ```

   and push the change so the live site picks it up.

Your Firestore rules don't need to change. The worker reads only the docs the app
already reads (`people/<you>`, `requests/<you>`, `trip/admins`), and it uses
the caller's own sign-in, so your existing rules decide who counts as a member.

## Turning it on (each person, each device)

- **Android / desktop:** open the app. It offers to turn notifications on, or
  use **Edit → Turn on notifications**.
- **iPhone (iOS 16.4+):** in Safari, tap **Share → Add to Home Screen**, open
  Project W from the Home Screen icon, then **Edit → Turn on notifications**.
  Apple only allows web push for Home Screen apps.

## Optional

- To use the CLI instead of the dashboard, run `npx wrangler deploy` from this folder after
  putting your KV namespace id in `wrangler.toml`.
- Set a `VAPID_SUBJECT` variable (`mailto:you@example.com` or a URL) if you
  want push services to have your contact rather than the repo link.
- If you ever delete the `vapid` key from KV, new keys are made and every
  device quietly re-subscribes the next day it opens the app.
