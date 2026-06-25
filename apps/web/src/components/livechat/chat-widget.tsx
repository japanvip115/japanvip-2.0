'use client'

import { useState, useRef, useEffect } from 'react'

type Message = { role: 'user' | 'assistant'; content: string }

const THINK_MS = () => 8000 + Math.random() * 7000  // 8–15 giây

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
      // Delay giả người thật đang suy nghĩ (8–15s)
      await new Promise((r) => setTimeout(r, THINK_MS()))

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
        { role: 'assistant', content: 'Xin lỗi, mình không phản hồi được lúc này. Bạn vui lòng gọi hotline 09.2729.8888 để được hỗ trợ nhé!' },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed right-3 bottom-6 z-40 sm:right-4">
      {/* Chat window */}
      {open && (
        <div className="mb-3 flex w-80 flex-col rounded-2xl shadow-2xl border border-gray-700 overflow-hidden" style={{background:'#1a1a2e'}}>
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3" style={{background:'#16213e'}}>
            <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
              <svg viewBox="0 0 24 24" fill="white" className="h-4 w-4">
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
              </svg>
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-400 border border-gray-800" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white leading-tight">Tư vấn viên Japan VIP</p>
              <p className="text-xs text-gray-400">Thường phản hồi trong vài phút</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white transition-colors">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 max-h-72" style={{background:'#1a1a2e'}}>
            {messages.length === 0 && (
              <div className="text-center py-4">
                <p className="text-xs text-gray-400">Xin chào! Mình có thể giúp gì cho bạn?</p>
                <div className="mt-2 flex flex-wrap gap-1.5 justify-center">
                  {['Sản phẩm đang bán?', 'Chính sách bảo hành?', 'Địa chỉ showroom?'].map((q) => (
                    <button
                      key={q}
                      onClick={() => setInput(q)}
                      className="rounded-full border border-gray-600 px-2.5 py-1 text-xs text-gray-300 hover:border-gray-400 hover:text-white transition-colors"
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
                      ? 'text-white rounded-br-sm'
                      : 'text-gray-200 rounded-bl-sm'
                  }`}
                  style={m.role === 'user' ? {background:'#0f3460'} : {background:'#16213e'}}
                >
                  {m.content || <span className="inline-block h-4 w-4 animate-pulse rounded bg-gray-600" />}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm px-3 py-2 flex gap-1" style={{background:'#16213e'}}>
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="h-1.5 w-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 border-t border-gray-700 p-2" style={{background:'#16213e'}}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Nhập câu hỏi..."
              disabled={loading}
              className="flex-1 rounded-xl border border-gray-600 bg-gray-800 px-3 py-1.5 text-sm text-white placeholder-gray-500 outline-none focus:border-gray-400 disabled:opacity-50"
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-red text-white disabled:opacity-40 hover:bg-red-600 transition-colors"
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
        aria-label="Chat với tư vấn viên Japan VIP"
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
        {!open && <span className="absolute inset-0 animate-ping rounded-full bg-gray-600 opacity-40" />}
      </button>
    </div>
  )
}
