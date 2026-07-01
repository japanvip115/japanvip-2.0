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
    'details', 'summary',
  ],
  allowedAttributes: {
    '*': ['class', 'id', 'style'],
    details: ['open', 'class', 'id'],
    a: ['href', 'target', 'rel', 'title', 'class', 'id'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading', 'class', 'id'],
    td: ['colspan', 'rowspan', 'class', 'id', 'style'],
    th: ['colspan', 'rowspan', 'scope', 'class', 'id', 'style'],
    col: ['span', 'width', 'style'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: { img: ['http', 'https'] },
  // CSS allowlist — chặn expression()/url(javascript:), cho phép các thuộc tính layout/style an toàn
  allowedStyles: {
    '*': {
      // Layout
      'display': [/^(block|inline|inline-block|flex|grid|none|table|table-cell|table-row)$/],
      'flex': [/^.{1,50}$/],
      'flex-direction': [/^(row|column|row-reverse|column-reverse)$/],
      'flex-wrap': [/^(nowrap|wrap|wrap-reverse)$/],
      'flex-shrink': [/^\d+$/],
      'align-items': [/^(flex-start|flex-end|center|stretch|baseline)$/],
      'justify-content': [/^(flex-start|flex-end|center|space-between|space-around|space-evenly)$/],
      'grid-template-columns': [/^.{1,100}$/],
      'grid-template-rows': [/^.{1,100}$/],
      'gap': [/^[\d\s\w%()-]+$/],
      'column-gap': [/^\d+(\.\d+)?(px|rem|em|%)$/],
      'row-gap': [/^\d+(\.\d+)?(px|rem|em|%)$/],
      'float': [/^(left|right|none)$/],
      'clear': [/^(left|right|both|none)$/],
      'overflow': [/^(hidden|visible|auto|scroll)$/],
      'overflow-x': [/^(hidden|visible|auto|scroll)$/],
      'overflow-y': [/^(hidden|visible|auto|scroll)$/],
      // Sizing
      'width': [/^[\d\s\w%().,+-]+$/],
      'min-width': [/^[\d\s\w%().,+-]+$/],
      'max-width': [/^[\d\s\w%().,+-]+$/],
      'height': [/^[\d\s\w%().,+-]+$/],
      'min-height': [/^[\d\s\w%().,+-]+$/],
      'max-height': [/^[\d\s\w%().,+-]+$/],
      'box-sizing': [/^(border-box|content-box)$/],
      // Spacing
      'margin': [/^[\d\s\w%().,+-]+$/],
      'margin-top': [/^[\d\s\w%().,+-]+$/],
      'margin-right': [/^[\d\s\w%().,+-]+$/],
      'margin-bottom': [/^[\d\s\w%().,+-]+$/],
      'margin-left': [/^[\d\s\w%().,+-]+$/],
      'padding': [/^[\d\s\w%().,+-]+$/],
      'padding-top': [/^[\d\s\w%().,+-]+$/],
      'padding-right': [/^[\d\s\w%().,+-]+$/],
      'padding-bottom': [/^[\d\s\w%().,+-]+$/],
      'padding-left': [/^[\d\s\w%().,+-]+$/],
      // Typography
      'font-size': [/^[\d\s\w%().,+-]+$/],
      'font-weight': [/^(\d{3}|bold|bolder|lighter|normal)$/],
      'font-style': [/^(normal|italic|oblique)$/],
      'line-height': [/^[\d\s\w%().,+-]+$/],
      'text-align': [/^(left|right|center|justify)$/],
      'text-decoration': [/^(none|underline|line-through|overline)$/],
      'letter-spacing': [/^[\d\s\w%().,+-]+$/],
      'white-space': [/^(normal|nowrap|pre|pre-wrap|pre-line)$/],
      'word-break': [/^(normal|break-all|keep-all|break-word)$/],
      // Color & Background (chặn url() để không có data:/javascript:)
      'color': [/^(#[0-9a-fA-F]{3,8}|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)|rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)|[a-z]+)$/],
      'background': [/^(#[0-9a-fA-F]{3,8}|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)|rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)|[a-z]+|none|transparent)$/],
      'background-color': [/^(#[0-9a-fA-F]{3,8}|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)|rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)|[a-z]+|transparent)$/],
      'opacity': [/^[\d.]+$/],
      // Border
      'border': [/^[\d\s\w#().,%-]+$/],
      'border-top': [/^[\d\s\w#().,%-]+$/],
      'border-right': [/^[\d\s\w#().,%-]+$/],
      'border-bottom': [/^[\d\s\w#().,%-]+$/],
      'border-left': [/^[\d\s\w#().,%-]+$/],
      'border-width': [/^[\d\s\w%().,+-]+$/],
      'border-style': [/^(solid|dashed|dotted|double|none|hidden)$/],
      'border-color': [/^(#[0-9a-fA-F]{3,8}|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)|[a-z]+|transparent)$/],
      'border-radius': [/^[\d\s\w%().,+-]+$/],
      'border-collapse': [/^(collapse|separate)$/],
      // Positioning
      'vertical-align': [/^(top|middle|bottom|baseline|sub|super|text-top|text-bottom)$/],
      'position': [/^(static|relative|absolute|fixed|sticky)$/],
      'top': [/^[\d\s\w%().,+-]+$/],
      'right': [/^[\d\s\w%().,+-]+$/],
      'bottom': [/^[\d\s\w%().,+-]+$/],
      'left': [/^[\d\s\w%().,+-]+$/],
      'z-index': [/^\d+$/],
      // Image
      'object-fit': [/^(contain|cover|fill|none|scale-down)$/],
      'object-position': [/^(center|top|bottom|left|right|[\d%]+\s+[\d%]+)$/],
      // Misc
      'cursor': [/^(default|pointer|text|move|not-allowed|grab)$/],
      'list-style': [/^(none|disc|decimal|circle|square)$/],
      'list-style-type': [/^(none|disc|decimal|circle|square)$/],
    },
  },
}

export function sanitizeContentHtml(html: string): string {
  if (!html) return ''
  return sanitizeHtml(html, OPTIONS)
}
