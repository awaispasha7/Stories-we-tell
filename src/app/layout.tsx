import './globals.css'
import './auth/auth-styles.css'
import { ReactNode } from 'react'
import { Inter } from 'next/font/google'
import { QueryProvider } from '@/components/QueryProvider'
import { AuthProvider } from '@/lib/auth-context'
import { ProfileProvider } from '@/lib/profile-context'
// import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Stories We Tell',
  description: 'Cinematic intake chatbot',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body className={`${inter.className} bg-slate-950 text-slate-100 antialiased`}>
        <QueryProvider>
          <AuthProvider>
            <ProfileProvider>
              {children}
              {/* <Toaster /> */}
            </ProfileProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
