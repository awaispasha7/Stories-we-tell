import ky from 'ky'

export const api = ky.create({
  prefixUrl: process.env.NEXT_PUBLIC_API_URL || 'https://stories-we-tell-backend.vercel.app',
  timeout: 30000,
  retry: 2,
})
