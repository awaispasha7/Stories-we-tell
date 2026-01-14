import ky from 'ky'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface ValidationRequest {
  validation_id: string
  project_id: string
  user_id: string
  session_id: string
  conversation_transcript: string
  generated_script: string
  client_email: string | null
  client_name: string | null
  status: 'pending' | 'approved' | 'rejected' | 'sent_to_client'
  created_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  review_notes: string | null
  updated_at: string
  workflow_step?: string
  synopsis?: string
  synopsis_approved?: boolean
  synopsis_review_notes?: string
  synopsis_reviewed_at?: string
  synopsis_reviewed_by?: string
  synopsis_checklist?: Record<string, boolean>
  full_script?: string
  shot_list?: any
  genre_scripts?: Array<{genre: string; script: string; confidence: number; word_count: number}>
  selected_genre_script?: string
}

interface AdminStats {
  total_requests: number
  pending_count: number
  approved_count: number
  rejected_count: number
  sent_count: number
  failed_count?: number  // Optional for backwards compatibility
  avg_review_time: string
  today_requests: number
}

class AdminApi {
  private getAuthHeaders() {
    // Get user ID from localStorage/auth context
    let userId: string | null = null
    
    if (typeof window !== 'undefined') {
      try {
        const storedUser = localStorage.getItem('supabase.auth.token')
        if (storedUser) {
          const authData = JSON.parse(storedUser)
          userId = authData?.user?.id
        }
      } catch (error) {
        console.warn('Could not parse auth data:', error)
      }
    }
    
    return userId ? { 'X-User-ID': userId } : {}
  }

  async getValidationRequests(status?: string): Promise<ValidationRequest[]> {
    try {
      const searchParams = new URLSearchParams()
      if (status) {
        searchParams.set('status', status)
      }

      const url = `${API_BASE_URL}/api/v1/validation/queue${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
      
      const response = await ky.get(url, {
        headers: this.getAuthHeaders(),
        timeout: 30000
      }).json<ValidationRequest[]>()

      return response
    } catch (error) {
      console.error('Failed to fetch validation requests:', error)
      throw new Error('Failed to fetch validation requests')
    }
  }

  async getValidationRequest(id: string): Promise<ValidationRequest> {
    try {
      const response = await ky.get(`${API_BASE_URL}/api/v1/validation/queue/${id}`, {
        headers: this.getAuthHeaders(),
        timeout: 15000
      }).json<ValidationRequest>()

      return response
    } catch (error) {
      console.error('Failed to fetch validation request:', error)
      throw new Error('Failed to fetch validation request')
    }
  }

  async approveRequest(id: string, notes?: string): Promise<{ success: boolean }> {
    try {
      const response = await ky.post(`${API_BASE_URL}/api/v1/validation/queue/${id}/approve`, {
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        json: { notes: notes || '' },
        timeout: 30000
      }).json<{ success: boolean }>()

      return response
    } catch (error) {
      console.error('Failed to approve request:', error)
      throw new Error('Failed to approve request')
    }
  }

  async rejectRequest(id: string, notes: string): Promise<{ success: boolean }> {
    try {
      const response = await ky.post(`${API_BASE_URL}/api/v1/validation/queue/${id}/reject`, {
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        json: { notes },
        timeout: 15000
      }).json<{ success: boolean }>()

      return response
    } catch (error) {
      console.error('Failed to reject request:', error)
      throw new Error('Failed to reject request')
    }
  }

  async updateScript(id: string, script: string): Promise<{ success: boolean }> {
    try {
      const response = await ky.put(`${API_BASE_URL}/api/v1/validation/queue/${id}/script`, {
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        json: { generated_script: script },
        timeout: 15000
      }).json<{ success: boolean }>()

      return response
    } catch (error) {
      console.error('Failed to update script:', error)
      throw new Error('Failed to update script')
    }
  }

  async getStats(): Promise<AdminStats> {
    try {
      const response = await ky.get(`${API_BASE_URL}/api/v1/validation/stats`, {
        headers: this.getAuthHeaders(),
        timeout: 15000
      }).json<AdminStats>()

      return response
    } catch (error) {
      console.error('Failed to fetch admin stats:', error)
      throw new Error('Failed to fetch admin stats')
    }
  }

  async sendReview(
    id: string, 
    checklist: Record<string, boolean>, 
    issues: { missing_info: string[], conflicts: string[], factual_gaps: string[] },
    notes?: string
  ): Promise<{ success: boolean; needs_revision: boolean; unchecked_items: string[]; email_sent?: boolean; email_error?: string }> {
    try {
      const response = await ky.post(`${API_BASE_URL}/api/v1/validation/queue/${id}/send-review`, {
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        json: {
          checklist,
          issues,
          notes: notes || ''
        },
        timeout: 30000
      }).json<{ success: boolean; needs_revision: boolean; unchecked_items: string[]; email_sent?: boolean; email_error?: string }>()

      return response
    } catch (error) {
      console.error('Failed to send review:', error)
      throw new Error('Failed to send review')
    }
  }

  async generateSynopsis(id: string): Promise<{ success: boolean; synopsis: string; word_count: number }> {
    try {
      const response = await ky.post(`${API_BASE_URL}/api/v1/validation/queue/${id}/generate-synopsis`, {
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        timeout: 300000 // 5 minutes (300 seconds) for synopsis generation
      }).json<{ success: boolean; synopsis: string; word_count: number }>()

      return response
    } catch (error) {
      console.error('Failed to generate synopsis:', error)
      // Check if it's a timeout - if so, poll to see if backend completed
      if (error instanceof Error && (error.message.includes('timeout') || error.message.includes('aborted'))) {
        console.log('⏱️ Request timed out, checking if backend completed...')
        // Poll the validation request to see if synopsis was generated
        try {
          const validation = await this.getValidationRequest(id)
          if (validation.synopsis) {
            // Backend completed successfully despite timeout
            return {
              success: true,
              synopsis: validation.synopsis,
              word_count: validation.synopsis.split(/\s+/).length
            }
          }
        } catch (pollError) {
          console.error('Failed to poll for completion:', pollError)
        }
      }
      throw new Error('Failed to generate synopsis')
    }
  }

  async approveSynopsis(id: string, notes?: string, checklist?: Record<string, boolean>): Promise<{ success: boolean; email_sent?: boolean; email_error?: string }> {
    try {
      const response = await ky.post(`${API_BASE_URL}/api/v1/validation/queue/${id}/approve-synopsis`, {
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        json: { notes: notes || '', checklist: checklist || {} },
        timeout: 30000
      }).json<{ success: boolean; email_sent?: boolean; email_error?: string }>()

      return response
    } catch (error) {
      console.error('Failed to approve synopsis:', error)
      throw new Error('Failed to approve synopsis')
    }
  }

  async rejectSynopsis(id: string, notes: string, specialInstructions?: string): Promise<{ success: boolean; synopsis?: string }> {
    try {
      const response = await ky.post(`${API_BASE_URL}/api/v1/validation/queue/${id}/reject-synopsis`, {
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        json: { notes, special_instructions: specialInstructions },
        timeout: 60000 // Increased timeout for LLM regeneration
      }).json<{ success: boolean; synopsis?: string }>()

      return response
    } catch (error) {
      console.error('Failed to reject synopsis:', error)
      throw new Error('Failed to reject synopsis')
    }
  }

  async generateScript(id: string): Promise<{ 
    success: boolean; 
    script: string; 
    word_count: number;
    genre_scripts?: Array<{genre: string; script: string; confidence: number; word_count: number}>;
    message?: string;
  }> {
    try {
      const response = await ky.post(`${API_BASE_URL}/api/v1/validation/queue/${id}/generate-script`, {
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        timeout: 900000 // 15 minutes (900 seconds) for multiple genre script generation
      }).json<{ 
        success: boolean; 
        script: string; 
        word_count: number;
        genre_scripts?: Array<{genre: string; script: string; confidence: number; word_count: number}>;
        message?: string;
      }>()

      return response
    } catch (error) {
      console.error('Failed to generate script:', error)
      // Check if it's a timeout - if so, poll to see if backend completed
      if (error instanceof Error && (error.message.includes('timeout') || error.message.includes('aborted'))) {
        console.log('⏱️ Request timed out, checking if backend completed...')
        // Poll the validation request to see if scripts were generated
        try {
          const validation = await this.getValidationRequest(id)
          if (validation.genre_scripts && validation.genre_scripts.length > 0) {
            // Backend completed successfully despite timeout
            return {
              success: true,
              script: validation.full_script || validation.genre_scripts[0]?.script || '',
              word_count: validation.genre_scripts[0]?.word_count || 0,
              genre_scripts: validation.genre_scripts,
              message: 'Scripts generated successfully (completed after timeout)'
            }
          }
        } catch (pollError) {
          console.error('Failed to poll for completion:', pollError)
        }
      }
      throw new Error('Failed to generate script')
    }
  }

  async selectGenreScript(id: string, genre: string): Promise<{ success: boolean; message?: string; selected_script?: string }> {
    try {
      const response = await ky.post(`${API_BASE_URL}/api/v1/validation/queue/${id}/select-genre-script`, {
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        json: { genre },
        timeout: 30000 // 30 seconds for selection
      }).json<{ success: boolean; message?: string; selected_script?: string }>()

      return response
    } catch (error) {
      console.error('Failed to select genre script:', error)
      throw new Error('Failed to select genre script')
    }
  }

  async generateShotList(id: string): Promise<{ success: boolean; shot_list: any; scene_count: number; total_shots: number }> {
    try {
      const response = await ky.post(`${API_BASE_URL}/api/v1/validation/queue/${id}/generate-shot-list`, {
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        timeout: 1200000 // 20 minutes (1200 seconds) for shot list generation - takes longer than script generation
      }).json<{ success: boolean; shot_list: any; scene_count: number; total_shots: number }>()

      return response
    } catch (error) {
      console.error('Failed to generate shot list:', error)
      // Check if it's a timeout - if so, poll to see if backend completed
      if (error instanceof Error && (error.message.includes('timeout') || error.message.includes('aborted'))) {
        console.log('⏱️ Shot list generation timed out, checking if backend completed...')
        // Poll the validation request to see if shot list was generated
        try {
          const validation = await this.getValidationRequest(id)
          if (validation.shot_list) {
            // Backend completed successfully despite timeout
            return {
              success: true,
              shot_list: validation.shot_list,
              scene_count: validation.shot_list?.scenes?.length || 0,
              total_shots: validation.shot_list?.total_shots || Object.keys(validation.shot_list || {}).length
            }
          }
        } catch (pollError) {
          console.error('Failed to poll for shot list completion:', pollError)
        }
      }
      throw new Error('Failed to generate shot list')
    }
  }
}

export const adminApi = new AdminApi()
