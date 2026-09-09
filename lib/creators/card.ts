export function slugifyName(input: string) {
  const base = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return base || "creator";
}

export function buildUniqueSlug(name: string, uniquePart: string) {
  const suffix = uniquePart.replace(/-/g, "").slice(0, 8);
  return `${slugifyName(name)}-${suffix}`;
}

export function parseCommaList(raw: string) {
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export type PublishRequirement = {
  id: string;
  label: string;
  met: boolean;
};

export function getPublishRequirements(input: {
  fullName: string;
  headline: string;
  topics: string[];
  audienceSize: number | null;
  priceCents: number | null;
  currency: string;
}) {
  const requirements: PublishRequirement[] = [
    {
      id: "name",
      label: "Display name",
      met: Boolean(input.fullName.trim()),
    },
    {
      id: "headline",
      label: "Headline",
      met: Boolean(input.headline.trim()),
    },
    {
      id: "topics",
      label: "At least one specialty/topic",
      met: input.topics.length > 0,
    },
    {
      id: "audience",
      label: "Follower count",
      met:
        input.audienceSize !== null &&
        Number.isFinite(input.audienceSize) &&
        input.audienceSize >= 0,
    },
    {
      id: "price",
      label: "Price per post",
      met:
        input.priceCents !== null &&
        Number.isFinite(input.priceCents) &&
        input.priceCents >= 0,
    },
    {
      id: "currency",
      label: "Currency",
      met: Boolean(input.currency.trim()),
    },
  ];

  return {
    requirements,
    ready: requirements.every((item) => item.met),
    missing: requirements.filter((item) => !item.met).map((item) => item.label),
  };
}
