'use client'

import { useState } from 'react'
import { KeyRound, Eye, EyeOff } from 'lucide-react'

export function ResetPasswordButton({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) return setError('Mật khẩu tối thiểu 8 ký tự')
    if (password !== confirm) return setError('Mật khẩu xác nhận không khớp')

    setLoading(true)
    try {
      const res = await fetch(`/api/v1/admin/users/${userId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Lỗi không xác định')
      setSuccess(true)
      setTimeout(() => { setOpen(false); setSuccess(false); setPassword(''); setConfirm('') }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-600 bg-gray-700/50 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
      >
        <KeyRound className="h-4 w-4" />
        Đổi mật khẩu
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
            <h3 className="mb-4 text-base font-semibold text-white">Đổi mật khẩu</h3>

            {success ? (
              <p className="text-center text-sm font-medium text-green-400 py-4">✓ Đổi mật khẩu thành công!</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">Mật khẩu mới</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Tối thiểu 8 ký tự"
                      className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 pr-10 text-sm text-white placeholder-gray-500 focus:border-red-500 focus:outline-none"
                      autoComplete="new-password"
                    />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200">
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">Xác nhận mật khẩu</label>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Nhập lại mật khẩu"
                    className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-red-500 focus:outline-none"
                    autoComplete="new-password"
                  />
                </div>

                {error && <p className="text-xs text-red-400">{error}</p>}

                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => { setOpen(false); setError(''); setPassword(''); setConfirm('') }}
                    className="flex-1 rounded-lg border border-gray-600 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 transition-colors">
                    Huỷ
                  </button>
                  <button type="submit" disabled={loading}
                    className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
                    {loading ? 'Đang lưu...' : 'Lưu'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
