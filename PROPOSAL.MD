# Proposal

**What I'm building:** A golf course finder that shows real golf courses near a location the user searches for.

**Which API I'm using:** [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) (queries OpenStreetMap data) for course locations, plus [Nominatim](https://nominatim.org/release-docs/latest/api/Search/) for geocoding place names to coordinates. Both are free and require no API key.

**Why I chose this:** TODO — write 1-2 sentences in your own words about what interests you about this data.

**Core features:**
- Search golf courses by city/region name
- Display course name, address, and a link to view it on the map
- Show public/private status when OSM has it tagged (labeled "Unknown" when it doesn't — only ~10% of courses have this tagged, so this is an honest limitation, not a bug)
- Link to the course's own website when available, since pricing/green fees aren't in OSM data and the course's site is the real source for that
- Loading state while data fetches
- Friendly error message if the API fails or no courses are found
- (Extension idea) Save favorite courses with localStorage

**What I don't know yet:** TODO — write what's new to you about fetch/async/JSON before you start. (e.g. Have you chained two fetch calls before? Do you know what `await` actually does?)
