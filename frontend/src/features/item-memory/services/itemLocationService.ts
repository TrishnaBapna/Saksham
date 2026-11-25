/**
 * SAKSHAM NEURO-CARE — ITEM LOCATION MEMORY SERVICE
 * Grounded on-device misplaced personal item retrieval and recording.
 * Privacy invariant: Zero external cloud storage; data isolated per patient ID.
 */

import { ItemLocationRecord } from '../types/itemMemory.types.js';
import { isLocalDemoEnvironment } from '../../auth/services/identityService.js';

export const DEFAULT_SUNITA_ITEMS: ItemLocationRecord[] = [
  {
    id: 'item-01',
    patientId: 'sunita_01',
    itemName: 'Reading Glasses',
    synonyms: [
      'glasses', 'reading glasses', 'spectacles', 'chashma', 'chashme',
      'चश्मा', 'चश्मे', 'चष्मा', 'கண்ணாடி', 'కళ్ళద్దాలు', 'ಕನ್ನಡಕ', 'കണ്ണട'
    ],
    locationRecorded: 'Bedside table next to the reading lamp',
    room: 'Bedroom',
    recordedAt: 'Today at 9:15 AM',
    verifiedStatus: 'LAST_RECORDED',
    notes: 'Kept in red hard-case near the reading lamp',
    photoDataUrl: 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'item-02',
    patientId: 'sunita_01',
    itemName: 'House Keys',
    synonyms: [
      'keys', 'house keys', 'chabi', 'chabiya', 'chabiyan',
      'चाबी', 'चाबियाँ', 'किल्ली', 'சாவி', 'తాళంచెవులు', 'ಕೀಲಿ', 'താക്കോൽ'
    ],
    locationRecorded: 'Wooden key hook near the front entrance',
    room: 'Entrance Hall',
    recordedAt: 'Yesterday at 6:30 PM',
    verifiedStatus: 'LAST_RECORDED',
    notes: 'Brass keychain with small temple bell',
    photoDataUrl: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'item-03',
    patientId: 'sunita_01',
    itemName: 'TV Remote',
    synonyms: [
      'remote', 'tv remote', 'television remote',
      'रिमोट', 'टीव्ही रिमोट', 'ரிமோட்', 'రిమోట్', 'ರಿಮೋಟ್', 'റിമോട്ട്'
    ],
    locationRecorded: 'Living room coffee table beside the floral armchair',
    room: 'Living Room',
    recordedAt: 'Today at 10:00 AM',
    verifiedStatus: 'LAST_RECORDED',
    notes: 'Black remote with yellow power button',
    photoDataUrl: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'item-04',
    patientId: 'sunita_01',
    itemName: 'Daily Medicine Box',
    synonyms: [
      'medicine', 'medicines', 'medicine box', 'pill box', 'dawa', 'dawakhana',
      'दवा', 'गोली', 'औषध', 'மருந்து', 'మందులు', 'ಔಷಧಿ', 'മരുന്ന്'
    ],
    locationRecorded: 'Dining table top shelf next to water jug',
    room: 'Dining Room',
    recordedAt: 'Today at 8:00 AM',
    verifiedStatus: 'LAST_RECORDED',
    notes: 'Morning compartment already taken',
    photoDataUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'item-05',
    patientId: 'sunita_01',
    itemName: 'Walking Stick',
    synonyms: [
      'walking stick', 'cane', 'stick', 'chhadi', 'lakdi',
      'काठी', 'छड़ी', 'கைத்தடி', 'చేతికర్ర', 'ಊರುಗೋಲು', 'വടി'
    ],
    locationRecorded: 'Verandah entrance stand',
    room: 'Verandah',
    recordedAt: 'Today at 7:30 AM',
    verifiedStatus: 'LAST_RECORDED',
    notes: 'Carved wooden handle with rubber tip',
    photoDataUrl: 'https://images.unsplash.com/photo-1581579186913-45ac3e6eccdd?auto=format&fit=crop&w=600&q=80',
  },
];

export class ItemLocationService {
  private static getStorageKey(patientId: string): string {
    return `saksham_item_locations_${patientId || 'sunita_01'}`;
  }

  public static getItems(patientId: string = 'sunita_01'): ItemLocationRecord[] {
    const key = this.getStorageKey(patientId);
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[ItemLocationService] Error reading localStorage:', e);
    }

    // Default seed for Sunita
    if (patientId === 'sunita_01' || patientId === 'demo_patient') {
      try {
        localStorage.setItem(key, JSON.stringify(DEFAULT_SUNITA_ITEMS));
      } catch {
        // ignore
      }
      return DEFAULT_SUNITA_ITEMS;
    }

    return [];
  }

  public static findItemByQuery(patientId: string = 'sunita_01', query: string): ItemLocationRecord | undefined {
    const items = this.getItems(patientId);
    const qClean = query.toLowerCase().trim();
    const qNorm = qClean.replace(/ष/g, 'श');

    for (const item of items) {
      const name = item.itemName.toLowerCase();
      const nameNorm = name.replace(/ष/g, 'श');
      if (qClean.includes(name) || name.includes(qClean) || qNorm.includes(nameNorm)) {
        return item;
      }
      for (const syn of item.synonyms) {
        const sClean = syn.toLowerCase();
        const sNorm = sClean.replace(/ष/g, 'श');
        if (qClean.includes(sClean) || qNorm.includes(sNorm)) {
          return item;
        }
      }
    }
    return undefined;
  }

  public static async saveItem(item: ItemLocationRecord): Promise<void> {
    const patientId = item.patientId || 'sunita_01';
    const items = this.getItems(patientId);
    const existingIndex = items.findIndex((i) => i.id === item.id);

    if (existingIndex >= 0) {
      items[existingIndex] = { ...items[existingIndex], ...item };
    } else {
      items.push({
        ...item,
        id: item.id || `item-${Date.now()}`,
        recordedAt: item.recordedAt || 'Just now',
        verifiedStatus: 'LAST_RECORDED',
      });
    }

    const key = this.getStorageKey(patientId);
    try {
      localStorage.setItem(key, JSON.stringify(items));
    } catch (e) {
      console.warn('[ItemLocationService] Error saving to localStorage:', e);
    }

    // Optional background sync to local Asha server (local dev / demo environment only)
    if (isLocalDemoEnvironment()) {
      try {
        fetch('http://127.0.0.1:8096/api/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...item, patient_id: patientId }),
        }).catch(() => {});
      } catch {
        // offline silent
      }
    }
  }

  public static async deleteItem(patientId: string = 'sunita_01', itemId: string): Promise<void> {
    const items = this.getItems(patientId).filter((i) => i.id !== itemId);
    const key = this.getStorageKey(patientId);
    try {
      localStorage.setItem(key, JSON.stringify(items));
    } catch (e) {
      console.warn('[ItemLocationService] Error updating localStorage:', e);
    }

    // Optional background sync to local Asha server (local dev / demo environment only)
    if (isLocalDemoEnvironment()) {
      try {
        fetch('http://127.0.0.1:8096/api/items', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: itemId, patient_id: patientId }),
        }).catch(() => {});
      } catch {
        // offline silent
      }
    }
  }
}
