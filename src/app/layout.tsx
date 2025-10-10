import './globals.css'
import { ReactNode } from 'react'
import { Inter } from 'next/font/google'
import { QueryProvider } from '@/components/QueryProvider'
// import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Stories We Tell',
  description: 'Cinematic intake chatbot',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <QueryProvider>
          {children}
          {/* <Toaster /> */}
        </QueryProvider>
      </body>
    </html>
  )
}
