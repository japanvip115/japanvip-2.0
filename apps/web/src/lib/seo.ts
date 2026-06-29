// Bỏ hậu tố thương hiệu lặp ở cuối title (vd "… | Japan VIP", "… — Japan VIP").
// metaTitle trong DB đôi khi đã kèm brand; root layout lại có title.template '%s | Japan VIP'
// → tránh lặp "… | Japan VIP | Japan VIP".
export function stripBrandSuffix(title: string): string {
  return title.replace(/\s*[|\-–—·]\s*Japan\s*VIP\s*$/i, '').trim() || title.trim()
}
