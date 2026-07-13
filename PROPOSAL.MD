# Proposal

**What I'm building:** A golf course finder that shows real golf courses near a location the user searches for.

**Which API I'm using:** [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) (queries OpenStreetMap data) for course locations, plus [Nominatim](https://nominatim.org/release-docs/latest/api/Search/) for geocoding place names to coordinates. Also added [ipwho.is](https://ipwho.is/) as a fallback: it estimates a location from IP address alone, no permission prompt needed, used when the browser's Geolocation API fails (e.g. desktop with Location Services turned off at the OS level). All three are free and require no API key.

**Why I chose this:** Golf is one of my favorite sports and I would like an easier way to search for golf courses

**Core features:**
- Search golf courses by city/region name
- "Near me" button using the browser's Geolocation API, falling back to IP-based location (ipwho.is) if that fails or is denied
- Display course name, address, distance from the search origin (nearest-first), number of holes when tagged, and a link to view it on the map or the course's own website
- Recent searches (last 5, localStorage) shown as clickable chips
- Loading state (skeleton cards) while data fetches
- Friendly, distinct error messages for: place not found, API rate-limited, API failed, location denied/unavailable
- Save favorite courses with localStorage

**What I don't know yet:** 

- How will I use two APIs and fetch from both of them
- What 'await' means
