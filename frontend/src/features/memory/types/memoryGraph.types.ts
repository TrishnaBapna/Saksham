/**
 * SAKSHAM NEURO-CARE — PERSONAL MEMORY GRAPH
 * Master Relational Memory Schema & Node-Edge Type Contracts
 * Connects: Person -> Relationship -> Photograph -> Shared Event -> Familiar Voice/Song -> Favorite Activity
 * 100% Spark Free Plan compliant — deterministic relational storage and querying.
 */

export type MemoryNodeType =
  | 'person'
  | 'relationship'
  | 'photo'
  | 'shared_event'
  | 'voice_or_song'
  | 'favorite_activity'
  | 'place';

export type MemoryEdgeType =
  | 'is_related_to'
  | 'shared_moment'
  | 'featured_in_photo'
  | 'enjoys_activity_with'
  | 'associated_with_voice_or_song'
  | 'connected_to_place';

export type MemoryEmotionalValence =
  | 'calming'
  | 'joyful'
  | 'comforting'
  | 'proud'
  | 'nostalgic';

export interface MemoryNode {
  id: string;
  patientId: string;
  type: MemoryNodeType;
  label: string;
  description: string;
  mediaUrl?: string;
  audioUrl?: string;
  emotionalValence?: MemoryEmotionalValence;
  familiarPrompt?: string; // Asha's spoken prompt for this node
  cues: string[];          // Recognition cues for cognitive recall
  caregiverApproved: boolean; // Zero hallucination invariant
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryEdge {
  id: string;
  patientId: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationshipType: MemoryEdgeType;
  description: string; // Explanatory phrase, e.g. "often enjoys evening tea with"
  strength: number;    // 1-5, higher means more frequently referenced anchor
  caregiverApproved: boolean;
  createdAt: string;
}

export interface PersonalMemoryGraph {
  patientId: string;
  nodes: MemoryNode[];
  edges: MemoryEdge[];
  updatedAt: string;
}

export interface MemoryGraphQueryResult {
  matched: boolean;
  primaryNode: MemoryNode | null;
  connectedNodes: MemoryNode[];
  connectingEdges: MemoryEdge[];
  reassuranceSpeech: string;
  verbalReassurance?: string;
  suggestedAction?: {
    action: string;
    targetId?: string;
    description: string;
  };
}
