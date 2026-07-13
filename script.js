// Overpass API (OpenStreetMap) — free, no API key needed.
// Query docs: https://wiki.openstreetmap.org/wiki/Overpass_API
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

// Hard-coded for Iteration 1. Iteration 2 will replace this with a
// geocoded location from a user-typed search box.
const LOCATION = { name: "Boston, MA", lat: 42.3601, lon: -71.0589 };
const RADIUS_METERS = 20000;

const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");

async function fetchGolfCourses(lat, lon, radius) {
  // "nwr" = node/way/relation. Golf courses in OSM can be mapped as any of
  // the three depending on how the mapper drew them.
  const query = `
    [out:json][timeout:25];
    nwr[leisure=golf_course](around:${radius},${lat},${lon});
    out center 20;
  `;

  const response = await fetch(OVERPASS_URL, {
    method: "POST",
    body: "data=" + encodeURIComponent(query),
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status}`);
  }

  return response.json();
}

function renderCourses(elements) {
  // Ways/relations report their location as a "center" point instead of
  // lat/lon directly, and not every entry has a name.
  const courses = elements
    .filter((el) => el.tags && el.tags.name)
    .map((el) => ({
      id: el.id,
      type: el.type,
      name: el.tags.name,
      city: el.tags["addr:city"],
      street: el.tags["addr:street"],
      lat: el.lat ?? el.center?.lat,
      lon: el.lon ?? el.center?.lon,
    }))
    .slice(0, 5);

  if (courses.length === 0) {
    resultsEl.innerHTML = "<p>No named golf courses found.</p>";
    return;
  }

  resultsEl.innerHTML = courses
    .map(
      (course) => `
        <div class="course-card">
          <h2>${course.name}</h2>
          ${course.street ? `<p>${course.street}${course.city ? ", " + course.city : ""}</p>` : ""}
          <a href="https://www.openstreetmap.org/${course.type}/${course.id}" target="_blank" rel="noopener">
            View on map →
          </a>
        </div>
      `
    )
    .join("");
}

async function init() {
  statusEl.textContent = "Loading golf courses…";

  try {
    const data = await fetchGolfCourses(LOCATION.lat, LOCATION.lon, RADIUS_METERS);
    console.log("Overpass API response:", data); // inspect this in devtools!
    statusEl.textContent = "";
    renderCourses(data.elements);
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Couldn't load golf courses. Please try again later.";
  }
}

init();
