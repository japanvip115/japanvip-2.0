// Slug tiếng Việt (bỏ dấu, đ→d) + đảm bảo duy nhất.

export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, (c) => (c === 'đ' ? 'd' : 'D'))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'muc'
}

export async function uniqueSlug(base: string, exists: (s: string) => Promise<boolean>): Promise<string> {
  let slug = base
  let n = 1
  while (await exists(slug)) {
    n++
    slug = `${base}-${n}`
  }
  return slug
}
