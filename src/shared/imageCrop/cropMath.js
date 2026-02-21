// Görseli kare viewport içine "contain" yerleşimle sığdır
export function containScale(imgW, imgH, vp) {
  if (!imgW || !imgH) return 1;
  return Math.min(vp / imgW, vp / imgH);
}

// Görselin viewport içindeki konumu (contain sonucu)
export function imageViewportRect(imgW, imgH, vp) {
  const s = containScale(imgW, imgH, vp);
  const dw = imgW * s;
  const dh = imgH * s;
  const ox = (vp - dw) / 2;
  const oy = (vp - dh) / 2;
  return { x: ox, y: oy, w: dw, h: dh, scale: s };
}

// Dikdörtgeni (crop alanı) imageRect sınırları içinde tut
export function clampRect(rect, bounds, minSize = 40) {
  let { x, y, w, h } = rect;
  w = Math.max(w, minSize);
  h = Math.max(h, minSize);

  // Sağ/alt sınır
  if (x + w > bounds.x + bounds.w) x = bounds.x + bounds.w - w;
  if (y + h > bounds.y + bounds.h) y = bounds.y + bounds.h - h;

  // Sol/üst sınır
  if (x < bounds.x) x = bounds.x;
  if (y < bounds.y) y = bounds.y;

  return { x, y, w, h };
}
