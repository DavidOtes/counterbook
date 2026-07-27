/**
 * Downscale a photo before sending it to the AI receipt reader — phone
 * photos are 5–12 MB; a 1280px JPEG is plenty for reading a receipt and
 * keeps the request fast on shop wifi.
 */
export async function downscaleToBase64(
  file: File,
  maxDim = 1280,
  quality = 0.8,
): Promise<{ data: string; mediaType: string }> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas context");
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    return { data: dataUrl.split(",")[1], mediaType: "image/jpeg" };
  } catch {
    // Fallback: send the original file as-is.
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    return { data, mediaType: file.type || "image/jpeg" };
  }
}
