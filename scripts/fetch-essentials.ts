/**
 * fetch-essentials.ts
 *
 * Standalone script — run with:
 *   npx tsx scripts/fetch-essentials.ts --address "Rua XV de Novembro, Curitiba"
 *   npx tsx scripts/fetch-essentials.ts --lat -25.4284 --lng -49.2733
 *   npx tsx scripts/fetch-essentials.ts --address "..." --radius 1500
 *
 * Loads GOOGLE_MAPS_API_KEY from .env.local automatically (Node 20.12+ /
 * 21.7+ native env file loading — no dotenv package needed).
 */

try {
  process.loadEnvFile?.(".env.local");
} catch {
  // .env.local doesn't exist or isn't readable — fall through and let the
  // GOOGLE_MAPS_API_KEY check below give a clear error instead.
}

import { fetchNearbyEssentials } from "../src/integrations/google-maps";

/** Geocoding API: turns a free-text address into { lat, lng }. Not part of
 * src/integrations/google-maps.ts yet — kept local to this script until
 * there's a second caller that needs it. */
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number }> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error("GOOGLE_MAPS_API_KEY is not set (check .env.local)");

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", address);
  url.searchParams.set("key", key);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Geocoding failed: ${response.status} ${await response.text()}`);
  }

  const data = (await response.json()) as {
    status: string;
    results: { geometry: { location: { lat: number; lng: number } }; formatted_address: string }[];
  };

  const result = data.results[0];
  if (data.status !== "OK" || !result) {
    throw new Error(`No geocoding result for "${address}" (status: ${data.status})`);
  }

  const { location } = result.geometry;
  console.log(`Geocoded "${address}" -> ${result.formatted_address} (${location.lat}, ${location.lng})`);
  return { lat: location.lat, lng: location.lng };
}

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i === -1 ? undefined : args[i + 1];
  };

  const address = get("--address");
  const lat = get("--lat");
  const lng = get("--lng");
  const radius = get("--radius");

  return {
    address,
    lat: lat ? parseFloat(lat) : undefined,
    lng: lng ? parseFloat(lng) : undefined,
    radiusMeters: radius ? parseInt(radius, 10) : 2000,
  };
}

function printPlace(p: { name: string; rating?: number; priceLevel?: number; transitDurationMinutes?: number; address?: string }) {
  const rating = p.rating !== undefined ? `${p.rating}★` : "no rating";
  const price = p.priceLevel !== undefined ? "$".repeat(p.priceLevel + 1) : "?";
  const transit = p.transitDurationMinutes !== undefined ? `${p.transitDurationMinutes} min transit` : "no transit route";
  console.log(`  - ${p.name} (${rating}, ${price}, ${transit}) — ${p.address ?? ""}`);
}

async function main() {
  const { address, lat, lng, radiusMeters } = parseArgs();

  let origin: { lat: number; lng: number };
  if (address) {
    origin = await geocodeAddress(address);
  } else if (lat !== undefined && lng !== undefined) {
    origin = { lat, lng };
  } else {
    console.error(
      'Usage:\n  npx tsx scripts/fetch-essentials.ts --address "some address"\n  npx tsx scripts/fetch-essentials.ts --lat -25.4284 --lng -49.2733\nOptional: --radius <meters> (default 2000)',
    );
    process.exit(1);
  }

  const { restaurants, groceries, pharmacies, parks } = await fetchNearbyEssentials(origin, radiusMeters);

  console.log(`\nRestaurants (${restaurants.length}):`);
  restaurants.forEach(printPlace);

  console.log(`\nGroceries (${groceries.length}):`);
  groceries.forEach(printPlace);

  console.log(`\nPharmacies (${pharmacies.length}):`);
  pharmacies.forEach(printPlace);

  console.log(`\nParks (${parks.length}):`);
  parks.forEach(printPlace);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
