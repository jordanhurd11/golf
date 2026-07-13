# PRD: Golf Course Finder

## Overview
A web app that lets a user search any city/region and see real golf courses near it — name, address, public/private status (when known), and a link to the course's own site or its OpenStreetMap page. Built for the OIM3690 "Live Data" assignment.

## Goals
- Learn `fetch()`, `async`/`await`, and working with real-world (messy, inconsistent) JSON
- Turn a hardcoded proof-of-concept into a fully interactive, deployed app across three iterations
- Be honest about data limitations rather than faking fields the API doesn't provide

## Data sources
| Source | Purpose | Key required? |
|---|---|---|
| [Nominatim](https://nominatim.org/release-docs/latest/api/Search/) | Geocode a place name the user types → `lat`/`lon` | No |
| [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) | Query OpenStreetMap for `leisure=golf_course` near that point | No |

Both confirmed working with a plain `fetch()` from the browser (no CORS proxy needed) as of this writing.

### Relevant OSM tags per course
- `name` — present on effectively all courses (required to display a course at all)
- `addr:street`, `addr:city` — present on some, not all
- `access` (`yes`/`private`/`restricted`/`customers`) and/or `ownership` (`private`/`municipal`) — present on roughly 1 in 10 courses in a sampled test of 80 MA courses; **must default to "Unknown" when absent**
- `website`, `phone` — present on some; used as the outbound link for pricing/tee-time info since OSM has no fee field
- `fee` — checked; not present on any course in the sample. **Not a feature we can build.**
- `type` (`node`/`way`/`relation`) + `id` — used to build the `openstreetmap.org` map link; `way`/`relation` report location as `center.lat`/`center.lon` instead of top-level `lat`/`lon`

## Functional requirements by iteration

### Iteration 1 — Fetch and Display (done)
- [x] Hardcoded location (Boston, MA)
- [x] Single `fetch()` to Overpass, `console.log`'d
- [x] Render 5 course cards (name, address, map link)

### Iteration 2 — Interactivity and Design
- [ ] Search input for a place name → `fetch()` Nominatim to geocode it → `fetch()` Overpass with those coordinates
- [ ] Replace hardcoded Boston default with the search result (keep Boston as the initial/default view)
- [ ] Show public/private status on each card: label from `access`/`ownership` if present, else "Unknown"
- [ ] Show a "Visit website →" link when `website` tag exists; fall back to the OSM map link otherwise
- [ ] Loading indicator while either fetch is in flight
- [ ] Error state: geocoding fails (bad/unrecognized place name), Overpass fails, or zero results — each needs a distinct, friendly message
- [ ] Responsive grid (already scaffolded in `style.css`; verify at mobile width)

### Iteration 3 — Polish and Extend
- [ ] Extension: localStorage favorites (save/remove a course, persist across reloads)
- [ ] Edge cases: empty search input, search with no results, rapid repeated searches (avoid stale results overwriting newer ones)
- [ ] Lighthouse audit + fix flagged issues
- [ ] Classmate feedback pass

## Non-functional requirements
- No API keys committed or required — must run as a static site on GitHub Pages
- Attribution to OpenStreetMap contributors (ODbL license) somewhere in the UI/footer
- Graceful degradation: a course missing optional fields (address, website, access) should never break the layout or show "undefined"

## Out of scope
- Green fees / pricing — not available from OSM data at any coverage level; not building this
- Real-time tee time booking
- Course ratings/reviews (no data source chosen for this)

## Open questions (for you, not AI)
- Why did you choose this data/topic? *(fill in PROPOSAL.md)*
- What's new to you about `fetch`/`async`/JSON going in? *(fill in PROPOSAL.md)*
- How should search behave if geocoding matches multiple places with the same name (e.g., "Springfield")? Pick the first result, or let the user choose?

## Success criteria
- User can search any real-world place and see actual nearby golf courses within a few seconds
- Loading and error states are visibly distinct from the normal state
- No console errors on a clean load or a failed search
- Works at mobile viewport widths without horizontal scroll or overlap
