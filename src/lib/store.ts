import { create } from 'zustand'

interface ChatStore {
  init: () => void
  send: (message: string) => void
}

export const useChatStore = create<ChatStore>((set) => ({
  init: () => {
    // Initialize chat store
    console.log('Chat store initialized')
  },
  send: (message: string) => {
    // Send message logic
    console.log('Sending message:', message)
  }
}))
