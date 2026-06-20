import type { Metadata } from 'next'
import { CalendarClient } from './calendar-client'

export const metadata: Metadata = { title: 'Content Calendar' }

export default function ContentCalendarPage() {
  return <CalendarClient />
}
