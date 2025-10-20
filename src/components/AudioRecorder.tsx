'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Pause, Play, Check, Trash2 } from 'lucide-react'
import { useTheme, getThemeColors } from '@/lib/theme-context'

interface AudioRecorderProps {
  onAudioData: (audioBlob: Blob, transcript: string) => void
  onClose: () => void
}

export function AudioRecorder({ onAudioData, onClose }: AudioRecorderProps) {
  const [state, setState] = useState<'recording' | 'paused' | 'accepting' | 'transcribing'>('recording')
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [isTranscribing, setIsTranscribing] = useState(false)

  const { resolvedTheme } = useTheme()
  const colors = getThemeColors(resolvedTheme)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<number | null>(null)
  

  /** --- sound helpers --- */
  const playSound = (file: string) => {
    const s = new Audio(file)
    s.volume = 0.6
    s.play().catch(() => {})
  }

  /** --- timer --- */
  const startTimer = () => {
    if (timerRef.current) return
    timerRef.current = window.setInterval(() => setTime((t) => t + 1), 1000)
  }
  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const startRecording = useCallback(async () => {
    try {
      // Ask for permission once
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  
      // Delay state updates to avoid race condition that causes flicker
      setTimeout(() => {
        const recorder = new MediaRecorder(stream)
        mediaRecorderRef.current = recorder
        audioChunksRef.current = []
        setTime(0)
  
        recorder.ondataavailable = (e) => e.data.size > 0 && audioChunksRef.current.push(e.data)
        recorder.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
          setAudioBlob(blob)
          setAudioUrl(URL.createObjectURL(blob))
          stream.getTracks().forEach((t) => t.stop())
        }
  
        recorder.start()
        setState('recording')
        startTimer()
        playSound('/sounds/start.mp3')
      }, 100) // small delay fixes instant unmount issue
    } catch (err) {
      console.error('🎤 Mic access failed:', err)
      alert('Please allow microphone access and try again.')
      // Do NOT call onClose() immediately here — let user retry
    }
  }, [])

  useEffect(() => {
    startRecording()
    return () => {
      stopTimer()
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
    }
  }, [startRecording])
  
  
  const togglePause = () => {
    const rec = mediaRecorderRef.current
    if (!rec) return
    if (state === 'recording') {
      rec.pause()
      stopTimer()
      setState('paused')
    } else {
      rec.resume()
      startTimer()
      setState('recording')
    }
  }

  const stopRecording = () => {
    if (!mediaRecorderRef.current) return
    stopTimer()
    mediaRecorderRef.current.stop()
    setState('accepting')
    playSound('/sounds/stop.mp3')
  }

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const handleSend = async () => {
    if (!audioBlob) return
    playSound('/sounds/send.mp3')
    
    // Show transcription feedback
    setIsTranscribing(true)
    setState('transcribing')
    
    try {
      // Send audio to backend for transcription
      const formData = new FormData()
      formData.append('audio_file', audioBlob, 'recording.webm')
      
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      })
      
      if (response.ok) {
        const data = await response.json()
        onAudioData(audioBlob, data.transcript || 'Audio transcription failed')
      } else {
        const errorData = await response.json()
        onAudioData(audioBlob, `Transcription failed: ${errorData.detail || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Transcription error:', error)
      onAudioData(audioBlob, `Error transcribing audio: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsTranscribing(false)
      cleanup()
      onClose()
    }
  }

  const handleDelete = () => {
    cleanup()
    onClose()
  }

  const cleanup = () => {
    stopTimer()
    setTime(0)
    setIsPlaying(false)
    setAudioBlob(null)
    setAudioUrl(null)
  }

  useEffect(() => {
    startRecording()
    return () => {
      cleanup()
    }
  }, [startRecording])

  const fmt = (t: number) =>
    `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`

  console.log('🎤 AudioRecorder rendering - state:', state, 'time:', time)

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded-xl border shadow-lg backdrop-blur-sm ${colors.glassBackground} ${colors.glassBorder}`}
      style={{ 
        backgroundColor: 'white',
        border: '2px solid #e5e7eb',
        minWidth: '200px'
      }}
    >
      {/* Timer and State */}
      <div className="flex flex-col items-center min-w-[4rem]">
        <div className="text-xs font-mono text-gray-800 dark:text-gray-100">
          {fmt(time)}
        </div>
        <div className={`text-xs font-medium flex items-center gap-1 ${
          state === 'recording' && 'text-red-600 dark:text-red-400'
        } ${
          state === 'paused' && 'text-yellow-600 dark:text-yellow-400'
        } ${
          state === 'accepting' && 'text-green-600 dark:text-green-400'
        } ${
          state === 'transcribing' && 'text-blue-600 dark:text-blue-400'
        }`}>
          {state === 'recording' && (
            <>
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              Recording
            </>
          )}
          {state === 'paused' && 'Paused'}
          {state === 'accepting' && 'Recorded'}
          {state === 'transcribing' && (
            <>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              Transcribing...
            </>
          )}
        </div>
      </div>

      {/* RECORDING/PAUSED STATE */}
      {(state === 'recording' || state === 'paused') && (
        <>
          {/* Delete Button */}
          <button
            onClick={handleDelete}
            className="w-9 h-9 bg-red-500 hover:bg-red-600 rounded-full text-white flex items-center justify-center transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Pause/Play Button */}
          <button
            onClick={togglePause}
            className={`w-9 h-9 rounded-full flex items-center justify-center text-white transition-all ${
              state === 'paused'
                ? 'bg-blue-500 hover:bg-blue-600'
                : 'bg-red-500 hover:bg-red-600'
            }`}
          >
            {state === 'paused' ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>

          {/* Accept Button */}
          <button
            onClick={stopRecording}
            className="w-9 h-9 bg-green-500 hover:bg-green-600 rounded-full text-white flex items-center justify-center transition-all"
          >
            <Check className="w-4 h-4" />
          </button>
        </>
      )}

      {/* ACCEPTING STATE */}
      {state === 'accepting' && (
        <>
          {/* Delete Button */}
          <button
            onClick={handleDelete}
            className="w-9 h-9 bg-red-500 hover:bg-red-600 rounded-full text-white flex items-center justify-center transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Play/Pause Button */}
          <button
            onClick={togglePlay}
            className="w-9 h-9 bg-blue-500 hover:bg-blue-600 rounded-full text-white flex items-center justify-center transition-all"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          
          {/* Accept/Send Button */}
          <button
            onClick={handleSend}
            className="w-9 h-9 bg-green-500 hover:bg-green-600 rounded-full text-white flex items-center justify-center transition-all"
          >
            <Check className="w-4 h-4" />
          </button>
        </>
      )}

      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      )}
    </div>
  )
}
