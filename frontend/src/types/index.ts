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
  | 'TRIGGER_ASSISTANCE_TRAY'
  | 'OPEN_NOTES'
  | 'OPEN_CALENDAR'
  | 'OPEN_UTILITIES'
  | 'LAUNCH_ROUTINE_RUNNER'
  | 'CALL_CAREGIVER';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  status?: 'verified' | 'pending' | 'suspended';
  photoURL?: string | null;
}

export type RoutineCategory =
  | 'medication'
  | 'food'
  | 'hydration'
  | 'exercise'
  | 'speech'
  | 'wellness'
  | 'cognitive'
  | 'motor'
  | 'personalCare'
  | 'activity'
  | 'appointment'
  | 'custom';

export interface RoutineItem {
  id: string;
  patientId?: string;
  title: string;
  description?: string;
  scheduledTime: string;
  category: RoutineCategory;
  period?: 'morning' | 'afternoon' | 'evening';
  streakCount: number;
  isCompleted: boolean;
  completedAt?: string;
  snoozedUntil?: string;
  timerMinutes?: number;
  enableAssistedRecall: boolean;
  steps?: string[];
  recallQuestion?: string;
  recallOptions?: string[];
  correctOptionIndex?: number;
  recallCues?: {
    hint1: string; // 1st attempt: subtle verbal hint
    hint2: string; // 2nd attempt: visual icon / location clue
    hint3: string; // 3rd attempt: explicit direct prompt
  };
  // Stage 1 legacy restoration extensions:
  status?: 'pending' | 'completed' | 'snoozed' | 'not_done';
  reminderEnabled?: boolean;
  subStepsCompleted?: number[];
  notes?: string;
}

export interface ReminderSettings {
  enabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // "22:00"
  quietHoursEnd: string;   // "07:00"
  snoozeDurationMinutes: number; // 3, 5, or 15
  soundEnabled: boolean;
  voiceEnabled: boolean;
}

export interface RoutineAttemptRecord {
  id: string;
  routineId: string;
  patientId?: string;
  date: string;
  attemptsUsed: number;
  skipped: boolean;
  isCompleted: boolean;
  completedAt?: string;
  timeZone?: string;
  createdAt?: string;
}

export interface VoiceRecording {
  id: string;
  title: string;
  speakerName: string; // Manually entered name — never guessed or auto-identified
  durationSeconds: number;
  audioUrl?: string;
  transcript: string;
  recordedAt?: string;
}

export interface FamilyMember {
  id: string;
  patientId?: string; // UID-scoped data isolation
  name: string;
  relationship: string;
  nickname?: string;
  photoUrl: string;
  phoneNumber?: string; // Optional direct telephone number (e.g. +91 98201 12345)
  whatsappNumber?: string; // Optional WhatsApp contact number
  phone?: string; // Backwards-compatible alias for phone
  description: string;
  familiarPhrase?: string; // e.g. "Namaste Ma! Time for a warm cup of cardamom tea."
  cues: string[]; // Explicit memory cues
  importantMemories?: string[]; // Significant life/family events
  favouriteActivities?: string[]; // What patient and loved one enjoy together
  audioNote?: string; // Simple text audio note (backwards compatibility)
  voiceRecording?: VoiceRecording; // Structured voice recording
  patientNotes?: string; // Personal notes written by patient or caregiver
  createdAt?: string;
  updatedAt?: string;
}

export type LovedOne = FamilyMember;

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

export type GameCategory =
  | 'memory'
  | 'attention'
  | 'sequence'
  | 'pattern'
  | 'language'
  | 'objects';

export type GameDifficulty = 'Gentle' | 'Moderate' | 'Stimulating';
export type GamePacing = 'calm' | 'balanced' | 'agile';

export interface GameBadge {
  id: string;
  title: string;
  icon: string;
  description: string;
  earnedAt?: string;
}

export interface GameItem {
  id: string;
  title: string;
  category: GameCategory;
  categoryLabel: string;
  difficulty: GameDifficulty;
  description: string;
  iconName: string;
  estimatedMinutes: number;
  instructions: string;
  benefits: string[];
}

export interface GameSessionRecord {
  id: string;
  patientId: string;
  gameId: string;
  gameTitle: string;
  category: GameCategory;
  difficulty: GameDifficulty;
  pacing?: GamePacing;
  earnedXp?: number;
  date: string;
  durationSeconds: number;
  completed: boolean;
  patientFeedback?: 'Loved it' | 'Relaxing' | 'Just right' | 'A bit tricky';
  notes?: string;
  completedAt?: string;
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
  pendingConfirmation?: {
    id: string;
    actionType: string;
    title: string;
    proposalText: string;
    details: Record<string, any>;
  };
  clarificationOptions?: {
    label: string;
    query: string;
    description?: string;
  }[];
  isEmergency?: boolean;
}
