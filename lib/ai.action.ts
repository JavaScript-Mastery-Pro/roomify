import { puter } from "@heyputer/puter.js";
import { ROOMIFY_RENDER_PROMPT } from "@/lib/constants";

const fetchAsDataUrl = async (url: string): Promise<string> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch source image.");
  const blob = await response.blob();

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read source image."));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
};

export const generate3DView = async ({
  sourceImage,
  projectId,
}: {
  sourceImage: string;
  projectId?: string | null;
}) => {
  const dataUrl = sourceImage.startsWith("data:")
    ? sourceImage
    : await fetchAsDataUrl(sourceImage);

  const base64Data = dataUrl.split(",")[1];
  const mimeType = dataUrl.split(";")[0].split(":")[1];

  if (!base64Data || !mimeType) {
    throw new Error("Invalid source image payload.");
  }

  const response = await puter.ai.txt2img(ROOMIFY_RENDER_PROMPT, {
    provider: "gemini",
    model: "gemini-2.5-flash-image-preview",
    input_image: base64Data,
    input_image_mime_type: mimeType,
    ratio: { w: 1024, h: 1024 },
  });

  const rawImageUrl = (response as HTMLImageElement).src ?? null;

  if (!rawImageUrl) return { renderedImage: null, renderedPath: undefined };

  const renderedImage = rawImageUrl.startsWith("data:")
    ? rawImageUrl
    : await fetchAsDataUrl(rawImageUrl);

  return { renderedImage, renderedPath: undefined };
};
