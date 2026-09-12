/**
 * Real-Time Client-Side Request Deduplication and Fresh State Synchronization
 * 
 * Deduplicates multiple parallel requests while ensuring that any data mutation
 * immediately clears stale data and broadcasts updates to all active views.
 */

let inFlightPromise: Promise<any> | null = null;
let cachedData: any = null;

export async function fetchDashboardStats(forceFresh = false): Promise<any> {
  // If forceFresh is requested, bust in-flight promise and return fresh network data
  if (forceFresh) {
    cachedData = null;
    inFlightPromise = null;
  }

  // Deduplicate concurrent in-flight requests made at the exact same moment
  if (inFlightPromise) {
    return inFlightPromise;
  }

  // Return existing data only if forceFresh is false and cachedData is present in current tick
  if (!forceFresh && cachedData) {
    return cachedData;
  }

  inFlightPromise = fetch(`/api/dashboard/stats?_t=${Date.now()}`, {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
    }
  })
    .then(async (res) => {
      if (!res.ok) {
        throw new Error(`Failed to fetch stats: ${res.status}`);
      }
      const data = await res.json();
      cachedData = data;
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
  inFlightPromise = null;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('biasx:data-mutated'));
  }
}

export function notifyDataMutated() {
  invalidateDashboardStats();
}
