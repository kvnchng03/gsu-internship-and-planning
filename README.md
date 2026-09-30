# GSU Internship & Planning

A free planner for Georgia State accounting (B.B.A.) students.

**Live site:** https://kvnchng03.github.io/gsu-internship-and-planning/

## What it does

- **Plan:** mark the GSU classes you've taken, lay out your remaining semesters, and check prerequisites against the 2026-2027 GSU catalog.
- **Internships:** track applications on a board (To apply, Working on, Applied, Interview, Offer, Closed), with urgent deadlines flagged and duplicate links blocked.
- **Results:** see which skills your saved postings ask for most, and what to study next.
- **Skills:** a guide to each accounting skill, how to check yourself, and free places to learn it.
- **Summary:** a one-page plan you can copy and send to your advisor.

## Install it on your phone

The site is a web app you can install, and it works offline after the first visit.

- **iPhone (Safari):** tap Share, then **Add to Home Screen**.
- **Android (Chrome):** open the menu and tap **Install app**.
- **Computer (Chrome or Edge):** click **Install** in the app's header.

## Calendar and reminders

Open **Internships → Calendar**.

- **Add to Google Calendar:** each posting with a deadline has its own link. No sign-in needed.
- **Download deadlines (.ics):** one file with every deadline, for Google, Apple, or Outlook calendars.
- **Sync to Google Calendar:** adds and updates every deadline in your Google Calendar, with phone reminders three days and one day before. This needs the one-time setup below.
- **Deadline alerts:** a notification when you open the app and something is due within three days.
  A static site can't send notifications while it's closed, so calendar reminders cover that.

### Google Calendar sync setup (one time, free)

1. In the [Google Cloud console](https://console.cloud.google.com/), create a project.
2. Under **APIs & Services → Library**, enable the **Google Calendar API**.
3. Under **OAuth consent screen**, choose **External**, fill in the app name and your email, and add the `.../auth/calendar.events` scope.
   Leave it in **Testing** and add each person who will use sync (by Gmail address) under **Test users**.
4. Under **Credentials → Create credentials → OAuth client ID**, choose **Web application** and add `https://kvnchng03.github.io` as an **Authorized JavaScript origin** (and `http://localhost:5173` for local testing).
5. Copy the client ID. In this repo on GitHub, go to **Settings → Secrets and variables → Actions → Variables** and add `GOOGLE_CLIENT_ID`.
6. Re-run the **Deploy** workflow. The **Sync to Google Calendar** button appears.

The client ID is public by design; it only identifies the app to Google.

## Development

The app is TypeScript, built with Vite.

```bash
npm install
npm run dev        # local dev server
npm test           # logic tests (planner, deadlines, duplicate links, skill matching)
npm run typecheck  # strict TypeScript check
npm run build      # type-check and build to dist/
```

Every push to `main` runs the checks and tests, then deploys to GitHub Pages.

### Layout

- `src/data/` holds the GSU course catalog, the skill guide, and application statuses.
- `src/lib/` holds the logic: the class planner, skill matching, postings, and saved data.
- `src/ui/` holds the views (Plan, Internships, Skills, Summary), dialogs, and the ⌘K palette.
- `tests/` holds the logic tests.

## Your data

Everything is saved in your browser only.
Nothing is sent to a server.
Use **Back up** to save a file, and **Restore** to load it on another device.

## Notes

Course rules come from the 2026-2027 GSU Undergraduate Catalog.
Always confirm your plan with a Robinson College advisor and your degree audit in PAWS.
