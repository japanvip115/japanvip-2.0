'use client'

import { useState, useEffect, useCallback } from 'react'
import { Calendar, Plus, Trash2, RefreshCw, CheckCircle, XCircle, Clock, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'

type TaskType = 'PRODUCT_DESCRIPTION' | 'BLOG_POST' | 'FAQ' | 'SEO_META'
type TaskStatus = 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED'

interface ContentTask {
  id: string
  type: TaskType
  status: TaskStatus
  scheduledAt: string
  title: string
  topic: string | null
  keywords: string | null
  sourceUrl: string | null
  provider: string
  resultId: string | null
  resultType: string | null
  errorMessage: string | null
  ranAt: string | null
}

const TYPE_LABELS: Record<TaskType, string> = {
  PRODUCT_DESCRIPTION: '📦 Mô tả SP',
  BLOG_POST: '✍️ Bài Blog',
  FAQ: '❓ FAQ',
  SEO_META: '🔍 SEO Meta',
}

const TYPE_COLORS: Record<TaskType, string> = {
  PRODUCT_DESCRIPTION: 'bg-blue-900/40 text-blue-300 border-blue-700',
  BLOG_POST: 'bg-purple-900/40 text-purple-300 border-purple-700',
  FAQ: 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
  SEO_META: 'bg-green-900/40 text-green-300 border-green-700',
}

const STATUS_ICONS: Record<TaskStatus, React.ReactNode> = {
  PENDING: <Clock className="h-3.5 w-3.5 text-gray-400" />,
  RUNNING: <Loader2 className="h-3.5 w-3.5 text-blue-400 animate-spin" />,
  DONE: <CheckCircle className="h-3.5 w-3.5 text-green-400" />,
  FAILED: <XCircle className="h-3.5 w-3.5 text-red-400" />,
}

const EMPTY_FORM = {
  type: 'BLOG_POST' as TaskType,
  title: '',
  topic: '',
  keywords: '',
  sourceUrl: '',
  provider: 'anthropic',
  scheduledAt: '',
}

export function CalendarClient() {
  const [tasks, setTasks] = useState<ContentTask[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/admin/content/tasks?month=${currentMonth}`)
      const data = await res.json()
      setTasks(data.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [currentMonth])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  function prevMonth() {
    const [y, m] = currentMonth.split('-').map(Number)
    const d = new Date(y!, m! - 2, 1)
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  function nextMonth() {
    const [y, m] = currentMonth.split('-').map(Number)
    const d = new Date(y!, m!, 1)
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  async function handleCreate() {
    if (!form.title.trim() || !form.scheduledAt) return
    setSaving(true)
    try {
      await fetch('/api/v1/admin/content/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          topic: form.topic || undefined,
          keywords: form.keywords || undefined,
          sourceUrl: form.sourceUrl || undefined,
          scheduledAt: new Date(form.scheduledAt).toISOString(),
        }),
      })
      setForm(EMPTY_FORM)
      setShowForm(false)
      fetchTasks()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Xóa task này?')) return
    setDeletingId(id)
    try {
      await fetch(`/api/v1/admin/content/tasks/${id}`, { method: 'DELETE' })
      fetchTasks()
    } finally {
      setDeletingId(null)
    }
  }

  async function handleRetry(id: string) {
    setRetryingId(id)
    try {
      await fetch(`/api/v1/admin/content/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PENDING' }),
      })
      fetchTasks()
    } finally {
      setRetryingId(null)
    }
  }

  // Group tasks by date
  const grouped = tasks.reduce<Record<string, ContentTask[]>>((acc, t) => {
    const day = t.scheduledAt.slice(0, 10)
    if (!acc[day]) acc[day] = []
    acc[day]!.push(t)
    return acc
  }, {})

  const monthLabel = new Date(currentMonth + '-01').toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
  const pendingCount = tasks.filter(t => t.status === 'PENDING').length
  const doneCount = tasks.filter(t => t.status === 'DONE').length
  const failedCount = tasks.filter(t => t.status === 'FAILED').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calendar className="h-6 w-6 text-purple-400" /> Content Calendar
          </h1>
          <p className="text-sm text-gray-400 mt-1">Lên lịch tạo nội dung tự động bằng AI</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 px-4 py-2.5 text-sm font-semibold text-white transition"
        >
          <Plus className="h-4 w-4" /> Tạo lịch mới
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Chờ chạy', value: pendingCount, color: 'text-gray-300' },
          { label: 'Hoàn thành', value: doneCount, color: 'text-green-400' },
          { label: 'Lỗi', value: failedCount, color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-gray-700 bg-gray-800/60 p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between rounded-xl border border-gray-700 bg-gray-800/60 px-4 py-3">
        <button onClick={prevMonth} className="rounded-lg p-1.5 hover:bg-gray-700 text-gray-400 hover:text-white transition">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="font-semibold text-white capitalize">{monthLabel}</span>
        <button onClick={nextMonth} className="rounded-lg p-1.5 hover:bg-gray-700 text-gray-400 hover:text-white transition">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Task list grouped by date */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Đang tải...
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-700 py-16 text-center">
          <Calendar className="h-10 w-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">Chưa có lịch nào trong tháng này</p>
          <button onClick={() => setShowForm(true)} className="mt-3 text-sm text-purple-400 hover:underline">
            + Tạo lịch đầu tiên
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).sort().map(([date, dayTasks]) => (
            <div key={date}>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                {new Date(date + 'T00:00:00').toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })}
              </p>
              <div className="space-y-2">
                {dayTasks.map(task => (
                  <div key={task.id} className="rounded-xl border border-gray-700 bg-gray-800/60 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {STATUS_ICONS[task.status]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${TYPE_COLORS[task.type]}`}>
                            {TYPE_LABELS[task.type]}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(task.scheduledAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {task.status === 'DONE' && (
                            <span className="text-[10px] text-green-400 font-medium">✓ Hoàn thành</span>
                          )}
                          {task.status === 'RUNNING' && (
                            <span className="text-[10px] text-blue-400 font-medium animate-pulse">⚡ Đang chạy...</span>
                          )}
                        </div>
                        <p className="mt-1.5 font-medium text-sm text-white leading-snug">{task.title}</p>
                        {task.keywords && (
                          <p className="mt-0.5 text-xs text-gray-500">🔑 {task.keywords}</p>
                        )}
                        {task.status === 'FAILED' && task.errorMessage && (
                          <p className="mt-1.5 text-xs text-red-400 bg-red-900/20 rounded-lg px-2 py-1">❌ {task.errorMessage}</p>
                        )}
                        {task.status === 'DONE' && task.resultType && (
                          <a
                            href={task.resultType === 'blog_post'
                              ? `/admin/content/blog/${task.resultId}`
                              : `/admin/products/${task.resultId}`}
                            className="mt-1.5 inline-block text-xs text-purple-400 hover:underline"
                          >
                            Xem kết quả →
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {task.status === 'FAILED' && (
                          <button
                            onClick={() => handleRetry(task.id)}
                            disabled={retryingId === task.id}
                            className="rounded-lg p-1.5 text-gray-400 hover:text-yellow-400 hover:bg-yellow-900/20 transition"
                            title="Thử lại"
                          >
                            <RefreshCw className={`h-3.5 w-3.5 ${retryingId === task.id ? 'animate-spin' : ''}`} />
                          </button>
                        )}
                        {task.status !== 'RUNNING' && (
                          <button
                            onClick={() => handleDelete(task.id)}
                            disabled={deletingId === task.id}
                            className="rounded-lg p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-900/20 transition"
                            title="Xóa"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-5">Tạo lịch nội dung</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Loại nội dung</label>
                <select
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value as TaskType }))}
                  className="mt-1.5 w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
                >
                  {Object.entries(TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Tiêu đề / Chủ đề *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="VD: Nồi cơm điện Tiger JBS-A055KM — đánh giá chi tiết"
                  className="mt-1.5 w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Mô tả thêm (tùy chọn)</label>
                <textarea
                  value={form.topic}
                  onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
                  rows={2}
                  placeholder="Thông tin sản phẩm, góc độ bài viết..."
                  className="mt-1.5 w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-purple-500 resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Từ khóa SEO</label>
                <input
                  value={form.keywords}
                  onChange={e => setForm(f => ({ ...f, keywords: e.target.value }))}
                  placeholder="nồi cơm điện tiger, nồi cơm nhật bản..."
                  className="mt-1.5 w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">URL tham khảo</label>
                <input
                  value={form.sourceUrl}
                  onChange={e => setForm(f => ({ ...f, sourceUrl: e.target.value }))}
                  placeholder="https://..."
                  className="mt-1.5 w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Ngày giờ đăng *</label>
                  <input
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))}
                    className="mt-1.5 w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">AI Engine</label>
                  <select
                    value={form.provider}
                    onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}
                    className="mt-1.5 w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
                  >
                    <option value="claude-code">⚡ Claude Code (Miễn phí)</option>
                    <option value="anthropic">Claude (Anthropic API)</option>
                    <option value="openai">GPT-4 (OpenAI)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}
                className="flex-1 rounded-xl border border-gray-600 py-2.5 text-sm font-semibold text-gray-300 hover:bg-gray-800 transition"
              >
                Hủy
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !form.title.trim() || !form.scheduledAt}
                className="flex-1 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 py-2.5 text-sm font-semibold text-white transition flex items-center justify-center gap-2"
              >
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Đang lưu...</> : '✓ Lưu lịch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
