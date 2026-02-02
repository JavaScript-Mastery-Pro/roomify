import { puter } from "@heyputer/puter.js";
import { ROOMIFY_RENDER_PROMPT } from "@/lib/constants";

export const generate3DView = async ({
  sourceImage,
  projectId,
}: {
  sourceImage: string;
  projectId?: string | null;
}) => {
  const base64Data = sourceImage.split(",")[1];
  const mimeType = sourceImage.split(";")[0].split(":")[1];

  const response = await puter.ai.txt2img(ROOMIFY_RENDER_PROMPT, {
    provider: "gemini",
    model: "gemini-2.5-flash-image-preview",
    input_image: base64Data,
    input_image_mime_type: mimeType,
    ratio: { w: 1024, h: 1024 },
  });

  const rawImageUrl =
    typeof response === "string"
      ? response
      : response instanceof HTMLImageElement
        ? response.src
        : null;

  if (!rawImageUrl) return { renderedImage: null, renderedPath: undefined };

  try {
    const blob = await (await fetch(rawImageUrl)).blob();
    try {
      await puter.fs.mkdir("roomify/renders", { recursive: true });
    } catch (error) {
      console.warn("Failed to ensure render directory:", error);
    }

    const fileName = projectId
      ? `roomify/renders/${projectId}.png`
      : `roomify/renders/${Date.now()}.png`;
    await puter.fs.write(fileName, blob);

    const storedUrl = await puter.fs.getReadURL(fileName);
    return { renderedImage: storedUrl, renderedPath: fileName };
  } catch (error) {
    console.error("Failed to store image in Puter FS:", error);
    return { renderedImage: rawImageUrl, renderedPath: undefined };
  }
};
