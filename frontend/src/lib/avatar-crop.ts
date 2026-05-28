export interface AvatarCropState {
  zoom: number;
  panX: number;
  panY: number;
}

export const AVATAR_CROP_VIEWPORT = 280;
export const AVATAR_CROP_CIRCLE = 240;
export const AVATAR_CROP_OUTPUT = 512;

export function getBaseFitScale(image: HTMLImageElement, viewport: number): number {
  return getBaseFitScaleFromSize(image.naturalWidth, image.naturalHeight, viewport);
}

export function getBaseFitScaleFromSize(
  naturalWidth: number,
  naturalHeight: number,
  viewport: number
): number {
  return Math.min(viewport / naturalWidth, viewport / naturalHeight);
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = src;
  });
}

/** Export the visible square viewport region as a JPEG blob (profile avatar). */
export async function cropAvatarToBlob(
  imageSrc: string,
  state: AvatarCropState,
  options?: {
    viewport?: number;
    outputSize?: number;
    quality?: number;
  }
): Promise<Blob> {
  const viewport = options?.viewport ?? AVATAR_CROP_VIEWPORT;
  const outputSize = options?.outputSize ?? AVATAR_CROP_OUTPUT;
  const img = await loadImage(imageSrc);
  const scale = getBaseFitScale(img, viewport) * state.zoom;
  const displayW = img.naturalWidth * scale;
  const displayH = img.naturalHeight * scale;
  const left = viewport / 2 - displayW / 2 + state.panX;
  const top = viewport / 2 - displayH / 2 + state.panY;

  const sx = (0 - left) / scale;
  const sy = (0 - top) / scale;
  const sw = viewport / scale;
  const sh = viewport / scale;

  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outputSize, outputSize);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Failed to export image"))),
      "image/jpeg",
      options?.quality ?? 0.92
    );
  });
}
