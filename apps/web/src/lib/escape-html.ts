const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export function escapeHtml(input: string | null | undefined): string {
  if (!input) return ''
  return input.replace(/[&<>"']/g, (ch) => HTML_ENTITIES[ch] ?? ch)
}
