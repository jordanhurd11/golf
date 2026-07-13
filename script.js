// Overpass API (OpenStreetMap) — course data, no key needed.
// https://wiki.openstreetmap.org/wiki/Overpass_API
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

// Nominatim (OpenStreetMap) — turns a typed place name into coordinates.
// https://nominatim.org/release-docs/latest/api/Search/
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

const DEFAULT_QUERY = "Boston, MA";
const RADIUS_METERS = 40000;
const FAVORITES_KEY = "golf-favorites";
const RECENT_SEARCHES_KEY = "golf-recent-searches";
const MAX_RECENT_SEARCHES = 5;
const EARTH_RADIUS_MILES = 3958.8;

const form = document.getElementById("search-form");
const input = document.getElementById("search-input");
const locateBtn = document.getElementById("locate-btn");
const recentEl = document.getElementById("recent-searches");
const subtitleEl = document.getElementById("subtitle");
const spinner = document.getElementById("spinner");
const messageEl = document.getElementById("message");
const retryBtn = document.getElementById("retry-btn");
const favToggleBtn = document.getElementById("favorites-toggle");
const resultsCountEl = document.getElementById("results-count");
const resultsEl = document.getElementById("results");
const submitBtn = form.querySelector("button");

let currentCourses = [];
let viewMode = "search"; // "search" | "favorites"
let lastAction = () => runSearch(DEFAULT_QUERY);

class NotFoundError extends Error {}
class RateLimitError extends Error {}
class GeolocationError extends Error {}

async function geocodePlace(query) {
  const url = `${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(query)}`;
  const response = await fetch(url);

  if (response.status === 429) {
    throw new RateLimitError("Nominatim rate limit");
  }
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

  if (response.status === 429) {
    throw new RateLimitError("Overpass rate limit");
  }
  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status}`);
  }

  return response.json();
}

// Public/private is only tagged on a minority of courses in OSM — omit the
// badge entirely rather than showing a hedge like "Unknown" on every card.
function getAccessInfo(tags) {
  if (tags.access === "private") return { label: "Private", className: "badge-private" };
  if (tags.access === "yes" || tags.access === "permissive") return { label: "Public", className: "badge-public" };
  if (tags.access === "customers") return { label: "Members/guests only", className: "badge-restricted" };
  if (tags.access === "restricted") return { label: "Restricted", className: "badge-restricted" };
  if (tags.ownership === "private") return { label: "Private", className: "badge-private" };
  if (tags.ownership === "municipal") return { label: "Public (municipal)", className: "badge-public" };
  return null;
}

function courseKey(course) {
  return `${course.type}-${course.id}`;
}

function getHolesLabel(tags) {
  if (tags["golf:course"] === "9_hole") return "9 holes";
  if (tags["golf:course"] === "18_hole") return "18 holes";
  if (tags.holes) return `${tags.holes} holes`;
  return null;
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function distanceInMiles(lat1, lon1, lat2, lon2) {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_MILES * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Attaches distance from the search origin and sorts nearest-first.
// Courses without usable coordinates sort to the end instead of crashing.
function withDistances(courses, originLat, originLon) {
  return courses
    .map((course) => ({
      ...course,
      distanceMiles:
        course.lat != null && course.lon != null
          ? distanceInMiles(originLat, originLon, course.lat, course.lon)
          : null,
    }))
    .sort((a, b) => (a.distanceMiles ?? Infinity) - (b.distanceMiles ?? Infinity));
}

function loadFavorites() {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY)) ?? [];
  } catch {
    // Corrupt or manually-edited localStorage shouldn't crash the app.
    return [];
  }
}

function toggleFavorite(course) {
  const favorites = loadFavorites();
  const index = favorites.findIndex((f) => courseKey(f) === courseKey(course));
  if (index >= 0) {
    favorites.splice(index, 1);
  } else {
    // distanceMiles is only meaningful for the search that produced it —
    // don't persist a number that'll be stale/wrong in the favorites view.
    const { distanceMiles, ...toSave } = course;
    favorites.push(toSave);
  }
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  updateFavoritesButton();
}

function updateFavoritesButton() {
  const count = loadFavorites().length;
  favToggleBtn.textContent = viewMode === "favorites" ? "← Back to search" : `☆ Favorites (${count})`;
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
      holes: getHolesLabel(el.tags),
      lat: el.lat ?? el.center?.lat,
      lon: el.lon ?? el.center?.lon,
    }))
    .slice(0, 12);
}

function renderCourses(courses) {
  currentCourses = courses;
  const favorites = loadFavorites();

  resultsCountEl.textContent = courses.length
    ? `${courses.length} course${courses.length === 1 ? "" : "s"} found`
    : "";

  resultsEl.innerHTML = courses
    .map((course) => {
      const mapUrl = `https://www.openstreetmap.org/${course.type}/${course.id}`;
      const useWebsite = course.website && isHttpUrl(course.website);
      const linkHref = useWebsite ? course.website : mapUrl;
      const linkLabel = useWebsite ? "Visit website →" : "View on map →";
      const favorited = favorites.some((f) => courseKey(f) === courseKey(course));
      const badgesHtml = [
        course.access ? `<span class="badge ${course.access.className}">${course.access.label}</span>` : "",
        course.holes ? `<span class="badge badge-holes">${course.holes}</span>` : "",
      ].join("");

      return `
        <div class="course-card">
          <button class="fav-btn" data-key="${courseKey(course)}" aria-pressed="${favorited}" aria-label="${favorited ? "Remove from favorites" : "Add to favorites"}">${favorited ? "★" : "☆"}</button>
          <h2>${escapeHtml(course.name)}</h2>
          ${course.distanceMiles != null ? `<p class="distance">${course.distanceMiles.toFixed(1)} mi away</p>` : ""}
          ${course.street ? `<p>${escapeHtml(course.street)}${course.city ? ", " + escapeHtml(course.city) : ""}</p>` : ""}
          ${badgesHtml ? `<div>${badgesHtml}</div>` : ""}
          <p><a href="${linkHref}" target="_blank" rel="noopener">${linkLabel}</a></p>
        </div>
      `;
    })
    .join("");
}

function renderSkeletons(count = 6) {
  resultsCountEl.textContent = "";
  resultsEl.innerHTML = Array.from({ length: count })
    .map(
      () => `
        <div class="course-card skeleton">
          <div class="skeleton-line skeleton-title"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line skeleton-short"></div>
        </div>
      `
    )
    .join("");
}

function loadRecentSearches() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY)) ?? [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query) {
  const recents = [query, ...loadRecentSearches().filter((q) => q.toLowerCase() !== query.toLowerCase())].slice(
    0,
    MAX_RECENT_SEARCHES
  );
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recents));
  renderRecentSearches();
}

function renderRecentSearches() {
  const recents = loadRecentSearches();
  if (viewMode === "favorites" || recents.length === 0) {
    recentEl.innerHTML = "";
    return;
  }
  recentEl.innerHTML =
    `<span class="recent-label">Recent:</span>` +
    recents
      .map((q) => `<button type="button" class="chip" data-query="${escapeHtml(q)}">${escapeHtml(q)}</button>`)
      .join("");
}

recentEl.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  input.value = chip.dataset.query;
  runSearch(chip.dataset.query);
});

resultsEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".fav-btn");
  if (!btn) return;
  const course = currentCourses.find((c) => courseKey(c) === btn.dataset.key);
  if (!course) return;

  toggleFavorite(course);
  if (viewMode === "favorites") {
    // Re-run the full favorites view (not just a re-render) so the empty
    // state message reappears if this was the last favorite removed.
    showFavoritesView();
  } else {
    renderCourses(currentCourses);
  }
});

function showFavoritesView() {
  viewMode = "favorites";
  const favorites = loadFavorites();
  subtitleEl.textContent = favorites.length
    ? "Your favorite courses"
    : "No favorites yet — search for courses and tap ☆ to save one";
  messageEl.textContent = "";
  retryBtn.hidden = true;
  renderRecentSearches();
  renderCourses(favorites);
  updateFavoritesButton();
}

favToggleBtn.addEventListener("click", () => {
  if (viewMode === "favorites") {
    lastAction();
  } else {
    showFavoritesView();
  }
});

function setLoading(isLoading) {
  spinner.hidden = !isLoading;
  submitBtn.disabled = isLoading;
  input.disabled = isLoading;
  favToggleBtn.disabled = isLoading;
  locateBtn.disabled = isLoading;
  if (isLoading) {
    renderSkeletons();
  }
}

// Shared by both a typed search and "Near me" once we have coordinates and
// a human-readable label for them.
async function loadAndRenderCourses(lat, lon, label) {
  subtitleEl.textContent = `Golf courses near ${label}`;

  const data = await fetchGolfCourses(lat, lon, RADIUS_METERS);
  console.log("Overpass API response:", data); // inspect this in devtools!

  const courses = withDistances(parseCourses(data.elements), lat, lon);
  if (courses.length === 0) {
    resultsEl.innerHTML = "";
    messageEl.textContent = `No golf courses found near "${label}". Try a different location.`;
  } else {
    renderCourses(courses);
  }
}

async function runSearch(query) {
  viewMode = "search";
  lastAction = () => runSearch(query);
  setLoading(true);
  messageEl.textContent = "";
  retryBtn.hidden = true;
  updateFavoritesButton();
  renderRecentSearches();

  try {
    const place = await geocodePlace(query);
    await loadAndRenderCourses(place.lat, place.lon, place.displayName);
    saveRecentSearch(query);
  } catch (err) {
    console.error(err);
    resultsEl.innerHTML = "";
    if (err instanceof NotFoundError) {
      messageEl.textContent = `Couldn't find "${query}". Try a more specific place name (e.g. add a state or country).`;
    } else if (err instanceof RateLimitError) {
      messageEl.textContent = "You're searching a bit too fast for this free API. Wait a few seconds and try again.";
      retryBtn.hidden = false;
    } else {
      messageEl.textContent = "Something went wrong loading golf courses. Please try again in a moment.";
      retryBtn.hidden = false;
    }
  } finally {
    setLoading(false);
  }
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new GeolocationError("Geolocation isn't supported in this browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => {
        // Desktops have no GPS, so this relies on Wi-Fi/IP positioning
        // through the OS — POSITION_UNAVAILABLE almost always means the
        // OS-level location service itself is turned off, not a bug here.
        let message;
        if (err.code === err.PERMISSION_DENIED) {
          message = "Location access was denied. Enable it in your browser's site settings, or search by name instead.";
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          message =
            "Your device couldn't determine a location — this usually means Location Services are turned off at the OS level (Windows: Settings → Privacy & security → Location). Search by name instead for now.";
        } else {
          message = "Location took too long to respond. Try again, or search by name instead.";
        }
        reject(new GeolocationError(message));
      },
      { timeout: 15000 }
    );
  });
}

async function useMyLocation() {
  viewMode = "search";
  lastAction = () => useMyLocation();
  setLoading(true);
  messageEl.textContent = "";
  retryBtn.hidden = true;
  updateFavoritesButton();
  renderRecentSearches();

  try {
    const { lat, lon } = await getCurrentPosition();
    await loadAndRenderCourses(lat, lon, "your location");
  } catch (err) {
    console.error(err);
    resultsEl.innerHTML = "";
    if (err instanceof GeolocationError) {
      messageEl.textContent = err.message;
    } else if (err instanceof RateLimitError) {
      messageEl.textContent = "You're searching a bit too fast for this free API. Wait a few seconds and try again.";
      retryBtn.hidden = false;
    } else {
      messageEl.textContent = "Something went wrong loading golf courses. Please try again in a moment.";
      retryBtn.hidden = false;
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

locateBtn.addEventListener("click", () => useMyLocation());
retryBtn.addEventListener("click", () => lastAction());

updateFavoritesButton();
runSearch(DEFAULT_QUERY);
