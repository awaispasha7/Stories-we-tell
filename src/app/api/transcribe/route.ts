import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    
    // Get the backend URL from environment variables
    const backendUrl = process.env.BACKEND_URL || 'https://stories-we-tell-backend.vercel.app'
    
    console.log(`Frontend API: Forwarding transcription request to backend at ${backendUrl}/transcribe`)

    const response = await fetch(`${backendUrl}/transcribe`, {
      method: 'POST',
      body: formData, // Forward FormData directly
    })

    if (!response.ok) {
      let errorData
      try {
        errorData = await response.json()
      } catch {
        errorData = { detail: `Backend responded with status ${response.status}` }
      }
      console.error('Backend transcription error:', errorData)
      return NextResponse.json(errorData, { status: response.status })
    }

    const data = await response.json()
    console.log('Backend transcription successful:', data)
    return NextResponse.json(data)

  } catch (error) {
    console.error('Frontend API transcription error:', error)
    return NextResponse.json(
      { error: 'Failed to process transcription request', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
