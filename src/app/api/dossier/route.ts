import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Get the backend URL from environment variables
    const backendUrl = process.env.BACKEND_URL || 'https://stories-we-tell-backend.vercel.app'
    
    console.log(`Frontend: Fetching dossier from backend at ${backendUrl}/api/v1/dossiers`)
    
    // Fetch from backend with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
    
    try {
      const response = await fetch(`${backendUrl}/api/v1/dossiers`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        console.error(`Backend dossier error: ${response.status}`)
        throw new Error(`Backend responded with status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('Frontend: Dossier fetched successfully:', data)
      return NextResponse.json(data)
      
    } catch (fetchError) {
      clearTimeout(timeoutId)
      console.error('Backend dossier fetch failed:', fetchError)
      
      // Return default data on error
      return NextResponse.json({
        title: 'Untitled Story',
        logline: 'A compelling story waiting to be told...',
        genre: 'Unknown',
        tone: 'Unknown',
        scenes: [],
        characters: [],
        locations: []
      })
    }
  } catch (error) {
    console.error('Dossier API error:', error)
    return NextResponse.json(
      { 
        title: 'Error',
        logline: 'Failed to load dossier',
        genre: '',
        tone: '',
        scenes: [],
        characters: [],
        locations: []
      },
      { status: 500 }
    )
  }
}

