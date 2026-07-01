export interface TikTokOEmbed {
  title: string;
  author_name: string;
  thumbnail_url: string;
  html: string;
}

export function isTikTokUrl(url: string): boolean {
  return /tiktok\.com/i.test(url.trim());
}

export async function fetchTikTokOEmbed(url: string): Promise<TikTokOEmbed> {
  const endpoint = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url.trim())}`;
  const res = await fetch(endpoint);
  if (!res.ok) {
    throw new Error('Could not load TikTok preview for this link.');
  }
  return res.json();
}
