export type UserRole = 'patient' | 'caregiver' | 'doctor' | 'admin';

export type WhitelistedAction =
  | 'NAVIGATE_HOME'
  | 'NAVIGATE_ROUTINES'
  | 'NAVIGATE_LOVED_ONES'
  | 'NAVIGATE_MIND_GAMES'
  | 'NAVIGATE_ROOM_MEMORY'
  | 'TRIGGER_ROUTINE_REMINDER'
  | 'SHOW_FAMILY_MEMBER'
  | 'TRIGGER_ASSISTANCE_TRAY';

export interface AIConverseRequest {
  patientId: string;
  transcript: string;
  language?: string;
  currentScreen?: string;
}

export interface AIConverseResponse {
  speech: string;
  characterState: 'greeting' | 'listening' | 'speaking' | 'thinking' | 'happy' | 'reminder' | 'encouraging';
  suggestedAction?: {
    action: WhitelistedAction;
    targetId?: string;
    description: string;
  };
}

export interface AuditLogEntry {
  actorUid: string;
  actorRole: UserRole;
  action: string;
  targetResource: string;
  timestamp: string;
  details?: Record<string, unknown>;
}
