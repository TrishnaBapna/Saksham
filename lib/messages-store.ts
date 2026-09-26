export interface StoredMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

// In-memory fallback message storage when database is offline or not provisioned
export const inMemoryMessages: StoredMessage[] = [];
