export type DemographicTier = 'youth' | 'adult' | 'senior';

export interface AnbeshanBiometricTelemetry {
  id?: string;
  patientUid: string;
  timestamp: string;
  ageTier: DemographicTier;
  tremorStabilityIndex: number;    // 0 - 100% (higher = stable motor control)
  speechVocalDb: number;            // Vocal amplitude sustained dB
  gaitCadenceBpm: number;           // Steps per minute auditory metronome sync
  cognitiveAccuracyPercent: number; // 0 - 100% score across Mind Clinic tests
  sessionDurationSeconds?: number;
  condition?: string;
  notes?: string;
}

export interface TelemetrySummaryStats {
  patientUid: string;
  recordsCount: number;
  avgTremorStability: number;
  avgSpeechDb: number;
  avgGaitCadenceBpm: number;
  avgCognitiveScore: number;
  progressionTrend: 'improving' | 'stable' | 'needs_attention';
  lastRecordedAt: string;
}
