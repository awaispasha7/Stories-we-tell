import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { text: _text } = await req.json()
  // TODO: forward to FastAPI at e.g. http://localhost:8000/rewrite_ask
  // return await fetch('http://localhost:8000/rewrite_ask', { method:'POST', body: JSON.stringify({ text }), headers:{'content-type':'application/json'} })
  // For now, mock a friendly reply
  const reply = `Got it — I can see it. Quick detail: was it interior or exterior?`
  return NextResponse.json({ reply })
}
