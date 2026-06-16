import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { getAuctionState } from '@/modules/auction/services/auction.service'
import type { AuctionEvent } from '@japanvip/types'

type Params = { params: Promise<{ id: string }> }

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest, { params }: Params) {
  const { id: auctionId } = await params

  const session = await auth()
  const viewerId = session?.user?.id ?? null

  const state = await getAuctionState(auctionId)
  if (!state) {
    return new Response('Auction not found', { status: 404 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: AuctionEvent) {
        try {
          const safe = JSON.stringify(event).replace(/\n/g, '\\n').replace(/\r/g, '\\r')
          controller.enqueue(encoder.encode(`data: ${safe}\n\n`))
        } catch {
          // controller already closed
        }
      }

      // Initial sync
      send({ type: 'countdown_sync', data: { serverTime: new Date().toISOString(), endsAt: state.endsAt } })

      let closed = false
      req.signal.addEventListener('abort', () => { closed = true })

      // Poll every 5s — works on serverless (no pub/sub needed)
      let lastBidCount = 0
      while (!closed) {
        await new Promise((r) => setTimeout(r, 5000))
        if (closed) break
        try {
          const current = await getAuctionState(auctionId)
          if (!current) break

          send({
            type: 'countdown_sync',
            data: {
              serverTime: new Date().toISOString(),
              endsAt: current.extendedEnd ?? current.endsAt,
            },
          })

          // Emit bid_placed when bid count changes
          if (current.bidCount !== lastBidCount && current.bidCount > lastBidCount) {
            lastBidCount = current.bidCount
            send({
              type: 'bid_placed',
              data: {
                newCurrentPrice: current.currentPrice,
                bidCount: current.bidCount,
                bidderId: '',
                amount: current.currentPrice,
              },
            })
          }
        } catch {
          break
        }
      }

      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
