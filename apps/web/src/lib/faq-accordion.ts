// Chuyển mục "Câu hỏi thường gặp" dạng <h3>Câu hỏi</h3><p>Trả lời</p> (nội dung cũ)
// thành accordion <details class="faq-item"> — bấm mới xổ đáp án. Áp dụng lúc render.
// An toàn với nội dung mới (đã là <details>) và nội dung không có FAQ → trả nguyên.
export function faqToAccordion(html: string): string {
  if (!html || !/câu hỏi thường gặp/i.test(html)) return html
  return html.replace(
    /(<h2[^>]*>[^<]*câu hỏi thường gặp[^<]*<\/h2>)([\s\S]*?)(?=<h2|$)/i,
    (_m, heading: string, body: string) => {
      const converted = body.replace(
        /<h3[^>]*>([\s\S]*?)<\/h3>\s*([\s\S]*?)(?=<h3|$)/gi,
        (whole: string, q: string, ans: string) => {
          const question = q.replace(/<[^>]+>/g, '').trim()
          const answer = ans.trim()
          if (!question || !answer) return whole
          return `<details class="faq-item"><summary>${question}</summary><div class="faq-answer">${answer}</div></details>`
        }
      )
      return heading + converted
    }
  )
}
