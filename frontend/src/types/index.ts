export type UserRole = 'patient' | 'caregiver' | 'doctor' | 'admin';

export type CharacterId = 'asha' | 'kabir';

export type CharacterState =
  | 'idle'
  | 'greeting'
  | 'listening'
  | 'speaking'
  | 'thinking'
  | 'happy'
  | 'reminder'
  | 'encouraging';

export type WhitelistedAction =
  | 'NAVIGATE_HOME'
  | 'NAVIGATE_ROUTINES'
  | 'NAVIGATE_LOVED_ONES'
  | 'NAVIGATE_MIND_GAMES'
  | 'NAVIGATE_ROOM_MEMORY'
  | 'TRIGGER_ROUTINE_REMINDER'
  | 'SHOW_FAMILY_MEMBER'
  | 'TRIGGER_ASSISTANCE_TRAY';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  photoURL?: string;
}

export interface RoutineItem {
  id: string;
  title: string;
  scheduledTime: string;
  category: 'medication' | 'exercise' | 'hydration' | 'activity' | 'appointment';
  streakCount: number;
  isCompleted: boolean;
  enableAssistedRecall: boolean;
  recallCues?: {
    hint1: string; // Subtle verbal hint
    hint2: string; // Visual icon / location clue
    hint3: string; // Explicit direct prompt
  };
}

export interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  photoUrl: string;
  description: string;
  audioNote?: string;
  cues: string[];
}

export interface RoomRecord {
  id: string;
  roomName: string;
  photoUrl: string;
  lastCheckedTime: string;
  capturedDate: string;
  detectedObjects: {
    name: string;
    locationHint: string;
    verifiedTime: string;
  }[];
}

export interface CognitiveGame {
  id: string;
  title: string;
  category: string;
  difficulty: 'Gentle' | 'Moderate' | 'Stimulating';
  description: string;
  iconName: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  suggestedAction?: {
    action: WhitelistedAction;
    targetId?: string;
    description: string;
  };
}
