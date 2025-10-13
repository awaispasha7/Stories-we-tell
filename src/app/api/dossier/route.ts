import { NextResponse } from 'next/server'

export async function GET() {
  // TODO: fetch from Supabase; mock for now
  return NextResponse.json({ title: '—', logline: '—', genre: '', tone: '', scenes: [] })
}

