// Modified for standalone community distribution; see NOTICE.
/** GPT Image 2: 16px alignment, <=3840px per edge, 655360–8294400 pixels.
 * https://developers.openai.com/api/docs/guides/image-generation
 * 4K denotes the resolution tier: UHD landscape or the equivalent square area.
 */
export function getGptImage2OutputSize(aspectRatio?: string, imageSize?: string) {
  const [w, h] = String(aspectRatio || "1:1").split(":").map(Number);
  const ratio = w > 0 && h > 0 && Number.isFinite(w / h)
    ? Math.max(1 / 3, Math.min(3, w / h)) : 1;
  const tier = String(imageSize || "2K").toUpperCase();
  const edge = tier === "1K" ? 1024 : tier === "4K" ? 4096 : 2048;
  let width = ratio >= 1 ? edge : edge * ratio;
  let height = ratio >= 1 ? edge / ratio : edge;
  const scale = Math.min(1, 3840 / Math.max(width, height), Math.sqrt(8294400 / (width * height)));
  width *= scale;
  height *= scale;
  const underMinimum = width * height < 655360;
  if (underMinimum) {
    const growth = Math.sqrt(655360 / (width * height));
    width *= growth;
    height *= growth;
  }
  const align = (value: number) => (underMinimum ? Math.ceil(value / 16) : Math.floor(value / 16)) * 16;
  width = align(width);
  height = align(height);
  // Alignment must also respect the maximum 3:1 aspect ratio.
  width = Math.min(width, height * 3);
  height = Math.min(height, width * 3);
  return { width, height };
}
