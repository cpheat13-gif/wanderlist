const ACCESS_KEY = process.env.EXPO_PUBLIC_UNSPLASH_ACCESS_KEY;

export interface DestinationPhoto {
  url: string;
  photographerName: string;
  photographerUrl: string;
}

// Searches Unsplash for a landscape photo matching a destination (e.g. "Norway",
// "Lisbon, Portugal") and returns a ~4K-wide crop plus the attribution Unsplash's
// API terms require us to show.
export async function fetchDestinationPhoto(query: string): Promise<DestinationPhoto | null> {
  const trimmed = query.trim();
  if (!ACCESS_KEY || !trimmed) return null;

  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(trimmed)}&orientation=landscape&per_page=1`,
    { headers: { Authorization: `Client-ID ${ACCESS_KEY}` } }
  );
  if (!res.ok) return null;

  const json = await res.json();
  const photo = json.results?.[0];
  if (!photo) return null;

  return {
    url: `${photo.urls.raw}&w=3840&q=80&fm=jpg&fit=crop`,
    photographerName: photo.user.name,
    photographerUrl: `${photo.user.links.html}?utm_source=wanderlist&utm_medium=referral`,
  };
}
