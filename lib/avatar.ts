// Avatar URLs are stored at whatever size the source gave us (GitHub's
// default is ~460px; uploads are pre-downscaled by the picker). CSS never
// reduces downloaded bytes, so this asks the source for the size the page
// actually displays — GitHub's CDN resizes for free, and our storage-served
// photos are already small enough to serve as-is at every display size.
export function avatarSrc(url: string, displayPx: number): string {
  if (!url.startsWith("https://avatars.githubusercontent.com/")) {
    return url;
  }
  // 2x the CSS size: crisp on retina without paying for pixels nobody
  // can see. The ?s parameter survives GitHub's ?v=4 cache-buster via
  // the URL API's parameter merge.
  const parsed = new URL(url);
  parsed.searchParams.set("s", String(displayPx * 2));
  return parsed.toString();
}
