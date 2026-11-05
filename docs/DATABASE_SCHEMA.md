# Saksham — Cloud Firestore Database Schema

## 1. Schema Design Principles

1. **Least Privilege & Role Scoping**: Documents are partitioned by user identity (`uid`) and cryptographically verified relationship IDs.
2. **Denormalisation for Safety**: Redundant patient display names and relationship tags are stored in sub-collections to avoid broad read queries.
3. **Audit Immutability**: Collections such as `auditLogs` and `gameSessions` are append-only.
4. **No Direct Secret Storage**: Client-facing collections never store API secrets, OAuth tokens, or unhashed sensitive credentials.

---

## 2. Collection Specifications

### 2.1 `users`
Root collection storing basic authentication profiles and verified role claims.
- **Path**: `/users/{uid}`
- **Access**: Read by self or admin. Write only by self (safe fields) or admin/backend (role fields).

```typescript
interface UserDocument {
  uid: string;
  email: string;
  displayName: string;
  role: 'patient' | 'caregiver' | 'doctor' | 'admin';
  phoneNumber?: string;
  photoURL?: string;
  isVerified: boolean;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}
```

---

### 2.2 `patients`
Extended medical-safe profile for patients.
- **Path**: `/patients/{patientId}` (where `patientId === uid`)
- **Access**: Read by patient, authorized caregivers, assigned doctors. Write by patient or authorized caregiver.

```typescript
interface PatientDocument {
  patientId: string;
  preferredName: string;
  dateOfBirth: string;
  primaryLanguage: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phoneNumber: string;
  };
  companionSettings: {
    characterId: 'asha' | 'kabir';
    voiceSpeed: number; // 0.8 - 1.2
    voicePitch: number;
    autoSpeechOutput: boolean;
  };
  accessibilitySettings: {
    fontSize: 'normal' | 'large' | 'extra-large';
    highContrast: boolean;
    simpleMode: boolean;
  };
  createdAt: FirebaseFirestore.Timestamp;
}
```

---

### 2.3 `caregivers` & `doctors`
Profiles for secondary users.
- **Path**: `/caregivers/{caregiverId}`, `/doctors/{doctorId}`
- **Access**: Read/write by self or admin.

```typescript
interface CaregiverDocument {
  caregiverId: string;
  displayName: string;
  relationshipToPatient?: string;
  phoneNumber: string;
  notificationPreferences: {
    geofenceAlerts: boolean;
    missedRoutineAlerts: boolean;
    dailyDigest: boolean;
  };
}

interface DoctorDocument {
  doctorId: string;
  displayName: string;
  licenseNumber: string;
  specialty: string;
  hospitalAffiliation: string;
}
```

---

### 2.4 `relationships`
Explicit consent-governed links between Patients and Caregivers.
- **Path**: `/relationships/{relationshipId}`
- **Access**: Read/Write if `request.auth.uid == resource.data.patientId || request.auth.uid == resource.data.caregiverId`.

```typescript
interface RelationshipDocument {
  relationshipId: string;
  patientId: string;
  caregiverId: string;
  status: 'pending' | 'active' | 'revoked';
  permissions: {
    canViewLocation: boolean;
    canEditRoutines: boolean;
    canViewCognitiveReports: boolean;
    canManageLovedOnes: boolean;
  };
  invitationCode?: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}
```

---

### 2.5 `routines` & `activities`
Scheduled tasks, daily medication reminders, and cognitive activities.
- **Path**: `/routines/{routineId}`
- **Query Index**: `patientId ASC, scheduledTime ASC`

```typescript
interface RoutineDocument {
  routineId: string;
  patientId: string;
  title: string;
  description?: string;
  category: 'medication' | 'exercise' | 'hydration' | 'activity' | 'appointment';
  scheduledTime: string; // "11:00"
  daysOfWeek: number[]; // [0,1,2,3,4,5,6]
  streakCount: number;
  // 3-Chance Assisted Recall configuration
  enableAssistedRecall: boolean;
  recallCues?: {
    hint1: string; // Subtle verbal hint
    hint2: string; // Visual icon / location clue
    hint3: string; // Explicit direct prompt
  };
  isActive: boolean;
  createdByUser: string;
}
```

---

### 2.6 `lovedOnes` & `memoryCues`
Family memory directory with verified cues and audio notes.
- **Path**: `/lovedOnes/{lovedOneId}`
- **Access**: Read/Write by patient and authorised caregiver.

```typescript
interface LovedOneDocument {
  lovedOneId: string;
  patientId: string;
  fullName: string;
  relationship: string; // "Daughter", "Grandson", "Spouse"
  personalDescription: string;
  photoURL: string;
  voiceRecordingURL?: string;
  memoryCues: string[]; // ["Visits every Sunday", "Loves making cardamom tea together"]
  createdAt: FirebaseFirestore.Timestamp;
}
```

---

### 2.7 `rooms` & `roomObjects` (Room Memory Game)
Photographic memory aids of the patient's home environment.
- **Path**: `/rooms/{roomId}` and `/rooms/{roomId}/objects/{objectId}`

```typescript
interface RoomDocument {
  roomId: string;
  patientId: string;
  roomName: string; // "Master Bedroom", "Living Room"
  photoURL: string;
  lastCheckedAt: FirebaseFirestore.Timestamp;
  lastCapturedAt: FirebaseFirestore.Timestamp;
  notes?: string;
}

interface RoomObjectDocument {
  objectId: string;
  roomId: string;
  patientId: string;
  objectName: string; // "Reading Glasses", "Keys", "Walking Stick"
  coordinatesOnPhoto?: { x: number; y: number; width: number; height: number };
  cueHint: string; // "Resting on the wooden bedside table beside the reading lamp"
  lastVerifiedAt: FirebaseFirestore.Timestamp;
}
```

---

### 2.8 `gameSessions`
Append-only log of cognitive activity and memory game sessions.
- **Path**: `/gameSessions/{sessionId}`

```typescript
interface GameSessionDocument {
  sessionId: string;
  patientId: string;
  gameType: 'memory-matching' | 'sequence-recall' | 'room-memory' | 'word-recall';
  completedAt: FirebaseFirestore.Timestamp;
  durationSeconds: number;
  score: number;
  attemptsUsed: number;
  assistanceTriggered: boolean;
}
```

---

### 2.9 `reports` & `tasks`
Clinician-facing longitudinal summaries and clinical task assignments.
- **Path**: `/reports/{reportId}`

```typescript
interface ReportDocument {
  reportId: string;
  patientId: string;
  generatedAt: FirebaseFirestore.Timestamp;
  dateRange: { start: string; end: string };
  routineAdherencePercent: number;
  cognitiveSessionsCompleted: number;
  measuredMetrics: {
    averageRecallAttempts: number;
    completionConsistency: number;
  };
  aiGeneratedObservations?: string; // Explicitly labelled as AI suggestion
  clinicianNotes?: string;
}
```

---

### 2.10 `locationUpdates` & `geofences`
Consent-governed patient safety coordinates.
- **Path**: `/locationUpdates/{updateId}` & `/geofences/{geofenceId}`

```typescript
interface LocationUpdateDocument {
  updateId: string;
  patientId: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  timestamp: FirebaseFirestore.Timestamp;
  isSharedWithCaregiver: boolean;
}

interface GeofenceDocument {
  geofenceId: string;
  patientId: string;
  name: string; // "Home Safe Zone"
  centerLatitude: number;
  centerLongitude: number;
  radiusMeters: number;
  isActive: boolean;
  alertOnExit: boolean;
}
```

---

### 2.11 `feedback` & `auditLogs`
Platform quality control and immutable security traces.
- **Path**: `/feedback/{feedbackId}`, `/auditLogs/{logId}`

```typescript
interface FeedbackDocument {
  feedbackId: string;
  userId: string;
  userRole: 'patient' | 'caregiver' | 'doctor';
  category: 'incorrect_ai_guidance' | 'accessibility_issue' | 'bug' | 'suggestion';
  comment: string;
  rating?: number; // 1-5
  createdAt: FirebaseFirestore.Timestamp;
  status: 'new' | 'reviewed' | 'resolved';
}

interface AuditLogDocument {
  logId: string;
  timestamp: FirebaseFirestore.Timestamp;
  actorUid: string;
  actorRole: string;
  action: 'ROLE_ELEVATION' | 'LOCATION_ACCESS' | 'REPORT_EXPORT' | 'RELATIONSHIP_REVOKE';
  targetResource: string;
  ipAddress?: string;
  userAgent?: string;
}
```

---

## 3. Required Firestore Composite Indexes

1. `routines`: `patientId` (ASC), `scheduledTime` (ASC)
2. `gameSessions`: `patientId` (ASC), `completedAt` (DESC)
3. `locationUpdates`: `patientId` (ASC), `timestamp` (DESC)
4. `relationships`: `caregiverId` (ASC), `status` (ASC)
5. `auditLogs`: `actorUid` (ASC), `timestamp` (DESC)
