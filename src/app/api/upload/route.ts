import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      )
    }

    console.log(`📤 Received ${files.length} file(s) for upload`)

    // Get the backend URL from environment variables
    const backendUrl = process.env.BACKEND_URL || 'https://stories-we-tell-backend.vercel.app'

    // Forward files to backend
    const backendFormData = new FormData()
    files.forEach(file => {
      backendFormData.append('files', file)
    })

    console.log(`🔄 Forwarding to backend: ${backendUrl}/upload`)

    const response = await fetch(`${backendUrl}/upload`, {
      method: 'POST',
      body: backendFormData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Backend upload error: ${response.status} - ${errorText}`)
      throw new Error(`Backend upload failed: ${response.status}`)
    }

    const data = await response.json()
    console.log('✅ Upload successful:', data)

    return NextResponse.json(data)
  } catch (error) {
    console.error('Upload API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to upload files', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    )
  }
}

