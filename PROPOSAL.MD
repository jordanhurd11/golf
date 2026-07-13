# Proposal

**What I'm building:** A golf course finder that shows real golf courses near a location the user searches for.

**Which API I'm using:** [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) (queries OpenStreetMap data) for course locations, plus [Nominatim](https://nominatim.org/release-docs/latest/api/Search/) for geocoding place names to coordinates. Both are free and require no API key.

**Why I chose this:** Golf is one of my favorite sports and I would like an easier way to search for golf courses

**Core features:**
- Search golf courses by city/region name
- Display course name, address, and a link to view it on the map
- Loading state while data fetches
- Friendly error message if the API fails or no courses are found
- Save favorite courses with localStorage

**What I don't know yet:** 

- How will I use two APIs and fetch from both of them
- What 'await' means
