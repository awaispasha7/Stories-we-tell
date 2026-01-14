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
        timeout: 60000 // 60 seconds for LLM generation
      }).json<{ success: boolean; synopsis: string; word_count: number }>()

      return response
    } catch (error) {
      console.error('Failed to generate synopsis:', error)
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
        timeout: 180000 // 180 seconds for multiple script generation
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
      throw new Error('Failed to generate script')
    }
  }

  async selectGenreScript(id: string, genre: string): Promise<{ success: boolean }> {
    try {
      const response = await ky.post(`${API_BASE_URL}/api/v1/validation/queue/${id}/select-genre-script`, {
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        json: { selected_genre_script: genre }
      }).json<{ success: boolean }>()

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
        timeout: 90000 // 90 seconds for shot list generation
      }).json<{ success: boolean; shot_list: any; scene_count: number; total_shots: number }>()

      return response
    } catch (error) {
      console.error('Failed to generate shot list:', error)
      throw new Error('Failed to generate shot list')
    }
  }
}

export const adminApi = new AdminApi()
