import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as firestore from 'firebase/firestore';
import { CaregiverService, EMPTY_CAREGIVER_PERMISSIONS } from '../features/caregiver/services/caregiverService.js';
import { LovedOnesService } from '../features/lovedOnes/services/lovedOnesService.js';
import { AddEditLovedOneModal } from '../features/lovedOnes/components/AddEditLovedOneModal.js';
import { VoiceStorageService } from '../features/notes/services/voiceStorageService.js';
import { mockFirestoreStore, resetMockFirestoreStore } from './setup.js';
import { LovedOne } from '../types/index.js';

// In-memory IndexedDB Mock for VoiceStorageService testing
let inMemoryIDB: Record<string, any> = {};

function setupMockIndexedDB() {
  inMemoryIDB = {};
  (VoiceStorageService as any).dbPromise = null;
  const mockIDB = {
    open: (_name: string, _version: number) => {
      const req: any = {
        result: {
          objectStoreNames: {
            contains: () => true,
          },
          createObjectStore: () => {},
          transaction: () => ({
            objectStore: () => ({
              put: (record: any) => {
                inMemoryIDB[record.key] = record;
                const putReq: any = {};
                setTimeout(() => putReq.onsuccess && putReq.onsuccess({ target: putReq }), 0);
                return putReq;
              },
              get: (key: string) => {
                const getReq: any = { result: inMemoryIDB[key] };
                setTimeout(() => getReq.onsuccess && getReq.onsuccess({ target: getReq }), 0);
                return getReq;
              },
              delete: (key: string) => {
                delete inMemoryIDB[key];
                const delReq: any = {};
                setTimeout(() => delReq.onsuccess && delReq.onsuccess({ target: delReq }), 0);
                return delReq;
              },
            }),
          }),
        },
      };
      setTimeout(() => {
        if (req.onsuccess) req.onsuccess({ target: req });
      }, 0);
      return req;
    },
  };

  Object.defineProperty(window, 'indexedDB', {
    value: mockIDB,
    configurable: true,
    writable: true,
  });
}

describe('Stage L.3: MVP Spark Compatibility & Caregiver Safety Remediation', () => {
  const originalDev = import.meta.env.DEV;
  const originalProd = import.meta.env.PROD;

  beforeEach(() => {
    vi.restoreAllMocks();
    resetMockFirestoreStore();
    localStorage.clear();
    setupMockIndexedDB();
  });

  afterEach(() => {
    // @ts-ignore
    import.meta.env.DEV = originalDev;
    // @ts-ignore
    import.meta.env.PROD = originalProd;
    resetMockFirestoreStore();
    localStorage.clear();
  });

  // =========================================================================
  // Scenario 1: Firebase Storage unavailable on Spark ($0.00 plan)
  // =========================================================================
  it('Scenario 1: Modal informs user that Cloud Storage is deferred on the Spark ($0.00) plan', () => {
    render(
      <AddEditLovedOneModal
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    // Verify Spark Free-Tier Notice is prominently displayed in the UI
    expect(screen.getByText(/Spark Free-Tier Notice:/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Cloud Storage file uploads are deferred on the Spark \(\$0\.00\) plan/i)
    ).toBeInTheDocument();
  });

  // =========================================================================
  // Scenario 2: Photo upload failure / clear guidance
  // =========================================================================
  it('Scenario 2: Selecting a photo file displays clear explanation without pretending to upload', async () => {
    render(
      <AddEditLovedOneModal
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    // Find the file input
    const fileInputs = document.querySelectorAll('input[type="file"]');
    expect(fileInputs.length).toBeGreaterThan(0);
    const fileInput = fileInputs[0] as HTMLInputElement;

    // Simulate user choosing a file
    const fakeFile = new File(['fake-image-bytes'], 'family-photo.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [fakeFile] } });

    // Verify clear guidance is shown explaining Blaze requirement and pausing direct media uploads
    await waitFor(() => {
      expect(
        screen.getByText(/Cloud photo uploads require Firebase Cloud Storage \(Blaze plan\)/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/direct media uploads are paused/i)
      ).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Scenario 3: Voice recording upload failure / local IndexedDB handling
  // =========================================================================
  it('Scenario 3: Voice recordings are stored locally in IndexedDB with 0 bytes sent to Firebase Storage', async () => {
    const patientId = 'pilot-patient-101';
    const noteId = 'voice-note-202';
    const fakeAudioBlob = new Blob(['simulated-aac-voice-bytes'], { type: 'audio/aac' });

    const audioKey = VoiceStorageService.generateAudioKey(patientId, noteId);
    expect(audioKey).toMatch(new RegExp(`^voice_note_${patientId}_${noteId}`));

    // Save audio blob into local IndexedDB
    const saveSuccess = await VoiceStorageService.saveAudioBlob(audioKey, fakeAudioBlob, {
      durationSeconds: 15,
      mimeType: 'audio/aac',
    });
    expect(saveSuccess).toBe(true);

    // Retrieve audio blob strictly from local storage
    const retrieved = await VoiceStorageService.getAudioBlob(audioKey);
    expect(retrieved).toBeDefined();
    expect(retrieved?.size).toBe(fakeAudioBlob.size);

    // Verify deletion cleans up local store
    const deleteSuccess = await VoiceStorageService.deleteAudioBlob(audioKey);
    expect(deleteSuccess).toBe(true);
    const afterDelete = await VoiceStorageService.getAudioBlob(audioKey);
    expect(afterDelete).toBeNull();
  });

  // =========================================================================
  // Scenario 4: No false upload-success confirmation
  // =========================================================================
  it('Scenario 4: Selecting a file never displays false upload success confirmation', async () => {
    render(
      <AddEditLovedOneModal
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    const fileInputs = document.querySelectorAll('input[type="file"]');
    const fileInput = fileInputs[0] as HTMLInputElement;

    const fakeFile = new File(['dummy-bytes'], 'test.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [fakeFile] } });

    // Assert that no false success message is shown
    expect(screen.queryByText(/Upload complete/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Image uploaded successfully/i)).not.toBeInTheDocument();
  });

  // =========================================================================
  // Scenario 5: Existing text memories remain fully usable and editable
  // =========================================================================
  it('Scenario 5: Text memories, cues, nicknames and phrases remain fully usable without photos, and data: URIs are stripped', async () => {
    const handleSave = vi.fn();

    render(
      <AddEditLovedOneModal
        onClose={vi.fn()}
        onSave={handleSave}
      />
    );

    // Fill in rich textual memory fields
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Ananya Sharma/i), {
      target: { value: 'Rajesh Sharma' },
    });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Anu, Chhotu, Vicky/i), {
      target: { value: 'Raju' },
    });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Namaste Ma! Time for tea\./i), {
      target: { value: 'Namaste Papa! Have your warm water.' },
    });

    // Add a cue
    const cueInput = screen.getByPlaceholderText(/Add a cue \(e\.g\. Calls at 9 AM, loves old ghazals\)\.\.\./i);
    fireEvent.change(cueInput, { target: { value: 'Visits every evening after office' } });
    fireEvent.keyDown(cueInput, { key: 'Enter', code: 'Enter' });

    // Submit the form
    fireEvent.click(screen.getByText(/Add to Album/i));

    expect(handleSave).toHaveBeenCalledTimes(1);
    const savedData = handleSave.mock.calls[0][0];
    expect(savedData.name).toBe('Rajesh Sharma');
    expect(savedData.nickname).toBe('Raju');
    expect(savedData.familiarPhrase).toBe('Namaste Papa! Have your warm water.');
    expect(savedData.cues).toContain('Visits every evening after office');

    // Also verify LovedOnesService sanitizer strips data: URLs
    const rawItem: LovedOne = {
      id: 'test-mem-1',
      name: 'Raju',
      relationship: 'Son',
      photoUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...', // heavy data URI
      description: 'Test memory',
      cues: ['Test cue'],
    };

    const spySetDoc = vi.spyOn(firestore, 'setDoc');
    LovedOnesService.saveLovedOnes('pilot-patient-001', [rawItem], true);

    await waitFor(() => {
      expect(spySetDoc).toHaveBeenCalled();
    });
    const syncedPayload = spySetDoc.mock.calls[0][1] as any;
    expect(syncedPayload.photoUrl).toBe(''); // stripped to protect Firestore limits
  });

  // =========================================================================
  // Scenario 6: Caregiver relationship missing
  // =========================================================================
  it('Scenario 6: Missing caregiver relationship returns unlinked state with EMPTY_CAREGIVER_PERMISSIONS', async () => {
    // @ts-ignore
    import.meta.env.DEV = false;
    // @ts-ignore
    import.meta.env.PROD = true;

    // Empty Firestore relationships
    mockFirestoreStore['relationships'] = {};

    const result = await CaregiverService.getConnectedPatient('unlinked-caregiver-999');

    expect(result.patientId).toBe('');
    expect(result.patientName).toBe('No Patient Linked');
    expect(result.relationshipStatus).toBe('none');
    expect(result.permissions).toEqual(EMPTY_CAREGIVER_PERMISSIONS);
    expect(result.permissions.canReadCalendar).toBe(false);
    expect(result.permissions.canCreateCalendarEvents).toBe(false);
  });

  // =========================================================================
  // Scenario 7: Caregiver relationship permission denied
  // =========================================================================
  it('Scenario 7: Permission denied error returns unlinked state with error and EMPTY_CAREGIVER_PERMISSIONS', async () => {
    // @ts-ignore
    import.meta.env.DEV = false;
    // @ts-ignore
    import.meta.env.PROD = true;

    // Simulate Firestore throwing permission-denied
    vi.spyOn(firestore, 'getDocs').mockRejectedValueOnce(
      new Error('Missing or insufficient permissions (firestore/permission-denied).')
    );

    const result = await CaregiverService.getConnectedPatient('caregiver-perm-denied-1');

    expect(result.patientId).toBe('');
    expect(result.patientName).toBe('Unable to Load Patient');
    expect(result.relationshipStatus).toBe('none');
    expect(result.permissions).toEqual(EMPTY_CAREGIVER_PERMISSIONS);
    expect(result.error).toContain('permission-denied');
  });

  // =========================================================================
  // Scenario 8: Caregiver relationship network failure
  // =========================================================================
  it('Scenario 8: Network failure returns unlinked state with error and never fabricates patient', async () => {
    // @ts-ignore
    import.meta.env.DEV = false;
    // @ts-ignore
    import.meta.env.PROD = true;

    // Simulate network error
    vi.spyOn(firestore, 'getDocs').mockRejectedValueOnce(
      new Error('Failed to fetch: network unavailable.')
    );

    const result = await CaregiverService.getConnectedPatient('caregiver-net-fail-1');

    expect(result.patientId).toBe('');
    expect(result.patientName).toBe('Unable to Load Patient');
    expect(result.relationshipStatus).toBe('none');
    expect(result.permissions).toEqual(EMPTY_CAREGIVER_PERMISSIONS);
    expect(result.error).toContain('network unavailable');
    // Crucial: No mock Sunita Sharma fabricated!
    expect(result.patientName).not.toBe('Sunita Sharma');
  });

  // =========================================================================
  // Scenario 9: No mock patient fallback under any failure scenario in production
  // =========================================================================
  it('Scenario 9: Under production mode, demo-caregiver-001 or any failure NEVER falls back to Sunita Sharma', async () => {
    // @ts-ignore
    import.meta.env.DEV = false;
    // @ts-ignore
    import.meta.env.PROD = true;

    // Empty relationships
    mockFirestoreStore['relationships'] = {};

    // In production, even passing 'demo-caregiver-001' must query Firestore and not inject mock data
    const result = await CaregiverService.getConnectedPatient('demo-caregiver-001');

    expect(result.patientName).not.toBe('Sunita Sharma');
    expect(result.patientId).toBe('');
    expect(result.relationshipStatus).toBe('none');
    expect(result.permissions).toEqual(EMPTY_CAREGIVER_PERMISSIONS);
  });

  // =========================================================================
  // Scenario 10: Successful legitimate caregiver relationship lookup
  // =========================================================================
  it('Scenario 10: Legitimate verified caregiver relationship in Firestore returns real patient and permissions', async () => {
    // @ts-ignore
    import.meta.env.DEV = false;
    // @ts-ignore
    import.meta.env.PROD = true;

    // Seed real verified relationship in mock Firestore
    const caregiverId = 'real-caregiver-456';
    const patientId = 'real-patient-789';
    mockFirestoreStore['relationships'] = {
      [`${caregiverId}_${patientId}`]: {
        caregiverId,
        patientId,
        patientName: 'Devika Patel',
        status: 'active',
        canReadCalendar: true,
        canCreateCalendarEvents: true,
        canEditCalendarEvents: false,
        canDeleteCalendarEvents: false,
      },
    };

    const result = await CaregiverService.getConnectedPatient(caregiverId);

    expect(result.patientId).toBe(patientId);
    expect(result.patientName).toBe('Devika Patel');
    expect(result.relationshipStatus).toBe('active');
    expect(result.permissions.canReadCalendar).toBe(true);
    expect(result.permissions.canCreateCalendarEvents).toBe(true);
    expect(result.permissions.canEditCalendarEvents).toBe(false);
    expect(result.permissions.canDeleteCalendarEvents).toBe(false);
  });
});
