'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { Color } from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import Highlight from '@tiptap/extension-highlight'
import Image from '@tiptap/extension-image'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import CharacterCount from '@tiptap/extension-character-count'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableHeader } from '@tiptap/extension-table-header'
import { TableCell } from '@tiptap/extension-table-cell'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import { useEffect, useRef, useState } from 'react'

type Props = {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
}

// ─── Icon helpers ───────────────────────────────────────────────────────────

const Icon = ({ d, size = 14 }: { d: string; size?: number }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2}
    strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d={d} />
  </svg>
)

// ─── Toolbar button ──────────────────────────────────────────────────────────

const TB = 'flex h-7 min-w-[28px] items-center justify-center rounded px-1 text-xs text-gray-400 hover:bg-gray-700 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed'
const TB_ON = 'bg-gray-700 text-white'
const DIV = <div className="mx-1 h-4 w-px bg-gray-700 shrink-0" />

type Editor = ReturnType<typeof useEditor>

// ─── Sub-components ──────────────────────────────────────────────────────────

function ColorPicker({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const COLORS = [
    '#ffffff','#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899',
    '#000000','#7f1d1d','#7c2d12','#713f12','#14532d','#1e3a8a','#4c1d95','#831843',
    '#6b7280','#fca5a5','#fdba74','#fde047','#86efac','#93c5fd','#c4b5fd','#f9a8d4',
  ]

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button type="button" title="Màu chữ" onClick={() => setOpen(v => !v)}
        className={`${TB} gap-0.5 font-bold`}>
        A
        <span className="h-1 w-4 rounded-full mt-0.5" style={{
          background: editor?.getAttributes('textStyle').color ?? '#ffffff',
        }} />
      </button>
      {open && (
        <div className="absolute left-0 top-8 z-50 rounded-lg border border-gray-600 bg-gray-800 p-2 shadow-xl"
          style={{ width: 160 }}>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Màu chữ</p>
          <div className="grid grid-cols-8 gap-1">
            {COLORS.map(c => (
              <button key={c} type="button" title={c}
                onClick={() => { editor?.chain().focus().setColor(c).run(); setOpen(false) }}
                className="h-4 w-4 rounded border border-gray-600 hover:scale-110 transition-transform"
                style={{ background: c }} />
            ))}
          </div>
          <button type="button"
            onClick={() => { editor?.chain().focus().unsetColor().run(); setOpen(false) }}
            className="mt-2 w-full rounded bg-gray-700 py-1 text-[10px] text-gray-300 hover:bg-gray-600">
            Bỏ màu
          </button>
        </div>
      )}
    </div>
  )
}

function HighlightPicker({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const COLORS = [
    '#fef08a','#bbf7d0','#bfdbfe','#fde68a','#fecaca','#e9d5ff','#fed7aa','#f1f5f9',
  ]

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button type="button" title="Màu nền / highlight" onClick={() => setOpen(v => !v)}
        className={`${TB} gap-0.5 font-bold text-yellow-300`}>
        <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor">
          <path d="M15.232 5.232l3.536 3.536-9.9 9.9-4.243.707.707-4.243 9.9-9.9zm1.414-1.414a2 2 0 012.828 2.828l-10.607 10.607-5.657.943.943-5.657 10.607-10.607-.114.114.001-.001z"/>
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-8 z-50 rounded-lg border border-gray-600 bg-gray-800 p-2 shadow-xl"
          style={{ width: 120 }}>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Highlight</p>
          <div className="grid grid-cols-4 gap-1">
            {COLORS.map(c => (
              <button key={c} type="button" title={c}
                onClick={() => { editor?.chain().focus().toggleHighlight({ color: c }).run(); setOpen(false) }}
                className="h-5 w-5 rounded border border-gray-600 hover:scale-110 transition-transform"
                style={{ background: c }} />
            ))}
          </div>
          <button type="button"
            onClick={() => { editor?.chain().focus().unsetHighlight().run(); setOpen(false) }}
            className="mt-2 w-full rounded bg-gray-700 py-1 text-[10px] text-gray-300 hover:bg-gray-600">
            Bỏ highlight
          </button>
        </div>
      )}
    </div>
  )
}

function LinkButton({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function apply() {
    if (!url.trim()) return
    const href = url.startsWith('http') ? url.trim() : `https://${url.trim()}`
    editor?.chain().focus().extendMarkRange('link').setLink({ href, target: '_blank' }).run()
    setUrl(''); setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button type="button" title="Chèn liên kết"
        onClick={() => {
          if (editor?.isActive('link')) {
            editor.chain().focus().unsetLink().run()
          } else {
            setOpen(v => !v)
          }
        }}
        className={`${TB} ${editor?.isActive('link') ? TB_ON : ''}`}>
        <Icon d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
      </button>
      {open && (
        <div className="absolute left-0 top-8 z-50 w-64 rounded-lg border border-gray-600 bg-gray-800 p-3 shadow-xl">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Nhập URL</p>
          <input autoFocus value={url} onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && apply()}
            placeholder="https://..."
            className="w-full rounded border border-gray-600 bg-gray-900 px-2 py-1.5 text-xs text-gray-100 placeholder-gray-600 focus:border-red-500 focus:outline-none" />
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={apply}
              className="flex-1 rounded bg-red-600 py-1 text-xs font-semibold text-white hover:bg-red-500">
              Áp dụng
            </button>
            <button type="button" onClick={() => setOpen(false)}
              className="rounded border border-gray-600 px-3 py-1 text-xs text-gray-400 hover:text-gray-200">
              Hủy
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ImageButton({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [alt, setAlt] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function apply() {
    if (!url.trim()) return
    editor?.chain().focus().setImage({ src: url.trim(), alt: alt.trim() }).run()
    setUrl(''); setAlt(''); setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button type="button" title="Chèn hình ảnh" onClick={() => setOpen(v => !v)} className={TB}>
        <Icon d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </button>
      {open && (
        <div className="absolute left-0 top-8 z-50 w-64 rounded-lg border border-gray-600 bg-gray-800 p-3 shadow-xl">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Chèn ảnh</p>
          <input autoFocus value={url} onChange={e => setUrl(e.target.value)}
            placeholder="https://... (URL ảnh)"
            className="w-full rounded border border-gray-600 bg-gray-900 px-2 py-1.5 text-xs text-gray-100 placeholder-gray-600 focus:border-red-500 focus:outline-none mb-1.5" />
          <input value={alt} onChange={e => setAlt(e.target.value)}
            placeholder="Mô tả ảnh (alt text)"
            className="w-full rounded border border-gray-600 bg-gray-900 px-2 py-1.5 text-xs text-gray-100 placeholder-gray-600 focus:border-red-500 focus:outline-none" />
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={apply}
              className="flex-1 rounded bg-red-600 py-1 text-xs font-semibold text-white hover:bg-red-500">
              Chèn ảnh
            </button>
            <button type="button" onClick={() => setOpen(false)}
              className="rounded border border-gray-600 px-3 py-1 text-xs text-gray-400 hover:text-gray-200">
              Hủy
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function TableMenu({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const inTable = editor?.isActive('table')

  const actions = inTable ? [
    { label: 'Thêm cột trái', fn: () => editor?.chain().focus().addColumnBefore().run() },
    { label: 'Thêm cột phải', fn: () => editor?.chain().focus().addColumnAfter().run() },
    { label: 'Xóa cột', fn: () => editor?.chain().focus().deleteColumn().run() },
    null,
    { label: 'Thêm hàng trên', fn: () => editor?.chain().focus().addRowBefore().run() },
    { label: 'Thêm hàng dưới', fn: () => editor?.chain().focus().addRowAfter().run() },
    { label: 'Xóa hàng', fn: () => editor?.chain().focus().deleteRow().run() },
    null,
    { label: 'Gộp ô', fn: () => editor?.chain().focus().mergeCells().run() },
    { label: 'Tách ô', fn: () => editor?.chain().focus().splitCell().run() },
    null,
    { label: '🗑 Xóa bảng', fn: () => editor?.chain().focus().deleteTable().run(), danger: true },
  ] : [
    { label: '3×3', fn: () => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
    { label: '4×4', fn: () => editor?.chain().focus().insertTable({ rows: 4, cols: 4, withHeaderRow: true }).run() },
    { label: '5×3', fn: () => editor?.chain().focus().insertTable({ rows: 5, cols: 3, withHeaderRow: true }).run() },
  ]

  return (
    <div ref={ref} className="relative">
      <button type="button" title="Bảng" onClick={() => setOpen(v => !v)}
        className={`${TB} gap-1 px-2 w-auto ${inTable ? TB_ON : ''}`}>
        <Icon d="M3 10h18M3 6h18M3 14h18M3 18h18M9 6v12M15 6v12" />
        <span className="text-[10px]">Bảng</span>
      </button>
      {open && (
        <div className="absolute left-0 top-8 z-50 w-44 rounded-lg border border-gray-600 bg-gray-800 py-1 shadow-xl">
          <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            {inTable ? 'Chỉnh sửa bảng' : 'Chèn bảng'}
          </p>
          {actions.map((a, i) =>
            a === null
              ? <div key={i} className="my-1 border-t border-gray-700" />
              : (
                <button key={i} type="button"
                  onClick={() => { a.fn(); setOpen(false) }}
                  className={`w-full px-3 py-1.5 text-left text-xs hover:bg-gray-700 transition-colors ${(a as any).danger ? 'text-red-400' : 'text-gray-300'}`}>
                  {a.label}
                </button>
              )
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Toolbar ─────────────────────────────────────────────────────────────

function Toolbar({ editor }: { editor: Editor }) {
  if (!editor) return null

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-700 bg-gray-800/80 px-2 py-1.5 sticky top-0 z-10">

      {/* Heading */}
      {([1,2,3,4] as const).map(level => (
        <button key={level} type="button" title={`Tiêu đề H${level}`}
          onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
          className={`${TB} px-1.5 w-auto font-bold text-[10px] ${editor.isActive('heading', { level }) ? TB_ON : ''}`}>
          H{level}
        </button>
      ))}
      <button type="button" title="Đoạn văn thường"
        onClick={() => editor.chain().focus().setParagraph().run()}
        className={`${TB} px-1.5 w-auto text-[10px] ${editor.isActive('paragraph') && !editor.isActive('heading') ? TB_ON : ''}`}>
        ¶
      </button>

      {DIV}

      {/* Inline formatting */}
      <button type="button" title="In đậm (Ctrl+B)"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`${TB} font-bold ${editor.isActive('bold') ? TB_ON : ''}`}>B</button>
      <button type="button" title="In nghiêng (Ctrl+I)"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`${TB} italic ${editor.isActive('italic') ? TB_ON : ''}`}>I</button>
      <button type="button" title="Gạch dưới (Ctrl+U)"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`${TB} underline ${editor.isActive('underline') ? TB_ON : ''}`}>U</button>
      <button type="button" title="Gạch ngang"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={`${TB} line-through ${editor.isActive('strike') ? TB_ON : ''}`}>S</button>
      <button type="button" title="Chỉ số trên"
        onClick={() => editor.chain().focus().toggleSuperscript().run()}
        className={`${TB} text-[10px] font-bold ${editor.isActive('superscript') ? TB_ON : ''}`}>X²</button>
      <button type="button" title="Chỉ số dưới"
        onClick={() => editor.chain().focus().toggleSubscript().run()}
        className={`${TB} text-[10px] font-bold ${editor.isActive('subscript') ? TB_ON : ''}`}>X₂</button>

      {DIV}

      {/* Color & Highlight */}
      <ColorPicker editor={editor} />
      <HighlightPicker editor={editor} />

      {DIV}

      {/* Alignment */}
      {([
        { align: 'left',    d: 'M3 6h18M3 12h12M3 18h15' },
        { align: 'center',  d: 'M3 6h18M6 12h12M4.5 18h15' },
        { align: 'right',   d: 'M3 6h18M9 12h12M6 18h15' },
        { align: 'justify', d: 'M3 6h18M3 12h18M3 18h18' },
      ] as const).map(({ align, d }) => (
        <button key={align} type="button" title={`Căn ${align}`}
          onClick={() => editor.chain().focus().setTextAlign(align).run()}
          className={`${TB} ${editor.isActive({ textAlign: align }) ? TB_ON : ''}`}>
          <Icon d={d} />
        </button>
      ))}

      {DIV}

      {/* Lists */}
      <button type="button" title="Danh sách bullet"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`${TB} ${editor.isActive('bulletList') ? TB_ON : ''}`}>
        <Icon d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
      </button>
      <button type="button" title="Danh sách số"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`${TB} ${editor.isActive('orderedList') ? TB_ON : ''}`}>
        <Icon d="M4 6h1v4M4 6H3m1 4H3m1 0h1M8 6h13M8 12h13M8 18h13" />
      </button>
      <button type="button" title="Danh sách checkbox"
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        className={`${TB} ${editor.isActive('taskList') ? TB_ON : ''}`}>
        <Icon d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </button>

      {DIV}

      {/* Indent */}
      <button type="button" title="Giảm thụt lề"
        onClick={() => editor.chain().focus().liftListItem('listItem').run()}
        className={TB}>
        <Icon d="M3 8l4-4m0 0l4 4m-4-4v12M11 12h10M11 17h7M11 7h7" />
      </button>
      <button type="button" title="Tăng thụt lề"
        onClick={() => editor.chain().focus().sinkListItem('listItem').run()}
        className={TB}>
        <Icon d="M21 8l-4-4m0 0l-4 4m4-4v12M3 12h10M3 17h7M3 7h7" />
      </button>

      {DIV}

      {/* Block elements */}
      <button type="button" title="Trích dẫn"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`${TB} ${editor.isActive('blockquote') ? TB_ON : ''}`}>
        <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor">
          <path d="M9.135 20c-.54 0-.945-.155-1.215-.465-.27-.31-.405-.7-.405-1.17 0-.33.075-.66.225-.99l3.51-7.425H6v-3.9h7.515v3.615L11.1 16.49c-.33.72-.54 1.215-.63 1.485-.09.27-.18.51-.27.72-.12.33-.285.585-.495.765-.21.18-.465.27-.765.27H9.135zm9.75 0c-.54 0-.945-.155-1.215-.465-.27-.31-.405-.7-.405-1.17 0-.33.075-.66.225-.99l3.51-7.425H15.75v-3.9h7.515v3.615L20.85 16.49c-.33.72-.54 1.215-.63 1.485-.09.27-.18.51-.27.72-.12.33-.285.585-.495.765-.21.18-.465.27-.765.27H18.885z"/>
        </svg>
      </button>
      <button type="button" title="Code block"
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={`${TB} ${editor.isActive('codeBlock') ? TB_ON : ''}`}>
        <Icon d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </button>
      <button type="button" title="Inline code"
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={`${TB} font-mono text-[11px] ${editor.isActive('code') ? TB_ON : ''}`}>
        {'</>'}
      </button>
      <button type="button" title="Đường kẻ ngang"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        className={TB}>
        <Icon d="M3 12h18" />
      </button>

      {DIV}

      {/* Link, Image, Table */}
      <LinkButton editor={editor} />
      <ImageButton editor={editor} />
      <TableMenu editor={editor} />

      {DIV}

      {/* Undo / Redo */}
      <button type="button" title="Hoàn tác (Ctrl+Z)"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()} className={TB}>
        <Icon d="M3 10h11a4 4 0 010 8H8M3 10l4-4M3 10l4 4" />
      </button>
      <button type="button" title="Làm lại (Ctrl+Y)"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()} className={TB}>
        <Icon d="M21 10H10a4 4 0 000 8h7M21 10l-4-4M21 10l-4 4" />
      </button>

      {DIV}

      {/* Clear */}
      <button type="button" title="Xóa toàn bộ định dạng"
        onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
        className={TB}>
        <Icon d="M6 18L18 6M6 6l12 12" />
      </button>
    </div>
  )
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function RichTextEditor({ value, onChange, placeholder, minHeight = 320 }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4] } }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Image.configure({ inline: false, allowBase64: false }),
      Subscript,
      Superscript,
      TaskList,
      TaskItem.configure({ nested: true }),
      CharacterCount,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Link.configure({ openOnClick: false, HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' } }),
      Placeholder.configure({ placeholder: placeholder ?? 'Nhập mô tả sản phẩm...' }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: [
          'prose prose-sm prose-invert max-w-none px-5 py-4 focus:outline-none',
          '[&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-base [&_h3]:font-semibold [&_h4]:text-sm [&_h4]:font-semibold',
          '[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5',
          '[&_blockquote]:border-l-4 [&_blockquote]:border-gray-600 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-400',
          '[&_code]:rounded [&_code]:bg-gray-700 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_code]:font-mono',
          '[&_pre]:rounded-lg [&_pre]:bg-gray-700 [&_pre]:p-3 [&_pre]:text-xs [&_pre]:font-mono',
          '[&_hr]:border-gray-700 [&_hr]:my-4',
          '[&_a]:text-blue-400 [&_a]:underline',
          '[&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-2',
          '[&_table]:w-full [&_table]:border-collapse [&_table]:text-sm',
          '[&_td]:border [&_td]:border-gray-700 [&_td]:px-3 [&_td]:py-2',
          '[&_th]:border [&_th]:border-gray-600 [&_th]:bg-gray-700/80 [&_th]:px-3 [&_th]:py-2 [&_th]:font-semibold',
          '[&_li[data-type=taskItem]]:flex [&_li[data-type=taskItem]]:items-start [&_li[data-type=taskItem]]:gap-2',
          '[&_.is-editor-empty:first-child::before]:text-gray-600 [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.is-editor-empty:first-child::before]:pointer-events-none [&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:h-0',
        ].join(' '),
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getHTML())
    },
  })

  // Sync when value changed externally (e.g. after scrape import)
  useEffect(() => {
    if (!editor || editor.isFocused) return
    const current = editor.getHTML()
    if (value !== current) {
      editor.commands.setContent(value || '')
    }
  }, [value, editor])

  const charCount = editor?.storage.characterCount.characters() ?? 0
  const wordCount = editor?.storage.characterCount.words() ?? 0

  return (
    <div className="overflow-hidden rounded-lg border border-gray-700 bg-gray-900">
      <Toolbar editor={editor} />
      <EditorContent
        editor={editor}
        style={{ minHeight }}
        className="cursor-text [&_.ProseMirror]:min-h-[inherit]"
      />
      {/* Status bar */}
      <div className="flex items-center justify-between border-t border-gray-700/60 bg-gray-800/40 px-3 py-1">
        <div className="flex items-center gap-3 text-[10px] text-gray-600">
          <span>{wordCount} từ</span>
          <span>{charCount} ký tự</span>
        </div>
        <div className="text-[10px] text-gray-700">
          Ctrl+B in đậm · Ctrl+I nghiêng · Ctrl+Z hoàn tác
        </div>
      </div>
    </div>
  )
}
