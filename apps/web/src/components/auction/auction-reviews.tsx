'use client'

import { useEffect, useState } from 'react'

type ReviewItem = { id: string; name: string; city: string; photoUrl: string | null; text: string; rating: number }

export function AuctionReviews({ data }: { data: ReviewItem[] }) {
  const [page, setPage] = useState(0)
  const perPage = 3
  const total = Math.ceil(data.length / perPage)

  useEffect(() => {
    if (total <= 1) return
    const t = setInterval(() => setPage((p) => (p + 1) % total), 12000)
    return () => clearInterval(t)
  }, [total])

  if (data.length === 0) return null

  const visible = Array.from({ length: Math.min(perPage, data.length) }, (_, i) => data[(page * perPage + i) % data.length]!)

  return (
    <section className="testimonials-section">
      <div className="container">
        <div className="section-header centered">
          <span className="section-label" style={{ fontSize: '1rem' }}>Đấu Giá Uy Tín</span>
          <h2 style={{ fontSize: '1.5rem' }}>Khách Đã Đấu Giá Nói Gì</h2>
        </div>

        <div className="testimonials-grid" style={{ minHeight: 220 }}>
          {visible.map((t, i) => (
            <div key={page + '-' + i} className={`testimonial-card${i === 1 ? ' featured-test' : ''}`}
              style={{ animation: 'fadeInUp 0.4s ease both', animationDelay: `${i * 0.08}s` }}>
              <div className="test-stars">{'★'.repeat(t.rating ?? 5)}</div>
              <p>&ldquo;{t.text}&rdquo;</p>
              <div className="test-author">
                <img src={t.photoUrl ?? ''} alt={t.name} className="test-avatar-img"
                  onError={(e) => { e.currentTarget.style.display = 'none'; (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex' }} />
                <div className="test-avatar" style={{ display: 'none' }}>{t.name.split(' ').map((w) => w[0]).slice(-2).join('')}</div>
                <div><strong>{t.name}</strong><span>{t.city}</span></div>
              </div>
            </div>
          ))}
        </div>

        {total > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
            {Array.from({ length: total }).map((_, i) => (
              <button key={i} onClick={() => setPage(i)} aria-label={`Trang ${i + 1}`}
                style={{ width: i === page ? 24 : 8, height: 8, borderRadius: 4, border: 'none', cursor: 'pointer', transition: 'all 0.3s', padding: 0, background: i === page ? '#c0392b' : '#e0e0e0' }} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
