'use client'

import { useState } from 'react'

export function FloatingContact() {
  const [open, setOpen] = useState(false)

  return (
    <div className="fixed left-3 bottom-24 z-50 flex flex-col items-center gap-2.5 sm:left-4 sm:gap-3">
      {/* Sub buttons — visible when open */}
      <div
        className={`flex flex-col items-center gap-3 transition-all duration-300 ${
          open ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-4 opacity-0 pointer-events-none'
        }`}
      >
        {/* Hotline */}
        <a
          href="tel:0927298888"
          aria-label="Gọi hotline Japan VIP"
          className="group relative flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-green-500 shadow-lg transition-transform hover:scale-110 active:scale-95"
        >
          <svg viewBox="0 0 24 24" fill="white" className="h-6 w-6">
            <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.11-.27c1.21.49 2.53.76 3.88.76a1 1 0 011 1v3.82a1 1 0 01-1 1C10.18 22 2 13.82 2 3.82a1 1 0 011-1H6.82a1 1 0 011 1c0 1.35.27 2.67.76 3.88a1 1 0 01-.27 1.11l-2.69 1.98z" />
          </svg>
          <span className="pointer-events-none absolute left-14 whitespace-nowrap rounded-lg bg-green-500 px-3 py-1 text-sm font-medium text-white opacity-0 shadow transition-opacity group-hover:opacity-100">
            0927.298.888
          </span>
        </a>

        {/* Zalo */}
        <a
          href="https://zalo.me/0988969896"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat Zalo Japan VIP"
          className="group relative flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-110 active:scale-95"
          style={{ background: '#0068FF' }}
        >
          <svg viewBox="0 0 48 48" fill="none" className="h-7 w-7">
            <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold" fontFamily="Arial, sans-serif">
              Zalo
            </text>
          </svg>
          <span className="pointer-events-none absolute left-14 whitespace-nowrap rounded-lg px-3 py-1 text-sm font-medium text-white opacity-0 shadow transition-opacity group-hover:opacity-100" style={{ background: '#0068FF' }}>
            Chat Zalo
          </span>
        </a>

        {/* Facebook */}
        <a
          href="https://facebook.com/japanvip"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Facebook Japan VIP"
          className="group relative flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-110 active:scale-95"
          style={{ background: '#1877F2' }}
        >
          <svg viewBox="0 0 24 24" fill="white" className="h-6 w-6">
            <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.413c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.514c-1.491 0-1.956.93-1.956 1.886v2.265h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
          </svg>
          <span className="pointer-events-none absolute left-14 whitespace-nowrap rounded-lg px-3 py-1 text-sm font-medium text-white opacity-0 shadow transition-opacity group-hover:opacity-100" style={{ background: '#1877F2' }}>
            Facebook
          </span>
        </a>
      </div>

      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Liên hệ Japan VIP"
        className="relative flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-primary shadow-xl transition-transform hover:scale-110 active:scale-95"
      >
        <svg
          viewBox="0 0 24 24"
          fill="white"
          className={`h-6 w-6 sm:h-7 sm:w-7 transition-transform duration-300 ${open ? 'rotate-45' : ''}`}
        >
          {open ? (
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          ) : (
            <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.11-.27c1.21.49 2.53.76 3.88.76a1 1 0 011 1v3.82a1 1 0 01-1 1C10.18 22 2 13.82 2 3.82a1 1 0 011-1H6.82a1 1 0 011 1c0 1.35.27 2.67.76 3.88a1 1 0 01-.27 1.11l-2.69 1.98z" />
          )}
        </svg>
        {!open && <span className="absolute inset-0 animate-ping rounded-full bg-red-400 opacity-30" />}
      </button>
    </div>
  )
}
