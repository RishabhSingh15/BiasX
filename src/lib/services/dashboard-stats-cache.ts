/**
 * Client-Side In-Flight Request Deduplication and Cache for Dashboard Stats
 * 
 * Prevents multiple simultaneous components (TopBar, Sidebar, Page View)
 * from making redundant parallel requests to the backend.
 */

let inFlightPromise: Promise<any> | null = null;
let cachedData: any = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 15000; // 15 seconds

export async function fetchDashboardStats(forceFresh = false): Promise<any> {
  const now = Date.now();

  // Return memory cache if fresh
  if (!forceFresh && cachedData && (now - lastFetchTime < CACHE_TTL_MS)) {
    return cachedData;
  }

  // Deduplicate in-flight requests
  if (!forceFresh && inFlightPromise) {
    return inFlightPromise;
  }

  inFlightPromise = fetch('/api/dashboard/stats', {
    headers: { 'Cache-Control': 'max-age=15' }
  })
    .then(async (res) => {
      if (!res.ok) {
        throw new Error(`Failed to fetch stats: ${res.status}`);
      }
      const data = await res.json();
      cachedData = data;
      lastFetchTime = Date.now();
      inFlightPromise = null;
      return data;
    })
    .catch((err) => {
      inFlightPromise = null;
      throw err;
    });

  return inFlightPromise;
}

export function invalidateDashboardStats() {
  cachedData = null;
  lastFetchTime = 0;
  inFlightPromise = null;
}
