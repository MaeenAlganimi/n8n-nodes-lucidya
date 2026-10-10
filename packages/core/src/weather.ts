export function openMeteoForecastUrl(latitude: number, longitude: number): string {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', latitude.toFixed(4));
  url.searchParams.set('longitude', longitude.toFixed(4));
  url.searchParams.set('hourly', 'temperature_2m');
  url.searchParams.set('timezone', 'UTC');
  url.searchParams.set('forecast_days', '2');
  return url.toString();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object') return value as Record<string, unknown>;
  return null;
}

/** Open-Meteo UTC stamps look like `2026-10-10T00:00`. Normalize to an ISO hour. */
export function meteoStampToIso(stamp: string): string | null {
  const withZone = stamp.endsWith('Z') ? stamp : `${stamp}Z`;
  const date = new Date(withZone);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

/** Parse an Open-Meteo hourly payload into ISO hour → °C. */
export function parseOpenMeteoHourly(payload: unknown): Map<string, number> {
  const temps = new Map<string, number>();
  const root = asRecord(payload);
  const hourly = root ? asRecord(root.hourly) : null;
  if (!hourly) return temps;
  const times = hourly.time;
  const values = hourly.temperature_2m;
  if (!Array.isArray(times) || !Array.isArray(values)) return temps;
  const count = Math.min(times.length, values.length);
  for (let i = 0; i < count; i++) {
    const stamp = times[i];
    const value = values[i];
    if (typeof stamp !== 'string' || typeof value !== 'number' || !Number.isFinite(value)) continue;
    const iso = meteoStampToIso(stamp);
    if (iso) temps.set(iso, value);
  }
  return temps;
}

export async function fetchOpenMeteoTemps(
  latitude: number,
  longitude: number,
  timeoutMs = 2500,
): Promise<Map<string, number>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(openMeteoForecastUrl(latitude, longitude), { signal: controller.signal });
    if (!response.ok) return new Map();
    return parseOpenMeteoHourly(await response.json());
  } catch {
    return new Map();
  } finally {
    clearTimeout(timer);
  }
}
