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
- `access` (`yes`/`private`/`restricted`/`customers`) and/or `ownership` (`private`/`municipal`) — present on roughly 1 in 10 courses in a sampled test of 80 MA courses; when absent, the badge is simply omitted rather than showing a hedge like "Unknown"
- `website`, `phone` — present on some; used as the outbound link for pricing/tee-time info since OSM has no fee field
- `fee` — checked; not present on any course in the sample. **Not a feature we can build.**
- `type` (`node`/`way`/`relation`) + `id` — used to build the `openstreetmap.org` map link; `way`/`relation` report location as `center.lat`/`center.lon` instead of top-level `lat`/`lon`

## Functional requirements by iteration

### Iteration 1 — Fetch and Display (done)
- [x] Hardcoded location (Boston, MA)
- [x] Single `fetch()` to Overpass, `console.log`'d
- [x] Render 5 course cards (name, address, map link)

### Iteration 2 — Interactivity and Design (done)
- [x] Search input for a place name → `fetch()` Nominatim to geocode it → `fetch()` Overpass with those coordinates
- [x] Replace hardcoded Boston default with the search result (keep Boston as the initial/default view)
- [x] Show public/private status on each card when `access`/`ownership` is tagged; omit the badge entirely otherwise (revised after initial "Unknown" label felt noisy on the ~90% of cards without it)
- [x] Show a "Visit website →" link when `website` tag exists; fall back to the OSM map link otherwise
- [x] Loading indicator while either fetch is in flight
- [x] Error state: geocoding fails (bad/unrecognized place name), Overpass fails, or zero results — each needs a distinct, friendly message
- [x] Responsive grid (verified at 375px — no horizontal overflow, form stacks to column)

### Iteration 3 — Polish and Extend
- [x] Extension: localStorage favorites (star toggle per card, "☆ Favorites (n)" view with its own empty state, persists across reloads)
- [x] Edge case: empty search input → "Type a city or region to search"
- [x] Edge case: search with no results → distinct message, no broken layout
- [x] Edge case: API rate limit (HTTP 429) → distinct message + "Try again" button, confirmed against a real 429 from Overpass during testing
- [x] Edge case: generic API failure (confirmed against a real 504 from Overpass) → "Try again" button using the last query
- [ ] Lighthouse audit — no Chrome/Node CLI available in the dev environment; needs to be run manually (Chrome DevTools → Lighthouse tab → run against the deployed GitHub Pages URL). Manual pass already covers: meta description, favicon, `lang` attribute, `rel="noopener"` on external links, color contrast, keyboard-reachable controls, `aria-label`/`aria-pressed` on icon-only buttons
- [ ] Classmate feedback pass — needs an actual person, not AI

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
