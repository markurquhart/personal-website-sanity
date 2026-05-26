export const apiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2026-05-20";

export const studioUrl =
  process.env.NEXT_PUBLIC_SANITY_STUDIO_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:3333"
    : "https://studio.markurquhart.com");

export const dataset = assertValue(
  process.env.NEXT_PUBLIC_SANITY_DATASET,
  "Missing environment variable: NEXT_PUBLIC_SANITY_DATASET",
);

export const projectId = assertValue(
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  "Missing environment variable: NEXT_PUBLIC_SANITY_PROJECT_ID",
);

function assertValue<T>(v: T | undefined, errorMessage: string): T {
  if (v === undefined) {
    throw new Error(errorMessage);
  }
  return v;
}
