'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CheckCircle, XCircle, Loader2, ArrowLeft, Mail } from 'lucide-react'

export default function AuthCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // First, let Supabase handle the URL parameters (email confirmation)
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth callback error:', error)
          setStatus('error')
          setMessage(error.message)
          return
        }

        // If we have a session, the email was confirmed successfully
        if (data.session) {
          setStatus('success')
          setMessage('Welcome to Stories We Tell!')
          
          // Redirect to chat after a short delay
          setTimeout(() => {
            router.push('/chat')
          }, 2000)
        } else {
          // No session found - this could mean:
          // 1. Email confirmation failed
          // 2. User already confirmed and session expired
          // 3. Invalid confirmation link
          
          // Let's try to get the current URL to see if there are confirmation parameters
          const urlParams = new URLSearchParams(window.location.search)
          const tokenHash = urlParams.get('token_hash')
          const type = urlParams.get('type')
          
          if (tokenHash && type) {
            // We have confirmation parameters, try to verify them
            const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type: type as 'email'
            })
            
            if (verifyError) {
              console.error('Email verification error:', verifyError)
              setStatus('error')
              setMessage('The confirmation link has expired or is invalid.')
            } else if (verifyData.session) {
              setStatus('success')
              setMessage('Welcome to Stories We Tell!')
              
              setTimeout(() => {
                router.push('/chat')
              }, 2000)
            } else {
              setStatus('error')
              setMessage('Email verification completed but no session was created.')
            }
          } else {
            setStatus('error')
            setMessage('No confirmation link found. Please try signing up again.')
          }
        }
      } catch (err) {
        console.error('Unexpected error:', err)
        setStatus('error')
        setMessage('An unexpected error occurred. Please try again.')
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-md flex gap-6 p-4 rounded-3xl">
        {/* Main Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl p-8 text-center">
          {/* Logo */}
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 via-sky-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-blue-500/30">
            <span className="text-3xl text-white font-bold">SW</span>
          </div>

          {/* Status Content */}
          {status === 'loading' && (
            <div className="space-y-6">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
                <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-emerald-500 rounded-full animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white mb-3">Confirming your email</h1>
                <p className="text-blue-100/80 text-lg">Please wait while we verify your email address...</p>
              </div>
              <div className="flex items-center justify-center gap-2 text-blue-200/60">
                <Mail className="w-4 h-4" />
                <span className="text-sm">Checking your inbox</span>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-6">
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-green-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
                  <CheckCircle className="w-10 h-10 text-white" />
                </div>
                <div className="absolute inset-0 w-20 h-20 bg-emerald-500/20 rounded-full animate-ping"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white mb-3">Email Confirmed!</h1>
                <p className="text-emerald-100/80 text-lg">{message}</p>
              </div>
              <div className="space-y-3">
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                  <div className="bg-gradient-to-r from-emerald-500 to-green-500 h-2 rounded-full animate-pulse" style={{ width: '100%' }}></div>
                </div>
                <p className="text-emerald-200/60 text-sm">Redirecting to your dashboard...</p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-6">
              <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-rose-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-red-500/30">
                <XCircle className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white mb-3">Confirmation Failed</h1>
                <p className="text-red-100/80 text-lg mb-2">{message}</p>
                <p className="text-red-200/60 text-sm">Don't worry, we can help you get back on track.</p>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => router.push('/auth/signup')}
                  className="w-full bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105 active:scale-95"
                >
                  Try Signing Up Again
                </button>
                <button
                  onClick={() => router.push('/auth/login')}
                  className="w-full bg-white/10 hover:bg-white/20 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 border border-white/20 hover:border-white/30"
                >
                  Go to Login
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="w-full flex items-center justify-center gap-2 text-blue-200/80 hover:text-blue-200 text-sm font-medium py-2 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Home
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-white/40 text-sm">
            Having trouble? Contact our support team
          </p>
        </div>
      </div>
    </div>
  )
}
