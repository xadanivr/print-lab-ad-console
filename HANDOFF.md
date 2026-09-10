# Print Lab Ad Console — Handoff

Internal dashboard for Super Design Lab (Brooklyn fabrication studio). Plans weekly
Instagram ad concepts aimed at people searching for printing/fabrication services,
tracks their performance, and produces a Sunday summary of what worked.

Every ad in this tool points at the studio's website, never at the Instagram profile.

---

## Live

| | |
|---|---|
| **Production** | https://print-lab-ad-console-xadani.vercel.app |
| **Repo** | https://github.com/xadanivr/print-lab-ad-console |
| **Vercel project** | `print-lab-ad-console` (team: Xadani) |
| **Database** | Upstash for Redis, via Vercel Marketplace |

Access is protected by a single shared password. It is stored as the
`DASHBOARD_PASSWORD` environment variable in Vercel — ask the studio owner for the
value. It is deliberately not written down in this file or in the repo.

---

## What it does

Three tabs, all scoped to a selected week (Monday–Sunday):

1. **This Week's Ads** — ad concept cards. Each holds an angle, headline, primary
   text, CTA label, the search intent it answers, and a visual brief for the shoot.
   Every field is editable inline; edits save on blur.
2. **KPI Tracker** — one row per ad for reach, impressions, link clicks, quote
   requests and spend. CTR and cost-per-quote-request are computed, not entered.
   The best performer is flagged automatically.
3. **Sunday Resume** — week totals, a bar comparison by quote requests, a "winner"
   callout, a week-over-week trend chart, and a free-text notes field.

---

## Architecture

Deliberately minimal: no framework, no build step, no client-side dependencies.

```
Browser (vanilla JS, single HTML file)
   |
   |  fetch() with session cookie
   v
Vercel Serverless Functions (Node, /api)
   |
   |  @vercel/kv
   v
Upstash Redis
```

### Files

```
index.html                        Entire front end: markup, CSS, JS. No build step.
package.json                      Single dependency: @vercel/kv
lib/auth.js                       Session token signing + verification
api/login.js                      GET session status / POST password to sign in
api/meta.js                       Seed flag + example-data flag
api/weeks/index.js                GET list weeks / POST create week
api/weeks/[id].js                 PATCH update week / DELETE week (and its ads)
api/weeks/[id]/ads/index.js       GET list ads / POST create ad
api/weeks/[id]/ads/[adId].js      PATCH update ad / DELETE ad
```

### Redis keys

| Key | Type | Contents |
|---|---|---|
| `meta` | string (JSON) | `{seeded, isExample}` |
| `weeks` | hash | field = week id (`YYYY-MM-DD`, the Monday), value = JSON `{weekStart, weekEnd, label, resumeNotes}` |
| `ads:<weekId>` | hash | field = ad UUID, value = JSON `{angle, headline, primaryText, cta, audience[], visualBrief, order, kpis{}}` |

Deleting a week also deletes its `ads:<weekId>` hash.

### Auth

The password is enforced **server-side**, not in the browser. A client-side gate alone
would be bypassable by calling `/api/*` directly.

- `POST /api/login` compares the submitted password to `DASHBOARD_PASSWORD` using a
  constant-time comparison, then sets an HttpOnly `plac_session` cookie.
- The cookie value is `<expiry>.<HMAC-SHA256(expiry, password)>`, valid 30 days.
- Every data route calls `requireAuth()` and returns 401 when the cookie is missing,
  malformed, expired, or incorrectly signed.
- Changing `DASHBOARD_PASSWORD` invalidates all existing sessions, since the password
  is also the signing key.

`index.html` itself is public — it contains no data, only the shell and the login form.

---

## Environment variables

Set in Vercel → Project → Settings → Environment Variables.

| Variable | Source | Purpose |
|---|---|---|
| `DASHBOARD_PASSWORD` | set manually | Shared team password + session signing key |
| `KV_REST_API_URL` | added by Upstash integration | Redis endpoint |
| `KV_REST_API_TOKEN` | added by Upstash integration | Redis auth |

`KV_URL`, `REDIS_URL` and `KV_REST_API_READ_ONLY_TOKEN` are also injected by the
integration but are unused by this app.

---

## Deploying

**The repo and the Vercel project are not linked.** Pushing to GitHub does *not*
trigger a deploy — they are two copies kept in sync manually. This was a consequence
of the original machine having no git installed; it is not a deliberate design choice.

**Recommended fix for whoever takes this over:** connect the repo in Vercel →
Settings → Git. After that, `git push` deploys, and everything below is obsolete.

Until then, deploys are direct file uploads via the Vercel REST API — see the
`v13/deployments` call pattern, which POSTs each file base64-encoded with
`{"file": path, "data": ..., "encoding": "base64"}`. Any normal workflow
(`vercel deploy` from the CLI, or a linked Git repo) works fine too and is preferable.

Requires Node 18+ if working locally. Note that neither Node nor git was installed on
the studio Mac this was built on.

---

## Known limitations

- **No rate limiting on login.** A determined attacker could brute-force the password
  endpoint. Acceptable for an obscure internal URL with a 24-character random
  password; worth adding if the URL is ever shared publicly.
- **Single shared password, no user accounts.** No audit trail of who edited what.
- **Last-write-wins.** Two people editing the same field simultaneously — the second
  save overwrites the first. Not a practical problem at this team size.
- **Polling, not realtime.** The page refreshes every 5 minutes and on tab focus.
  This interval is deliberate: the trend chart reads every week's ads, so tighter
  polling would burn through the Redis free tier as weeks accumulate. The trend is
  only rebuilt while the Sunday Resume tab is open, for the same reason.
- **"Clear examples & start fresh" deletes the ad copy too**, not just the sample KPI
  numbers. This is a design flaw — the copy is usually worth keeping. Splitting it
  into "Clear KPI numbers" and "Delete everything" is a known todo.
- **Free-tier ceilings.** Upstash free tier is roughly 10k commands/day and 256MB;
  Vercel Hobby allows one cron job per day. Both are ample here, but the cron limit
  matters if automated syncing is added.

---

## Not built yet

- **Meta/Instagram Ads API sync.** The original goal was pulling KPIs automatically
  instead of typing them in. Needs a Meta access token with `ads_read`, an ad account
  ID, and a daily Vercel cron job writing results into `ads:<weekId>`. Daily
  resolution is sufficient, since reporting is weekly.
- **UTM tracking URLs per ad.** Without them, all ad traffic looks identical in
  analytics and no ad can be credited with a specific quote request. Each card should
  carry a generated URL like:
  `?utm_source=instagram&utm_medium=paid&utm_campaign=<weekId>&utm_content=<angle>`
- **Quote-form attribution.** A "How did you hear about us?" field on the studio site
  is the only reliable way to tie a submitted quote back to an ad.

---

## Publishing an ad (operational note)

Organic Instagram posts cannot carry clickable links, so these must run as **paid ads
via Meta Ads Manager** using the **Traffic** objective.

Two constraints the ad copy in this tool does not enforce:

- CTA labels come from a fixed Meta dropdown. "Get a Print Quote" is not one of them —
  use **Get Quote** or **Learn More**.
- A **Send a Message** CTA routes to Instagram DMs, not the website. Avoid it for any
  ad meant to drive site traffic.

Creative sizes: 1080×1350 (feed 4:5) and 1080×1920 (Stories/Reels).
