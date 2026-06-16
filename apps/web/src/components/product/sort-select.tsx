'use client'

import { useRouter, useSearchParams } from 'next/navigation'

type Option = { value: string; label: string }

export function SortSelect({ value, options }: { value: string; options: Option[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function handleChange(sort: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (sort === 'newest') params.delete('sort')
    else params.set('sort', sort)
    params.delete('page')
    const qs = params.toString()
    router.push(`/san-pham${qs ? `?${qs}` : ''}`)
  }

  return (
    <select
      defaultValue={value}
      onChange={(e) => handleChange(e.target.value)}
      className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-brand-red focus:outline-none"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}
