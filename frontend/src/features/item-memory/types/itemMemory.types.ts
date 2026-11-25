/**
 * SAKSHAM NEURO-CARE — ITEM LOCATION MEMORY TYPES
 * Grounded misplaced personal item tracking for patients with mild cognitive impairment.
 */

export type ItemVerificationStatus = 'LAST_RECORDED' | 'VERIFIED_CURRENT' | 'UNKNOWN';

export interface ItemLocationRecord {
  id: string;
  patientId: string;
  itemName: string;
  synonyms: string[];
  locationRecorded: string;
  room?: string;
  photoDataUrl?: string;
  recordedAt: string;
  verifiedStatus: ItemVerificationStatus;
  notes?: string;
}

export interface ItemSearchMatch {
  item: ItemLocationRecord;
  confidence: number;
  matchedSynonym?: string;
}
