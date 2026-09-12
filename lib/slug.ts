const DIACRITICS = /[̀-ͯ]/g;

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function uniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>
): Promise<string> {
  const baseSlug = slugify(base) || "item";
  let slug = baseSlug;
  let suffix = 1;
  while (await exists(slug)) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }
  return slug;
}
