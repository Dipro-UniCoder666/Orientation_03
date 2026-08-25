# CSE-03 Orientation - Ticket Check

A small web app with three jobs:

1. Verify a Student ID + Name against the CSE-03 roster and "book" a ticket.
2. Reveal the event details through a glitch-text motion sequence.
3. Record every successful check-in to a database, viewable on a
   password-protected `/admin` page (only works once deployed on Vercel).

## Structure

```
orientation-app/
├── index.html            all three screens (login → ticket → reveal)
├── css/
│   └── style.css          theme, layout, glitch/animation keyframes
├── js/
│   ├── config.js           event details (title, venue, date, day, doors open)
│   ├── students.js          the roster: [{ id, name }, ...]  <-- edit this
│   └── app.js                verification logic + screen transitions
├── api/
│   └── checkin.js            Vercel serverless function: records + lists check-ins
├── admin/
│   └── index.html             password-protected page to view check-ins
├── package.json
├── .env.example
└── README.md
```

## Updating the name list

Open `js/students.js` and replace each placeholder `name` with the real
name for that ID. Don't change the `id` values - they're already in the
`B250201001`–`B250201042` format. Nothing else needs to change; `app.js`
reads this file directly.

## Updating the event details

Open `js/config.js` - venue, date, day, doors-open time, and the two
title lines all live there in one place.

## Running it locally (no backend)

No install needed for the front-end alone. Just open `index.html` in a
browser, or serve the folder with anything static, e.g.:

```
python3 -m http.server 8000
```

Note: `/api/checkin` and `/admin` only work once deployed on Vercel with
a KV database connected (see below). Locally, check-ins simply don't
get recorded anywhere - the ticket flow still works fine either way.

## Deploying on Vercel with check-in tracking

1. Push this folder to a GitHub repo, then import it in Vercel
   (New Project → your repo). Vercel auto-detects `api/checkin.js` as
   a serverless function - no config needed.
2. In the Vercel dashboard: **Storage → Create Database → KV** (free
   tier). Connect it to this project - this automatically adds the
   `KV_REST_API_URL` / `KV_REST_API_TOKEN` environment variables.
3. In **Project Settings → Environment Variables**, add:
   - `ADMIN_USER` - the username for the admin page
   - `ADMIN_PASS` - the password for the admin page
4. Redeploy (or it'll pick these up on the next deploy automatically).
5. Visit `https://your-project.vercel.app/admin` - your browser will
   prompt for the username/password you set in step 3. That page lists
   every check-in (Student ID, name, timestamp) and can export a CSV.

Never commit real values for `ADMIN_USER` / `ADMIN_PASS` to GitHub -
`.env.example` is just a template; set the real values in Vercel's
dashboard only.

## How verification works

- ID is matched case-insensitively, exact string.
- Name is matched case-insensitively with extra whitespace collapsed
  (so "Dipro   Das" and "dipro das" both match "Dipro Das").
- Both must match the *same* roster row, or the ticket is rejected.

See `verifyStudent()` in `js/app.js` if you want to loosen or tighten
this later (e.g. allow ID-only check-in).

