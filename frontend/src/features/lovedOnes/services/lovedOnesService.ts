import { LovedOne } from '../../../types/index.js';
import { db, isFirebaseConfigured } from '../../../services/firebase.js';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import {
  getEffectivePatientId,
  isGuestPatient,
  notifyDataChange,
  sanitizeForFirestore,
} from '../../auth/services/identityService.js';

export const DEFAULT_LOVED_ONES: LovedOne[] = [
  {
    id: 'loved-01',
    name: 'Ananya Sharma',
    relationship: 'Daughter & Primary Caregiver',
    nickname: 'Anu',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
    phoneNumber: '+91 98201 12345',
    whatsappNumber: '+919820112345',
    phone: '+91 98201 12345',
    description: 'Lives nearby in Indiranagar. Visits every Tuesday and Sunday afternoon with home-cooked cardamom kheer.',
    familiarPhrase: 'Namaste Ma! Time for a warm cup of cardamom tea.',
    cues: [
      'Calls you every morning at 9:00 AM without fail',
      'Loves listening to old ghazals and humming along with you',
      'Works as a sustainable landscape architect in Bengaluru',
      'Always wears her grandmother’s silver floral earrings'
    ],
    importantMemories: [
      'Our family holiday trip to Shimla watching the snow fall',
      'Graduation day celebration at Bangalore University in 2012',
      'Planting the fragrant night-blooming jasmine in your verandah'
    ],
    favouriteActivities: [
      'Sitting in the verandah sipping afternoon tea',
      'Looking through old black-and-white family photograph albums',
      'Watering the potted balcony tulsi and marigold plants'
    ],
    audioNote: 'Namaste Ma! It is Ananya. Remember, I am picking you up on Sunday for the temple visit. Love you always!',
    voiceRecording: {
      id: 'rec-01',
      title: 'Sunday Temple Visit & Afternoon Tea',
      speakerName: 'Ananya Sharma',
      durationSeconds: 18,
      transcript: 'Namaste Ma! It is Ananya. Just wanted to remind you that I am coming over on Sunday at 3 PM. We will visit the temple and have hot cardamom tea. Love you so much!',
      recordedAt: '2026-11-02'
    },
    patientNotes: 'She loves yellow marigolds. Brings soft warm sweaters in winter.'
  },
  {
    id: 'loved-02',
    name: 'Aarav Sharma',
    relationship: 'Grandson (Age 9)',
    nickname: 'Chhotu',
    photoUrl: 'https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?auto=format&fit=crop&w=600&q=80',
    phoneNumber: '+91 98201 12345',
    whatsappNumber: '+919820112345',
    phone: '+91 98201 12345',
    description: 'Ananya’s son. Full of cheerful curiosity, loves showing you his origami paper animals and playing carrom on the verandah.',
    familiarPhrase: 'Dadi! Look what I made for you today!',
    cues: [
      'Loves hearing your bedtime story about the friendly tiger in Shimla',
      'Always asks for a warm hug before school every morning',
      'Studies in 4th grade and plays football',
      'Folds origami animals for your bedside wooden table'
    ],
    importantMemories: [
      'Teaching him how to flick carrom counters on your wooden board',
      'His 7th birthday picnic at Cubbon Park under the big banyan tree',
      'Making homemade mango kulfi together in summer'
    ],
    favouriteActivities: [
      'Playing carrom on the sunny verandah table',
      'Folding colorful origami birds and paper cranes',
      'Listening to you tell childhood stories about Lucknow'
    ],
    audioNote: 'Dadi! It is Aarav. Look at the paper crane I folded for your bedside table!',
    voiceRecording: {
      id: 'rec-02',
      title: 'Bedside Paper Crane Voice Note',
      speakerName: 'Aarav Sharma',
      durationSeconds: 12,
      transcript: 'Dadi! It is Aarav. I folded a brand new turquoise paper crane for your bedside table! Keep it safe until Sunday. Bye Dadi!',
      recordedAt: '2026-11-04'
    },
    patientNotes: 'His favorite sweet is coconut laddoos. He giggles when we play carrom.'
  },
  {
    id: 'loved-03',
    name: 'Dr. Vikram Sharma',
    relationship: 'Son (Elder Brother to Ananya)',
    nickname: 'Vicky',
    photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=80',
    phoneNumber: '+91 98202 54321',
    whatsappNumber: '+919820254321',
    phone: '+91 98202 54321',
    description: 'Cardiologist living in New Delhi. Thoughtful and caring, video-calls every Wednesday evening on WhatsApp at 7:00 PM.',
    familiarPhrase: 'Pranam Maa, how is your blood pressure and rest today?',
    cues: [
      'Video-calls you every Wednesday at 7:00 PM without missing',
      'Sends your favorite melt-in-mouth Lucknow revdi sweets in winter',
      'Reminds you gently to drink water and do morning arm stretches',
      'Speaks with a calm, deep, reassuring voice'
    ],
    importantMemories: [
      'His medical school convocation in Delhi when you put the stethoscope around his neck',
      'The quiet train journeys from Lucknow to Delhi during holidays',
      'Listening to All India Radio evening classical concerts together'
    ],
    favouriteActivities: [
      'Wednesday evening WhatsApp video conversations',
      'Discussing classical Indian music and old radio singers',
      'Talking about news from Lucknow and family updates'
    ],
    audioNote: 'Maa, Vikram here. Hope you are doing your morning arm stretches and drinking enough water. Sending you so much love!',
    voiceRecording: {
      id: 'rec-03',
      title: 'Wednesday Evening Health & Love Note',
      speakerName: 'Dr. Vikram Sharma',
      durationSeconds: 15,
      transcript: 'Pranam Maa, Vikram here. I hope you are taking your morning tea and doing those gentle arm stretches. Looking forward to our video call on Wednesday. Pranam!',
      recordedAt: '2026-11-03'
    },
    patientNotes: 'Very busy hospital schedule, but always calls at 7 PM sharp on Wednesdays.'
  },
  {
    id: 'loved-04',
    name: 'Kavita Patel',
    relationship: 'Lifelong Best Friend',
    nickname: 'Kavi',
    photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80',
    phoneNumber: '+91 98203 98765',
    whatsappNumber: '+919820398765',
    phone: '+91 98203 98765',
    description: 'Your dear college friend of 40 years. Shares your passion for gardening, classical ragas, and embroidered cotton sarees.',
    familiarPhrase: 'Kamala, our jasmine flowers are blooming in Lucknow again!',
    cues: [
      'Known each other since college days in Lucknow in 1978',
      'Exchanges cuttings of potted herbs and flower seeds every spring',
      'Sends handwritten greeting postcards on festivals',
      'Shares your love for Pandit Bhimsen Joshi’s morning ragas'
    ],
    importantMemories: [
      'Sitting in the college library courtyard studying together',
      'Attending the annual music conference in Varanasi',
      'Sharing recipes for winter ginger chai and spiced murabba'
    ],
    favouriteActivities: [
      'Exchanging gardening tips and photos of blooming flowers',
      'Reminiscing about college hostel days and professors',
      'Listening to morning ragas on cassette recordings'
    ],
    audioNote: 'Kamala, it is Kavita! Our jasmine plant has bloomed today, just like the ones we used to plant in Lucknow.',
    voiceRecording: {
      id: 'rec-04',
      title: 'Blooming Jasmine & Garden Update',
      speakerName: 'Kavita Patel',
      durationSeconds: 14,
      transcript: 'Kamala, it is Kavita! Our white jasmine plant has bloomed today with twelve flowers! It smells exactly like our Lucknow days. Calling you soon!',
      recordedAt: '2026-11-01'
    },
    patientNotes: 'Her birthday is in October. She loves white jasmine and light pink sarees.'
  }
];

export const PRESET_AVATARS = [
  {
    id: 'avatar-female-1',
    name: 'Warm Daughter Portrait',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'avatar-boy-1',
    name: 'Smiling Grandson Portrait',
    url: 'https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'avatar-male-1',
    name: 'Gentle Son / Doctor Portrait',
    url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'avatar-female-2',
    name: 'Kind Friend / Sister Portrait',
    url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'avatar-senior-male',
    name: 'Distinguished Elder / Spouse Portrait',
    url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'avatar-senior-female',
    name: 'Graceful Elder / Friend Portrait',
    url: 'https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?auto=format&fit=crop&w=400&q=80'
  }
];

export class LovedOnesService {
  private static inMemoryStore: Record<string, string> = {};

  private static safeGetItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(key);
        if (val !== null && val !== undefined) return val;
      }
    } catch {
      // Storage unavailable or threw error in headless runner
    }
    return this.inMemoryStore[key] || null;
  }

  private static safeSetItem(key: string, val: string): void {
    this.inMemoryStore[key] = val;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, val);
      }
    } catch {
      // Storage unavailable
    }
  }

  private static safeRemoveItem(key: string): void {
    delete this.inMemoryStore[key];
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Storage unavailable
    }
  }

  public static getStorageKey(patientId: string): string {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    return `saksham_loved_ones_${effectiveId}`;
  }

  /**
   * Load all loved ones for a specific patient UID (local cache)
   */
  public static getLovedOnes(patientId: string): LovedOne[] {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    try {
      const key = this.getStorageKey(effectiveId);
      const data = this.safeGetItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {
      // Ignore parse/storage errors
    }
    // Return pre-seeded default family members tagged with this patientId
    return DEFAULT_LOVED_ONES.map((m) => ({ ...m, patientId: effectiveId }));
  }

  /**
   * Synchronize loved ones from Cloud Firestore
   */
  public static async syncLovedOnesFromFirestore(patientId: string): Promise<LovedOne[]> {
    const effectiveId = getEffectivePatientId({ uid: patientId });

    if (isGuestPatient(effectiveId) || !isFirebaseConfigured) {
      return this.getLovedOnes(effectiveId);
    }

    try {
      const q = query(
        collection(db, 'lovedOnes'),
        where('patientId', '==', effectiveId)
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const cloudLovedOnes: LovedOne[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            ...(data as LovedOne),
            id: docSnap.id,
            patientId: effectiveId,
          };
        });

        this.saveLovedOnes(effectiveId, cloudLovedOnes, false);
        return cloudLovedOnes;
      } else {
        // Seed initial family members to Firestore
        const defaults = DEFAULT_LOVED_ONES.map((m) => ({
          ...m,
          id: `${effectiveId}_${m.id}`,
          patientId: effectiveId,
        }));

        for (const item of defaults) {
          try {
            await setDoc(
              doc(db, 'lovedOnes', item.id),
              sanitizeForFirestore({
                ...item,
                patientId: effectiveId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              })
            );
          } catch (err) {
            console.warn('[LovedOnesService] Seed error for item:', item.id, err);
          }
        }

        this.saveLovedOnes(effectiveId, defaults, false);
        return defaults;
      }
    } catch (err) {
      console.warn('[LovedOnesService] Firestore sync error, falling back to local cache:', err);
      return this.getLovedOnes(effectiveId);
    }
  }

  /**
   * Save loved ones for a specific patient UID (local + Firestore)
   */
  public static saveLovedOnes(
    patientId: string,
    lovedOnes: LovedOne[],
    syncToCloud: boolean = true
  ): void {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    try {
      const key = this.getStorageKey(effectiveId);
      const prev = this.safeGetItem(key);
      const next = JSON.stringify(lovedOnes);
      if (prev === next) {
        return;
      }
      this.safeSetItem(key, next);
    } catch {
      // Ignore storage errors
    }

    notifyDataChange('lovedOnes', effectiveId);

    if (syncToCloud && !isGuestPatient(effectiveId) && isFirebaseConfigured) {
      lovedOnes.forEach(async (item) => {
        try {
          const docId = item.id.startsWith(effectiveId) ? item.id : `${effectiveId}_${item.id}`;
          await setDoc(
            doc(db, 'lovedOnes', docId),
            {
              ...item,
              id: docId,
              patientId: effectiveId,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (e) {
          console.warn('[LovedOnesService] Background sync failed for lovedOne:', item.id, e);
        }
      });
    }
  }

  /**
   * Get a single loved one by ID
   */
  public static getLovedOneById(patientId: string, id: string): LovedOne | undefined {
    const list = this.getLovedOnes(patientId);
    return list.find((m) => m.id === id);
  }

  /**
   * Add a new loved one profile
   */
  public static addLovedOne(patientId: string, item: Omit<LovedOne, 'id'>): LovedOne {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const list = this.getLovedOnes(effectiveId);
    const newLovedOne: LovedOne = {
      ...item,
      id: `loved_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      patientId: effectiveId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newLovedOne, ...list];
    this.saveLovedOnes(effectiveId, updated, true);
    return newLovedOne;
  }

  /**
   * Update an existing loved one profile
   */
  public static updateLovedOne(
    patientId: string,
    id: string,
    updates: Partial<LovedOne>
  ): LovedOne | null {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const list = this.getLovedOnes(effectiveId);
    const index = list.findIndex((m) => m.id === id || m.id === `${effectiveId}_${id}`);
    if (index === -1) return null;

    const updatedItem: LovedOne = {
      ...list[index],
      ...updates,
      id: list[index].id,
      patientId: effectiveId, // Protected ownership immutability
      updatedAt: new Date().toISOString()
    };

    list[index] = updatedItem;
    this.saveLovedOnes(effectiveId, list, true);
    return updatedItem;
  }

  /**
   * Delete a loved one profile
   */
  public static deleteLovedOne(patientId: string, id: string): boolean {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    const list = this.getLovedOnes(effectiveId);
    const filtered = list.filter((m) => m.id !== id && m.id !== `${effectiveId}_${id}`);
    if (filtered.length === list.length) return false;

    this.saveLovedOnes(effectiveId, filtered, false);

    if (!isGuestPatient(effectiveId) && isFirebaseConfigured) {
      const docId = id.startsWith(effectiveId) ? id : `${effectiveId}_${id}`;
      deleteDoc(doc(db, 'lovedOnes', docId)).catch((err) => {
        console.warn('[LovedOnesService] Cloud delete failed:', err);
      });
    }

    notifyDataChange('lovedOnes', effectiveId);
    return true;
  }

  /**
   * Update personal notes for a loved one
   */
  public static updatePatientNotes(
    patientId: string,
    id: string,
    notes: string
  ): LovedOne | null {
    return this.updateLovedOne(patientId, id, { patientNotes: notes });
  }

  /**
   * Search loved ones by name, relationship, nickname or description
   */
  public static searchLovedOnes(patientId: string, query: string): LovedOne[] {
    const list = this.getLovedOnes(patientId);
    if (!query || query.trim() === '') return list;
    const q = query.toLowerCase().trim();

    return list.filter((m) =>
      m.name.toLowerCase().includes(q) ||
      m.relationship.toLowerCase().includes(q) ||
      (m.nickname && m.nickname.toLowerCase().includes(q)) ||
      m.description.toLowerCase().includes(q) ||
      m.cues.some((c) => c.toLowerCase().includes(q))
    );
  }

  /**
   * Get preset prototype avatars for zero-cost image selection
   */
  public static getPresetAvatars() {
    return PRESET_AVATARS;
  }

  /**
   * Purge local storage cache for a given patient (used during logout/switch)
   */
  public static clearPatientCache(patientId: string): void {
    const effectiveId = getEffectivePatientId({ uid: patientId });
    this.safeRemoveItem(this.getStorageKey(effectiveId));
  }
}
