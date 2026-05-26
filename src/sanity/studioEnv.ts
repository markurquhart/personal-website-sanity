type StudioEnvMap = Record<string, string | undefined>;

function readStudioEnv(...keys: string[]) {
  const importMetaEnv = (import.meta as ImportMeta & { env?: StudioEnvMap }).env;
  const processEnv = typeof process !== "undefined" ? process.env : undefined;

  for (const key of keys) {
    const value = importMetaEnv?.[key] ?? processEnv?.[key];
    if (value !== undefined) return value;
  }

  return undefined;
}

function assertValue(v: string | undefined, errorMessage: string) {
  if (v === undefined) {
    throw new Error(errorMessage);
  }
  return v;
}

export const studioApiVersion =
  readStudioEnv("SANITY_STUDIO_API_VERSION", "NEXT_PUBLIC_SANITY_API_VERSION") ||
  "2026-05-20";

export const studioDataset = assertValue(
  readStudioEnv("SANITY_STUDIO_DATASET", "NEXT_PUBLIC_SANITY_DATASET"),
  "Missing environment variable: SANITY_STUDIO_DATASET",
);

export const studioProjectId = assertValue(
  readStudioEnv("SANITY_STUDIO_PROJECT_ID", "NEXT_PUBLIC_SANITY_PROJECT_ID"),
  "Missing environment variable: SANITY_STUDIO_PROJECT_ID",
);

export const studioGoogleBooksApiKey = readStudioEnv(
  "SANITY_STUDIO_GOOGLE_BOOKS_API",
  "NEXT_PUBLIC_GOOGLE_BOOKS_API",
);

const inferredSiteUrl =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1")
    ? "http://localhost:3000"
    : "https://www.markurquhart.com";

export const studioPublicSiteUrl =
  readStudioEnv("SANITY_STUDIO_SITE_URL", "NEXT_PUBLIC_SITE_URL") || inferredSiteUrl;
