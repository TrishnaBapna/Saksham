/**
 * SAKSHAM NEURO-CARE — STAGE 3 PHASE E
 * On-Device Privacy-First Computer Vision Service
 * Strictly local, in-browser object detection with zero image transmission or storage.
 * 100% Spark Free Plan compliant ($0.00 cloud cost).
 */

export type SupportedHouseholdClass =
  | 'cup'
  | 'bottle'
  | 'chair'
  | 'couch'
  | 'book'
  | 'bowl'
  | 'clock'
  | 'laptop'
  | 'tv'
  | 'potted plant'
  | 'handbag'
  | 'cell phone'
  | 'bed'
  | 'remote'
  | 'vase';

export interface HouseholdObjectMetadata {
  label: SupportedHouseholdClass;
  displayName: string;
  icon: string;
  category: 'hydration' | 'furniture' | 'reading' | 'time' | 'technology' | 'nature' | 'personal';
  dailyAnchor: string;
  functionalAssociation: string;
  clues: {
    area: string;
    anchor: string;
    position: string;
  };
}

export interface DetectedHouseholdObject {
  id: string;
  label: SupportedHouseholdClass;
  displayName: string;
  icon: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x, y, width, height]
  timestamp: number;
  dailyAnchor: string;
  clues: {
    area: string;
    anchor: string;
    position: string;
  };
}

export interface VisionDetectionOptions {
  minConfidence?: number;
  cooldownMs?: number;
  maxDetections?: number;
}

export const SUPPORTED_HOUSEHOLD_CATALOG: Record<SupportedHouseholdClass, HouseholdObjectMetadata> = {
  cup: {
    label: 'cup',
    displayName: 'Drinking Cup or Mug',
    icon: '🍵',
    category: 'hydration',
    dailyAnchor: 'Comforting morning tea or fresh water',
    functionalAssociation: 'Drinking water or morning tea',
    clues: {
      area: 'Look near the bedside table, kitchen counter, or dining tray.',
      anchor: 'You use this every morning for your warm cup of tea.',
      position: 'Resting upright on flat surfaces, usually near a coaster.',
    },
  },
  bottle: {
    label: 'bottle',
    displayName: 'Water Flask or Bottle',
    icon: '🍶',
    category: 'hydration',
    dailyAnchor: 'Refreshing hydration kept close throughout the day',
    functionalAssociation: 'Drinking water or carrying fresh water',
    clues: {
      area: 'Scan the bedroom chest of drawers or the dining room table.',
      anchor: 'Kept filled every evening so refreshing water is always within arm’s reach.',
      position: 'Standing tall on the side of the table or shelf.',
    },
  },
  chair: {
    label: 'chair',
    displayName: 'Resting Chair or Armchair',
    icon: '🪑',
    category: 'furniture',
    dailyAnchor: 'A comfortable, peaceful spot to rest your feet and relax',
    functionalAssociation: 'Resting your feet and sitting down comfortably',
    clues: {
      area: 'Look around the seating area or beside the dining table.',
      anchor: 'Your favorite spot to sit peacefully with family.',
      position: 'Placed comfortably on the floor facing the living room or window.',
    },
  },
  couch: {
    label: 'couch',
    displayName: 'Living Room Sofa or Diwan',
    icon: '🛋️',
    category: 'furniture',
    dailyAnchor: 'Soft sanctuary for afternoon relaxation and family conversations',
    functionalAssociation: 'Resting comfortably or relaxing with family',
    clues: {
      area: 'The central seating area of your living sanctuary.',
      anchor: 'Where family gathers in the evening to share stories.',
      position: 'Arranged against the wall with soft cushions.',
    },
  },
  book: {
    label: 'book',
    displayName: 'Reading Book or Newspaper',
    icon: '📖',
    category: 'reading',
    dailyAnchor: 'Calm morning reading and staying connected to stories',
    functionalAssociation: 'Reading stories or checking the morning news',
    clues: {
      area: 'Check near your reading lamp or the living room coffee table.',
      anchor: 'Brings peaceful joy during quiet morning reading time.',
      position: 'Resting flat on a wooden surface, often beside your glasses.',
    },
  },
  bowl: {
    label: 'bowl',
    displayName: 'Serving Bowl or Katori',
    icon: '🥣',
    category: 'hydration',
    dailyAnchor: 'Enjoying nourishing meals and warm soup',
    functionalAssociation: 'Eating warm meals or breakfast',
    clues: {
      area: 'Look in the dining area or kitchen counter.',
      anchor: 'Used to serve comforting hot porridge or soup.',
      position: 'Placed securely on a dining placemat or tray.',
    },
  },
  clock: {
    label: 'clock',
    displayName: 'Wall Clock or Timepiece',
    icon: '⏰',
    category: 'time',
    dailyAnchor: 'Gently guiding your daily routines and prayer times',
    functionalAssociation: 'Checking what time of day it is',
    clues: {
      area: 'Look up along the wall or on the bedside stand.',
      anchor: 'Helps us know when it is time for breakfast, afternoon tea, or evening rest.',
      position: 'Mounted at eye level on the wall or standing on a shelf.',
    },
  },
  laptop: {
    label: 'laptop',
    displayName: 'Laptop or Computer',
    icon: '💻',
    category: 'technology',
    dailyAnchor: 'Connecting with family on video calls and browsing memories',
    functionalAssociation: 'Family video calls or checking messages',
    clues: {
      area: 'Check the study desk or living room table.',
      anchor: 'Used to see grandchildren and family on video calls.',
      position: 'Placed open on the work table or desk.',
    },
  },
  tv: {
    label: 'tv',
    displayName: 'Television Screen',
    icon: '📺',
    category: 'technology',
    dailyAnchor: 'Watching calming nature programs, music, and cultural programs',
    functionalAssociation: 'Watching news, devotional songs, or music',
    clues: {
      area: 'Mounted on the living room wall or on a TV cabinet.',
      anchor: 'Where you listen to your favorite evening songs and programs.',
      position: 'Facing the living room sofa at comfortable eye level.',
    },
  },
  'potted plant': {
    label: 'potted plant',
    displayName: 'Potted House Plant or Tulsi',
    icon: '🪴',
    category: 'nature',
    dailyAnchor: 'Nurturing living greenery and bringing peace to the home',
    functionalAssociation: 'Bringing fresh air, greenery, and morning calm',
    clues: {
      area: 'Look near the sunny window or balcony corner.',
      anchor: 'A peaceful green friend that welcomes morning sunlight.',
      position: 'Resting in a ceramic pot near natural light.',
    },
  },
  handbag: {
    label: 'handbag',
    displayName: 'Handbag or Purse',
    icon: '👜',
    category: 'personal',
    dailyAnchor: 'Keeping house keys and important items safe when stepping out',
    functionalAssociation: 'Keeping keys and personal essentials safe',
    clues: {
      area: 'Look near the hallway entrance hook or wardrobe chair.',
      anchor: 'Kept close when getting ready to visit the market or family.',
      position: 'Hanging on a hook or resting on a side chair.',
    },
  },
  'cell phone': {
    label: 'cell phone',
    displayName: 'Mobile Phone',
    icon: '📱',
    category: 'personal',
    dailyAnchor: 'Talking with loved ones and receiving caring calls',
    functionalAssociation: 'Calling children and family',
    clues: {
      area: 'Check beside your bed or on the living room side table.',
      anchor: 'Your family calls you here every evening to ask about your day.',
      position: 'Rests flat on the table, often near its charger cable.',
    },
  },
  bed: {
    label: 'bed',
    displayName: 'Bedroom Bed',
    icon: '🛏️',
    category: 'furniture',
    dailyAnchor: 'Your peaceful sanctuary for restful, restorative sleep',
    functionalAssociation: 'Sleeping and nighttime rest',
    clues: {
      area: 'The primary restful center of your bedroom.',
      anchor: 'Where you drift into peaceful, restorative sleep each night.',
      position: 'Spread neatly with familiar comforting linens.',
    },
  },
  remote: {
    label: 'remote',
    displayName: 'TV or Fan Remote',
    icon: '🎛️',
    category: 'technology',
    dailyAnchor: 'Adjusting your favorite devotional songs or room breeze',
    functionalAssociation: 'Changing channels or adjusting comfort',
    clues: {
      area: 'Look near the sofa armrest or coffee table.',
      anchor: 'Used to turn on your favorite classical tunes.',
      position: 'Resting on the wooden table right in front of the sofa.',
    },
  },
  vase: {
    label: 'vase',
    displayName: 'Flower Vase',
    icon: '🏺',
    category: 'nature',
    dailyAnchor: 'Displaying fresh seasonal blossoms with soothing fragrance',
    functionalAssociation: 'Holding fresh flowers and decorating the room',
    clues: {
      area: 'Check the center of the dining table or sideboard.',
      anchor: 'Holds colorful marigolds or roses that brighten your day.',
      position: 'Standing gracefully in the center of the table.',
    },
  },
};

export class OnDeviceVisionService {
  // Last detection timestamps per class to enforce cooldowns and avoid frame spam
  private static detectionCooldowns: Map<string, number> = new Map();

  // Simulated detection catalog for testing and non-camera fallback
  private static simulatedDetections: DetectedHouseholdObject[] = [];

  /**
   * Checks whether the current browser environment supports camera media devices.
   */
  public static isCameraSupported(): boolean {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return false;
    }
    return Boolean(
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function'
    );
  }

  /**
   * Request live camera stream with preferred mobile rear-facing or user facing mode.
   * NEVER saves or uploads video frames.
   */
  public static async startCameraStream(
    facingMode: 'user' | 'environment' = 'environment'
  ): Promise<MediaStream> {
    if (!this.isCameraSupported()) {
      throw new Error('Camera hardware or browser media API is unavailable on this device.');
    }

    try {
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      return stream;
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        throw new Error('Camera permission was denied by user or system policy.');
      }
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        throw new Error('No camera device was found on this hardware.');
      }
      if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        throw new Error('Camera is currently in use by another application or locked.');
      }
      throw err;
    }
  }

  /**
   * Unconditionally stops all media tracks and releases the camera hardware.
   */
  public static stopCameraStream(stream: MediaStream | null): void {
    if (!stream) return;
    try {
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore error on stop
        }
      });
    } catch {
      // ignore
    }
  }

  /**
   * Sets simulated detections for deterministic unit tests and sensory simulation.
   */
  public static setSimulatedDetections(detections: DetectedHouseholdObject[]): void {
    this.simulatedDetections = [...detections];
  }

  /**
   * Clears simulated detections.
   */
  public static clearSimulatedDetections(): void {
    this.simulatedDetections = [];
    this.detectionCooldowns.clear();
  }

  /**
   * Returns list of all supported household classes with their metadata.
   */
  public static getSupportedHouseholdCatalog(): HouseholdObjectMetadata[] {
    return Object.values(SUPPORTED_HOUSEHOLD_CATALOG);
  }

  /**
   * Analyzes an active video frame on-device with zero network transmission.
   * Respects confidence threshold, household whitelist, and per-class cooldowns.
   */
  public static async detectHouseholdObjects(
    videoElement: HTMLVideoElement | null,
    options: VisionDetectionOptions = {}
  ): Promise<DetectedHouseholdObject[]> {
    const minConfidence = options.minConfidence ?? 0.55;
    const cooldownMs = options.cooldownMs ?? 2000;
    const maxDetections = options.maxDetections ?? 3;
    const now = Date.now();

    // 1. If simulated detections are configured (e.g., in unit tests), return filtered candidates
    if (this.simulatedDetections.length > 0) {
      const candidates = this.simulatedDetections.filter((obj) => {
        if (obj.confidence < minConfidence) return false;
        const lastSeen = this.detectionCooldowns.get(obj.label) || 0;
        if (now - lastSeen < cooldownMs) return false;
        return true;
      });

      // Update cooldowns
      candidates.forEach((c) => this.detectionCooldowns.set(c.label, now));
      return candidates.slice(0, maxDetections);
    }

    // 2. Browser runtime with real video element:
    // If window.cocoSsd is dynamically loaded, utilize its prediction tensor
    if (typeof window !== 'undefined' && (window as any).cocoSsd && videoElement) {
      try {
        const model = (window as any)._cocoSsdModel || (await (window as any).cocoSsd.load());
        (window as any)._cocoSsdModel = model;

        const rawPredictions: Array<{ class: string; score: number; bbox: [number, number, number, number] }> =
          await model.detect(videoElement);

        const results: DetectedHouseholdObject[] = [];

        for (const p of rawPredictions) {
          const lowerClass = p.class.toLowerCase() as SupportedHouseholdClass;
          if (!SUPPORTED_HOUSEHOLD_CATALOG[lowerClass]) continue;
          if (p.score < minConfidence) continue;

          const lastSeen = this.detectionCooldowns.get(lowerClass) || 0;
          if (now - lastSeen < cooldownMs) continue;

          const meta = SUPPORTED_HOUSEHOLD_CATALOG[lowerClass];
          results.push({
            id: `obj-${lowerClass}-${now}`,
            label: lowerClass,
            displayName: meta.displayName,
            icon: meta.icon,
            confidence: Math.round(p.score * 100) / 100,
            bbox: p.bbox,
            timestamp: now,
            dailyAnchor: meta.dailyAnchor,
            clues: meta.clues,
          });

          this.detectionCooldowns.set(lowerClass, now);
          if (results.length >= maxDetections) break;
        }

        return results;
      } catch (err) {
        console.warn('[OnDeviceVisionService] Neural network inference error, falling back to frame heuristic:', err);
      }
    }

    // 3. Fallback: Frame dimension & aspect heuristic (safe, on-device, non-blocking)
    // If video is active and ready, detects if a valid video stream is flowing
    if (videoElement && videoElement.readyState >= 2 && videoElement.videoWidth > 0) {
      // In normal camera operation without external model loaded, returns empty array
      // so ASHA can gracefully offer manual selection without crashing
      return [];
    }

    return [];
  }

  /**
   * Helper to format a friendly object inquiry for ASHA.
   */
  public static getAshaObjectInquiry(target: SupportedHouseholdClass): string {
    const meta = SUPPORTED_HOUSEHOLD_CATALOG[target];
    if (!meta) return 'Can you find a familiar object in your room?';

    switch (target) {
      case 'cup':
        return 'Can you show me something we use for drinking water or morning tea?';
      case 'bottle':
        return 'Can you show me your water bottle or flask?';
      case 'chair':
        return 'Can you find a comfortable chair or resting spot?';
      case 'book':
        return 'Can you spot a book or newspaper you enjoy reading?';
      case 'clock':
        return 'Can you look around and find an object that tells us the time?';
      case 'bowl':
        return 'Can you show me a bowl or katori we use for meals?';
      case 'potted plant':
        return 'Can you find a green plant or flowers bringing freshness to your room?';
      case 'cell phone':
        return 'Can you spot your phone that keeps you connected to family?';
      default:
        return `Can you find a ${meta.displayName} in your room?`;
    }
  }
}
