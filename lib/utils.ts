export const HOSTING_CONFIG_KEY = "roomify_hosting_config";
export const HOSTING_ROOT_DIR = "roomify/hosting";
export const HOSTING_DOMAIN_SUFFIX = ".puter.site";

export const isHostedUrl = (value: unknown): value is string =>
  typeof value === "string" && value.includes(HOSTING_DOMAIN_SUFFIX);

export const createHostingSlug = () =>
  `roomify-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

const normalizeHost = (subdomain: string) =>
  subdomain.endsWith(HOSTING_DOMAIN_SUFFIX)
    ? subdomain
    : `${subdomain}${HOSTING_DOMAIN_SUFFIX}`;

const normalizePath = (value: string) =>
  value.replace(/^\/+/, "").replace(/\/+$/, "");

export const getHostedUrl = (
  hosting: { subdomain: string; root_dir: string },
  filePath: string,
): string | null => {
  if (!hosting?.subdomain || !hosting?.root_dir) return null;
  const host = normalizeHost(hosting.subdomain);
  const rootDir = normalizePath(hosting.root_dir);
  const normalizedFile = normalizePath(filePath);
  const prefix = rootDir ? `${rootDir}/` : "";
  const relativePath =
    prefix && normalizedFile.startsWith(prefix)
      ? normalizedFile.slice(prefix.length)
      : normalizedFile;
  return `https://${host}/${relativePath}`;
};

export const getImageExtension = (contentType: string, url: string): string => {
  const type = (contentType || "").toLowerCase();
  if (type.includes("image/png")) return "png";
  if (type.includes("image/jpeg") || type.includes("image/jpg")) return "jpg";
  if (type.includes("image/webp")) return "webp";
  if (type.includes("image/gif")) return "gif";
  if (type.includes("image/svg")) return "svg";

  if (url && !url.startsWith("http") && !url.startsWith("data:")) {
    const parts = url.split(".");
    if (parts.length > 1) {
      const ext = parts.pop();
      if (ext) return ext.toLowerCase();
    }
  }

  const dataMatch = url.match(/^data:image\/([a-z0-9+.-]+);/i);
  if (dataMatch?.[1]) {
    const ext = dataMatch[1].toLowerCase();
    return ext === "jpeg" ? "jpg" : ext;
  }

  try {
    const parsed = new URL(url);
    const ext = parsed.pathname.split(".").pop();
    return ext ? ext.toLowerCase() : "png";
  } catch {
    return "png";
  }
};

export const dataUrlToBlob = (
  dataUrl: string,
): { blob: Blob; contentType: string } | null => {
  try {
    const [header, data] = dataUrl.split(",", 2);
    if (!header || typeof data !== "string") return null;
    const contentType = header.split(":")[1]?.split(";")[0] || "";
    const isBase64 = header.includes(";base64");
    const raw = isBase64 ? atob(data.replace(/\s/g, "")) : decodeURIComponent(data);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) {
      bytes[i] = raw.charCodeAt(i);
    }
    return { blob: new Blob([bytes], { type: contentType }), contentType };
  } catch {
    return null;
  }
};

export const fetchBlobFromUrl = async (
  url: string,
): Promise<{ blob: Blob; contentType: string } | null> => {
  if (url.startsWith("data:")) {
    return dataUrlToBlob(url);
  }

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch image");
    return {
      blob: await response.blob(),
      contentType: response.headers.get("content-type") || "",
    };
  } catch {
    return null;
  }
};

export const imageUrlToPngBlob = async (url: string): Promise<Blob | null> => {
  if (typeof window === "undefined") return null;

  try {
    const img = new Image();
    img.crossOrigin = "anonymous";

    const loaded = await new Promise<HTMLImageElement>((resolve, reject) => {
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = url;
    });

    const width = loaded.naturalWidth || loaded.width;
    const height = loaded.naturalHeight || loaded.height;
    if (!width || !height) return null;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(loaded, 0, 0, width, height);

    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), "image/png");
    });
  } catch {
    return null;
  }
};
