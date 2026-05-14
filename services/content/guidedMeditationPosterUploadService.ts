import { getContentApiUrl } from "../../utils/contentApi.config";

type UploadPosterResponse = {
  message?: string;
  data?: { imageUrl?: string };
};

const readJson = async (res: Response): Promise<UploadPosterResponse> => {
  try {
    return (await res.json()) as UploadPosterResponse;
  } catch {
    return {};
  }
};

/**
 * Uploads a PNG (or other image) data URL from the Icon Studio to the music API,
 * which stores it under GCS path images/guided-meditation/… and returns a public https URL.
 */
export async function uploadGuidedMeditationPosterFromDataUrl(
  dataUrl: string,
  filenameHint = "guided-meditation-cover.png"
): Promise<string> {
  const trimmed = dataUrl.trim();
  if (!/^data:image\//i.test(trimmed)) {
    throw new Error("Expected a data: image URL from the icon studio.");
  }

  const comma = trimmed.indexOf(",");
  if (comma === -1) {
    throw new Error("Invalid image data URL.");
  }

  const header = trimmed.slice(0, comma);
  const base64 = trimmed.slice(comma + 1);
  const mimeMatch = header.match(/^data:([^;,]+)/i);
  const mimeType = mimeMatch?.[1]?.trim() || "image/png";

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  const blob = new Blob([bytes], { type: mimeType });
  const form = new FormData();
  form.append("imageFile", blob, filenameHint);

  const res = await fetch(`${getContentApiUrl()}/uploadFiles/guided-meditation/poster`, {
    method: "POST",
    body: form,
  });

  const body = await readJson(res);
  if (!res.ok) {
    const msg =
      typeof body.message === "string" && body.message
        ? body.message
        : `Upload failed (${res.status})`;
    throw new Error(msg);
  }

  const url = body.data?.imageUrl;
  if (!url || typeof url !== "string") {
    throw new Error("Upload succeeded but no image URL was returned.");
  }

  return url;
}
