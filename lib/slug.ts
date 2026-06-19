/** Býr til vefslóðarvænt slug úr heiti (íslenskir stafir meðtaldir). */
export function slugify(input: string): string {
  const base = (input || "")
    .toLowerCase()
    .replace(/þ/g, "th")
    .replace(/ð/g, "d")
    .replace(/æ/g, "ae")
    .replace(/ö/g, "o")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
  return base || "vidburdur";
}
