# GSU Internship & Planning

A free planner for Georgia State accounting (B.B.A.) students.

**Live site:** https://kvnchng03.github.io/gsu-internship-and-planning/

## What it does

- **Plan:** mark the GSU classes you've taken, lay out your remaining semesters, and check prerequisites against the 2026-2027 GSU catalog.
- **Internships:** track applications on a board (To apply, Working on, Applied, Interview, Offer, Closed), with urgent deadlines flagged and duplicate links blocked.
- **Results:** see which skills your saved postings ask for most, and what to study next.
- **Skills:** a guide to each accounting skill, how to check yourself, and free places to learn it.
- **Summary:** a one-page plan you can copy and send to your advisor.

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
