// Mock Clerk authentication for development
// Replace with your actual Clerk setup when ready

export type ClerkUser = {
  id: string
  email?: string
  firstName?: string
  lastName?: string
  profileImageUrl?: string
}

const mockClerkUser: ClerkUser = {
  id: 'demo_user_123',
  email: 'demo@example.com',
  firstName: 'Demo',
  lastName: 'User',
  profileImageUrl: '',
}

export const currentUser = async (): Promise<ClerkUser | null> => {
  // This is a mock implementation
  // In production, you would use actual Clerk authentication
  return mockClerkUser
}

export const auth = async () => {
  return {
    userId: null,
    sessionId: null,
  }
}
