'use client'

import { useState, useRef, useEffect, useId } from 'react'
import { ChevronDown, Search, X, Plus } from 'lucide-react'

type Option = { value: string; label: string; group?: string }

type Props = {
  value: string
  onChange: (value: string) => void
  options: Option[]
  placeholder?: string
  emptyLabel?: string
  onCreateNew?: (name: string) => void
  createNewLabel?: string
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = '— Chọn —',
  emptyLabel = 'Không tìm thấy',
  onCreateNew,
  createNewLabel = 'Tạo mới',
}: Props) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = options.find((o) => o.value === value)

  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options

  // Group by group field if present
  const groups = filtered.reduce<Record<string, Option[]>>((acc, o) => {
    const g = o.group ?? ''
    if (!acc[g]) acc[g] = []
    acc[g].push(o)
    return acc
  }, {})

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleOpen() {
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function handleSelect(val: string) {
    onChange(val)
    setOpen(false)
    setQuery('')
  }

  function handleCreateNew() {
    if (!query.trim() || !onCreateNew) return
    onCreateNew(query.trim())
    setQuery('')
    setOpen(false)
  }

  const showCreateNew = onCreateNew && query.trim() && !options.some(
    (o) => o.label.toLowerCase() === query.toLowerCase()
  )

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={open ? () => { setOpen(false); setQuery('') } : handleOpen}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-left text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-red-500/30 hover:border-gray-600"
        style={{ borderColor: open ? 'rgb(239,68,68)' : undefined }}
      >
        <span className={selected ? 'text-gray-100' : 'text-gray-600'}>
          {selected ? selected.label : placeholder}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          {value && (
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); onChange('') }}
              className="rounded p-0.5 text-gray-600 hover:text-gray-300 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 shadow-xl">
          {/* Search */}
          <div className="flex items-center gap-2 border-b border-gray-700 px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-gray-500" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { setOpen(false); setQuery('') }
                if (e.key === 'Enter' && showCreateNew) { e.preventDefault(); handleCreateNew() }
              }}
              placeholder="Tìm kiếm..."
              className="flex-1 bg-transparent text-sm text-gray-100 placeholder-gray-600 outline-none"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} className="cursor-pointer text-gray-600 hover:text-gray-300">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Options */}
          <div className="max-h-56 overflow-y-auto py-1">
            {/* Clear option */}
            <button
              type="button"
              onClick={() => handleSelect('')}
              className="w-full px-3 py-1.5 text-left text-xs text-gray-500 hover:bg-gray-800 hover:text-gray-300 cursor-pointer"
            >
              {placeholder}
            </button>

            {Object.entries(groups).map(([group, opts]) => (
              <div key={group}>
                {group && (
                  <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-600">
                    {group}
                  </div>
                )}
                {opts.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm cursor-pointer transition-colors ${
                      opt.value === value
                        ? 'bg-red-600/20 text-red-400'
                        : 'text-gray-200 hover:bg-gray-800'
                    }`}
                  >
                    {opt.label}
                    {opt.value === value && <span className="text-xs text-red-400">✓</span>}
                  </button>
                ))}
              </div>
            ))}

            {filtered.length === 0 && !showCreateNew && (
              <p className="px-3 py-3 text-center text-xs text-gray-600">{emptyLabel}</p>
            )}

            {/* Create new */}
            {showCreateNew && (
              <button
                type="button"
                onClick={handleCreateNew}
                className="flex w-full items-center gap-2 border-t border-gray-700 px-3 py-2.5 text-left text-sm text-blue-400 hover:bg-blue-500/10 cursor-pointer transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                {createNewLabel} &ldquo;{query.trim()}&rdquo;
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
