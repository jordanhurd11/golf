// Overpass API (OpenStreetMap) — course data, no key needed.
// https://wiki.openstreetmap.org/wiki/Overpass_API
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

// Nominatim (OpenStreetMap) — turns a typed place name into coordinates.
// https://nominatim.org/release-docs/latest/api/Search/
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

const DEFAULT_QUERY = "Boston, MA";
const RADIUS_METERS = 20000;

const form = document.getElementById("search-form");
const input = document.getElementById("search-input");
const subtitleEl = document.getElementById("subtitle");
const spinner = document.getElementById("spinner");
const messageEl = document.getElementById("message");
const resultsEl = document.getElementById("results");
const submitBtn = form.querySelector("button");

class NotFoundError extends Error {}

async function geocodePlace(query) {
  const url = `${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(query)}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Nominatim error: ${response.status}`);
  }

  const results = await response.json();
  if (results.length === 0) {
    throw new NotFoundError(`No location found for "${query}"`);
  }

  return {
    lat: parseFloat(results[0].lat),
    lon: parseFloat(results[0].lon),
    displayName: results[0].display_name,
  };
}

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

// Public/private is only tagged on a minority of courses in OSM — default
// to "Unknown" rather than guessing.
function getAccessInfo(tags) {
  if (tags.access === "private") return { label: "Private", className: "badge-private" };
  if (tags.access === "yes" || tags.access === "permissive") return { label: "Public", className: "badge-public" };
  if (tags.access === "customers") return { label: "Members/guests only", className: "badge-restricted" };
  if (tags.access === "restricted") return { label: "Restricted", className: "badge-restricted" };
  if (tags.ownership === "private") return { label: "Private", className: "badge-private" };
  if (tags.ownership === "municipal") return { label: "Public (municipal)", className: "badge-public" };
  return { label: "Unknown", className: "badge-unknown" };
}

function isHttpUrl(url) {
  try {
    return ["http:", "https:"].includes(new URL(url).protocol);
  } catch {
    return false;
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function parseCourses(elements) {
  // Ways/relations report their location as a "center" point instead of
  // lat/lon directly, and not every entry has a name.
  return elements
    .filter((el) => el.tags && el.tags.name)
    .map((el) => ({
      id: el.id,
      type: el.type,
      name: el.tags.name,
      city: el.tags["addr:city"],
      street: el.tags["addr:street"],
      website: el.tags.website,
      access: getAccessInfo(el.tags),
    }))
    .slice(0, 12);
}

function renderCourses(courses) {
  resultsEl.innerHTML = courses
    .map((course) => {
      const mapUrl = `https://www.openstreetmap.org/${course.type}/${course.id}`;
      const useWebsite = course.website && isHttpUrl(course.website);
      const linkHref = useWebsite ? course.website : mapUrl;
      const linkLabel = useWebsite ? "Visit website →" : "View on map →";

      return `
        <div class="course-card">
          <h2>${escapeHtml(course.name)}</h2>
          ${course.street ? `<p>${escapeHtml(course.street)}${course.city ? ", " + escapeHtml(course.city) : ""}</p>` : ""}
          <div><span class="badge ${course.access.className}">${course.access.label}</span></div>
          <p><a href="${linkHref}" target="_blank" rel="noopener">${linkLabel}</a></p>
        </div>
      `;
    })
    .join("");
}

function setLoading(isLoading) {
  spinner.hidden = !isLoading;
  submitBtn.disabled = isLoading;
  input.disabled = isLoading;
}

async function runSearch(query) {
  setLoading(true);
  messageEl.textContent = "";
  resultsEl.innerHTML = "";

  try {
    const place = await geocodePlace(query);
    subtitleEl.textContent = `Golf courses near ${place.displayName}`;

    const data = await fetchGolfCourses(place.lat, place.lon, RADIUS_METERS);
    console.log("Overpass API response:", data); // inspect this in devtools!

    const courses = parseCourses(data.elements);
    if (courses.length === 0) {
      messageEl.textContent = `No golf courses found near "${query}". Try a different location.`;
    } else {
      renderCourses(courses);
    }
  } catch (err) {
    console.error(err);
    if (err instanceof NotFoundError) {
      messageEl.textContent = `Couldn't find "${query}". Try a more specific place name (e.g. add a state or country).`;
    } else {
      messageEl.textContent = "Something went wrong loading golf courses. Please try again in a moment.";
    }
  } finally {
    setLoading(false);
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const query = input.value.trim();
  if (!query) {
    messageEl.textContent = "Type a city or region to search.";
    return;
  }
  runSearch(query);
});

runSearch(DEFAULT_QUERY);
