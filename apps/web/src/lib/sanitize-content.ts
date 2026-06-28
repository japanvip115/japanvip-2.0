import sanitizeHtml from 'sanitize-html'

// Làm sạch HTML nội dung (blog/mô tả SP — do AI tạo hoặc cào từ web) trước khi render.
// Allowlist GIỮ NGUYÊN hiển thị hiện tại (bảng/figure/ảnh/heading/list/class style)
// nhưng loại bỏ script/iframe/on*-handler/javascript: → chặn stored-XSS.
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'u', 'small', 'sup', 'sub',
    'a', 'img', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'caption', 'colgroup', 'col',
    'blockquote', 'figure', 'figcaption', 'div', 'span', 'br', 'hr', 'section',
  ],
  allowedAttributes: {
    '*': ['class', 'id', 'style'],
    a: ['href', 'target', 'rel', 'title', 'class', 'id'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading', 'class', 'id'],
    td: ['colspan', 'rowspan', 'class', 'id', 'style'],
    th: ['colspan', 'rowspan', 'scope', 'class', 'id', 'style'],
    col: ['span', 'width', 'style'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: { img: ['http', 'https'] },
  // Chỉ giữ vài thuộc tính CSS an toàn (chặn expression()/url(javascript:)…)
  allowedStyles: {
    '*': {
      'text-align': [/^(left|right|center|justify)$/],
      'vertical-align': [/^(top|middle|bottom|baseline)$/],
      'width': [/^\d+(\.\d+)?(px|%)$/],
      'height': [/^\d+(\.\d+)?(px|%)$/],
    },
  },
}

export function sanitizeContentHtml(html: string): string {
  if (!html) return ''
  return sanitizeHtml(html, OPTIONS)
}
