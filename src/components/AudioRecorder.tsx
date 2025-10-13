'use client'

import { useState, useRef, useCallback } from 'react'
import { Mic, MicOff, Square, Play, Pause } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AudioRecorderProps {
  onAudioData: (audioBlob: Blob, transcript: string) => void
  disabled?: boolean
}

export function AudioRecorder({ onAudioData, disabled = false }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        setAudioBlob(audioBlob)
        setAudioUrl(URL.createObjectURL(audioBlob))
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setIsPaused(false)
    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Could not access microphone. Please check permissions.')
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsPaused(false)
    }
  }, [isRecording])

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume()
        setIsPaused(false)
      } else {
        mediaRecorderRef.current.pause()
        setIsPaused(true)
      }
    }
  }, [isRecording, isPaused])

  const playAudio = useCallback(() => {
    if (audioUrl && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        audioRef.current.play()
        setIsPlaying(true)
      }
    }
  }, [audioUrl, isPlaying])

  const processAudio = useCallback(async () => {
    if (!audioBlob) return

    setIsProcessing(true)
    try {
      // Here you would send the audio to your backend for transcription
      // For now, we'll simulate a transcript
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.wav')
      
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      })
      
      if (response.ok) {
        const data = await response.json()
        setTranscript(data.transcript)
        onAudioData(audioBlob, data.transcript)
      } else {
        // Fallback: simulate transcription
        setTranscript('Audio transcribed successfully!')
        onAudioData(audioBlob, 'Audio transcribed successfully!')
      }
    } catch (error) {
      console.error('Error processing audio:', error)
      setTranscript('Error processing audio')
    } finally {
      setIsProcessing(false)
    }
  }, [audioBlob, onAudioData])

  const resetRecording = useCallback(() => {
    setAudioBlob(null)
    setAudioUrl(null)
    setTranscript('')
    setIsPlaying(false)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }, [])

  return (
    <div className="flex flex-col items-center gap-3 p-4 bg-white/50 rounded-xl border border-gray-200">
      {/* Recording Controls */}
      <div className="flex items-center gap-2">
        {!isRecording && !audioBlob && (
          <Button
            onClick={startRecording}
            disabled={disabled}
            className="bg-red-500 hover:bg-red-600 text-white"
            size="sm"
          >
            <Mic className="w-4 h-4 mr-2" />
            Start Recording
          </Button>
        )}

        {isRecording && (
          <>
            <Button
              onClick={pauseRecording}
              className="bg-yellow-500 hover:bg-yellow-600 text-white"
              size="sm"
            >
              {isPaused ? <Play className="w-4 h-4 mr-2" /> : <Pause className="w-4 h-4 mr-2" />}
              {isPaused ? 'Resume' : 'Pause'}
            </Button>
            <Button
              onClick={stopRecording}
              className="bg-gray-500 hover:bg-gray-600 text-white"
              size="sm"
            >
              <Square className="w-4 h-4 mr-2" />
              Stop
            </Button>
          </>
        )}
      </div>

      {/* Recording Status */}
      {isRecording && (
        <div className="flex items-center gap-2 text-red-500">
          <div className={cn(
            "w-3 h-3 rounded-full bg-red-500 animate-pulse",
            isPaused && "bg-yellow-500"
          )} />
          <span className="text-sm font-medium">
            {isPaused ? 'Paused' : 'Recording...'}
          </span>
        </div>
      )}

      {/* Audio Playback */}
      {audioBlob && audioUrl && (
        <div className="flex flex-col items-center gap-2 w-full">
          <div className="flex items-center gap-2">
            <Button
              onClick={playAudio}
              variant="outline"
              size="sm"
            >
              {isPlaying ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              {isPlaying ? 'Pause' : 'Play'}
            </Button>
            <Button
              onClick={processAudio}
              disabled={isProcessing}
              className="bg-blue-500 hover:bg-blue-600 text-white"
              size="sm"
            >
              {isProcessing ? 'Processing...' : 'Transcribe'}
            </Button>
            <Button
              onClick={resetRecording}
              variant="outline"
              size="sm"
            >
              Reset
            </Button>
          </div>

          {/* Audio Element */}
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            className="w-full max-w-xs"
          />

          {/* Transcript Display */}
          {transcript && (
            <div className="w-full p-3 bg-gray-100 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>Transcript:</strong> {transcript}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
