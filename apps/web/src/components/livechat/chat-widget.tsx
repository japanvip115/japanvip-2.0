'use client'

import { useState, useRef, useEffect } from 'react'

type Message = { role: 'user' | 'assistant'; content: string }

export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    const next: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setLoading(true)

    try {
      const res = await fetch('/api/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      })
      if (!res.ok || !res.body) throw new Error()

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      let reply = ''
      setMessages((m) => [...m, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const json = JSON.parse(line.slice(6))
            if (json.type === 'content_block_delta' && json.delta?.text) {
              reply += json.delta.text
              setMessages((m) => [
                ...m.slice(0, -1),
                { role: 'assistant', content: reply },
              ])
            }
          } catch {}
        }
      }
    } catch {
      setMessages((m) => [
        ...m.slice(0, -1),
        { role: 'assistant', content: 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại hoặc gọi hotline 09.2729.8888.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed left-3 bottom-6 z-40 sm:left-4">
      {/* Chat window */}
      {open && (
        <div className="mb-3 flex w-80 flex-col rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2.5 bg-primary px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
              <svg viewBox="0 0 24 24" fill="white" className="h-4 w-4">
                <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 3.04 1.05 4.38L2 22l5.62-1.05A9.94 9.94 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.41 0-2.75-.37-3.93-1.01l-.28-.16-3.33.62.62-3.33-.16-.28A7.94 7.94 0 014 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white leading-tight">Japan VIP AI</p>
              <p className="text-xs text-white/75">Tư vấn hàng nội địa Nhật</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/75 hover:text-white">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 max-h-72 bg-gray-50">
            {messages.length === 0 && (
              <div className="text-center py-4">
                <p className="text-xs text-gray-400">Xin chào! Tôi có thể giúp gì cho bạn?</p>
                <div className="mt-2 flex flex-wrap gap-1.5 justify-center">
                  {['Sản phẩm đang bán?', 'Chính sách bảo hành?', 'Địa chỉ showroom?'].map((q) => (
                    <button
                      key={q}
                      onClick={() => { setInput(q); }}
                      className="rounded-full border border-primary/30 px-2.5 py-1 text-xs text-primary hover:bg-primary/5"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-primary text-white rounded-br-sm'
                      : 'bg-white text-gray-800 shadow-sm rounded-bl-sm'
                  }`}
                >
                  {m.content || <span className="inline-block h-4 w-4 animate-pulse rounded bg-gray-200" />}
                </div>
              </div>
            ))}
            {loading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl rounded-bl-sm px-3 py-2 shadow-sm flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 border-t border-gray-100 p-2 bg-white">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Nhập câu hỏi..."
              disabled={loading}
              className="flex-1 rounded-xl border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-primary disabled:opacity-50"
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white disabled:opacity-40 hover:bg-red-600 transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 rotate-90">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Chat với Japan VIP AI"
        className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-gray-800 shadow-xl transition-transform hover:scale-110 active:scale-95 relative"
      >
        {open ? (
          <svg viewBox="0 0 24 24" fill="white" className="h-6 w-6">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="white" className="h-6 w-6 sm:h-7 sm:w-7">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/>
          </svg>
        )}
        {!open && <span className="absolute inset-0 animate-ping rounded-full bg-red-400 opacity-30" />}
      </button>
    </div>
  )
}
