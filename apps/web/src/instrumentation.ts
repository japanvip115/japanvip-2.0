export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { prisma } = await import('@japanvip/db')
      const { decryptIfNeeded } = await import('./lib/encrypt')

      const rows = await prisma.siteSetting.findMany({
        where: { key: { in: ['google_client_id', 'google_client_secret'] } },
      })

      for (const row of rows) {
        if (row.key === 'google_client_id' && row.value) {
          if (!process.env.AUTH_GOOGLE_ID) {
            process.env.AUTH_GOOGLE_ID = row.value
            process.env.GOOGLE_CLIENT_ID = row.value
          }
        }
        if (row.key === 'google_client_secret' && row.value) {
          if (!process.env.AUTH_GOOGLE_SECRET) {
            const plain = decryptIfNeeded(row.value) ?? row.value
            process.env.AUTH_GOOGLE_SECRET = plain
            process.env.GOOGLE_CLIENT_SECRET = plain
          }
        }
      }
    } catch {
      // DB không available — dùng env vars có sẵn
    }
  }
}
