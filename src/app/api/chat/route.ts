import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()
    
    // Get the backend URL from environment variables
    const backendUrl = process.env.BACKEND_URL || 'https://stories-we-tell-backend.vercel.app'
    
    console.log(`Frontend: Attempting to call backend at ${backendUrl}/chat`)
    
    // Try to call the backend with a timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 second timeout
    
    try {
      const response = await fetch(`${backendUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
      console.log(`Frontend: Backend response status: ${response.status}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Backend error: ${response.status} - ${errorText}`)
        throw new Error(`Backend responded with status: ${response.status}`)
      }
      
      // Check if backend returned JSON or streaming response
      const contentType = response.headers.get('content-type')
      
      if (contentType && contentType.includes('application/json')) {
        // Backend returned JSON response, convert to streaming format
        const data = await response.json()
        const reply = data.reply || data.response || 'No response received'
        
        // Convert to streaming format
        const words = reply.split()
        let streamContent = ''
        
        for (let i = 0; i < words.length; i++) {
          const word = words[i]
          const chunk = {
            type: 'content',
            content: word + (i < words.length - 1 ? ' ' : ''),
            done: i === words.length - 1
          }
          streamContent += `data: ${JSON.stringify(chunk)}\n\n`
        }
        
        return new Response(streamContent, {
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        })
      } else {
        // Backend returned streaming response, pass it through
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        })
      }
    } catch (fetchError) {
      clearTimeout(timeoutId)
      console.error('Backend fetch failed:', fetchError)
      
      // Return a fallback response
      const fallbackResponse = `I received your message: "${text}". I'm currently having trouble connecting to my AI backend, but I'm here to help with your story development! What kind of story are you working on?`
      
      return new Response(
        `data: ${JSON.stringify({ type: 'content', content: fallbackResponse, done: true })}\n\n`,
        {
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        }
      )
    }
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Failed to process request', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
