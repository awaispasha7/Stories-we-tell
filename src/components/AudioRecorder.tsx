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
  const [transcriptionProgress, setTranscriptionProgress] = useState('')
  
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
    setTranscriptionProgress('Preparing audio for transcription...')
    
    try {
      console.log('🎤 Processing audio for transcription...')
      
      // Simulate progress steps
      const progressSteps = [
        'Uploading audio file...',
        'Processing with OpenAI Whisper...',
        'Converting speech to text...',
        'Finalizing transcription...'
      ]
      
      // Show progress steps
      for (let i = 0; i < progressSteps.length; i++) {
        setTranscriptionProgress(progressSteps[i])
        await new Promise(resolve => setTimeout(resolve, 800)) // Simulate processing time
      }
      
      // Send audio to backend for transcription
      const formData = new FormData()
      formData.append('audio_file', audioBlob, 'recording.wav')
      
      setTranscriptionProgress('Sending to transcription service...')
      
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Transcription successful:', data)
        setTranscriptionProgress('Transcription complete!')
        setTranscript(data.transcript)
        onAudioData(audioBlob, data.transcript)
        
        // Clear progress after a moment
        setTimeout(() => {
          setTranscriptionProgress('')
        }, 2000)
      } else {
        const errorData = await response.json()
        console.error('❌ Transcription failed:', errorData)
        setTranscriptionProgress('')
        setTranscript('') // Clear any previous transcript
        setTranscript(`Transcription failed: ${errorData.detail || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('❌ Error processing audio:', error)
      setTranscriptionProgress('')
      setTranscript('') // Clear any previous transcript
      setTranscript(`Error processing audio: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsProcessing(false)
    }
  }, [audioBlob, onAudioData])

  const resetRecording = useCallback(() => {
    setAudioBlob(null)
    setAudioUrl(null)
    setTranscript('')
    setTranscriptionProgress('')
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

      {/* Transcription Progress */}
      {transcriptionProgress && (
        <div className="flex flex-col items-center gap-2 w-full">
          <div className="flex items-center gap-2 text-blue-600">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium">{transcriptionProgress}</span>
          </div>
          {isProcessing && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
          )}
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
          {transcript && !isProcessing && (() => {
            const isError = transcript.startsWith('Transcription failed') || transcript.startsWith('Error processing')
            return (
              <div className={`w-full p-4 rounded-lg border ${
                isError
                  ? 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200' 
                  : 'bg-gradient-to-r from-green-50 to-blue-50 border-green-200'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full animate-pulse ${
                    isError ? 'bg-red-500' : 'bg-green-500'
                  }`} />
                  <span className={`text-sm font-semibold ${
                    isError ? 'text-red-700' : 'text-green-700'
                  }`}>
                    {isError ? 'Transcription Failed' : 'Transcription Complete'}
                  </span>
                </div>
                <p className="text-sm text-gray-800 leading-relaxed">
                  {transcript}
                </p>
                {!isError && (
                  <div className="mt-2 text-xs text-gray-500">
                    This text will be sent to the chat automatically
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}

