import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LovedOnes } from '../pages/patient/LovedOnes.js';
import { AuthProvider } from '../context/AuthContext.js';
import { LanguageProvider } from '../context/LanguageContext.js';
import { AccessibilityProvider } from '../context/AccessibilityContext.js';
import { CharacterProvider } from '../context/CharacterContext.js';
import { LovedOnesService } from '../features/lovedOnes/services/lovedOnesService.js';
import { LovedOne } from '../types/index.js';

const renderLovedOnes = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
          <AccessibilityProvider>
            <CharacterProvider>
              <LovedOnes />
            </CharacterProvider>
          </AccessibilityProvider>
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

const mockLovedOnes: LovedOne[] = [
  {
    id: 'loved-01',
    name: 'Ananya Sharma',
    relationship: 'Daughter & Primary Caregiver',
    nickname: 'Anu',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    description: 'Lives nearby in Indiranagar. Visits every Tuesday and Sunday afternoon with home-cooked cardamom kheer.',
    familiarPhrase: 'Namaste Ma! Time for a warm cup of cardamom tea.',
    cues: [
      'Calls you every morning at 9:00 AM without fail',
      'Loves listening to old ghazals with you'
    ],
    importantMemories: [
      'Our family holiday trip to Shimla watching the snow fall',
      'Graduation day celebration at Bangalore University'
    ],
    favouriteActivities: [
      'Sitting in the verandah sipping afternoon tea',
      'Watering the potted balcony tulsi'
    ],
    audioNote: 'Namaste Ma! It is Ananya. Remember, I am picking you up on Sunday for the temple visit.',
    voiceRecording: {
      id: 'rec-01',
      title: 'Sunday Temple Visit & Afternoon Tea',
      speakerName: 'Ananya Sharma',
      durationSeconds: 18,
      transcript: 'Namaste Ma! It is Ananya. Just wanted to remind you that I am coming over on Sunday at 3 PM. Love you so much!',
      recordedAt: '2026-11-02'
    },
    patientNotes: 'She loves yellow marigolds. Brings warm sweaters in winter.'
  },
  {
    id: 'loved-02',
    name: 'Aarav Sharma',
    relationship: 'Grandson (Age 9)',
    nickname: 'Chhotu',
    photoUrl: 'https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?auto=format&fit=crop&w=400&q=80',
    description: 'Ananya’s son. Full of cheerful curiosity, loves showing you his origami paper animals.',
    familiarPhrase: 'Dadi! Look what I made for you today!',
    cues: [
      'Loves hearing your bedtime story about the friendly tiger in Shimla',
      'Studies in 4th grade and plays football'
    ],
    importantMemories: [
      'Teaching him how to flick carrom counters on your wooden board'
    ],
    favouriteActivities: [
      'Playing carrom on the sunny verandah table',
      'Folding colorful origami birds'
    ],
    audioNote: 'Dadi! It is Aarav. Look at the paper crane I folded for your bedside table!',
    voiceRecording: {
      id: 'rec-02',
      title: 'Bedside Paper Crane Voice Note',
      speakerName: 'Aarav Sharma',
      durationSeconds: 12,
      transcript: 'Dadi! It is Aarav. I folded a brand new turquoise paper crane for your bedside table!',
      recordedAt: '2026-11-04'
    }
  }
];

describe('Loved Ones (Family & Identity Anchor) — Milestone 3 Full Specification', () => {
  beforeEach(() => {
    // Reset service storage for both default_patient and active demo patient UID
    LovedOnesService.saveLovedOnes('default_patient', JSON.parse(JSON.stringify(mockLovedOnes)));
    LovedOnesService.saveLovedOnes('demo-patient-001', JSON.parse(JSON.stringify(mockLovedOnes)));
  });

  // 1. Family Cards Rendering
  describe('1. Family Memory Cards Rendering', () => {
    it('renders family member cards with names, photos, relationships, descriptions, and cues', () => {
      renderLovedOnes();

      expect(screen.getByRole('heading', { name: /^Loved Ones$/i })).toBeDefined();
      expect(screen.getByText('Ananya Sharma')).toBeDefined();
      expect(screen.getByText('Daughter & Primary Caregiver')).toBeDefined();
      expect(screen.getByText('Aarav Sharma')).toBeDefined();
      expect(screen.getByText('Grandson (Age 9)')).toBeDefined();
      expect(screen.getByText(/Visits every Tuesday and Sunday afternoon/i)).toBeDefined();
    });

    it('renders familiar phrase and voice note indicator on cards', () => {
      renderLovedOnes();

      expect(screen.getByText(/Namaste Ma! Time for a warm cup of cardamom tea./i)).toBeDefined();
      expect(screen.getAllByText(/Voice Note/i).length).toBeGreaterThan(0);
    });
  });

  // 2. Individual Profile Navigation
  describe('2. Individual Memory Profiles', () => {
    it('opens detailed profile modal when a card is selected', () => {
      renderLovedOnes();

      const viewProfileButtons = screen.getAllByText('View Profile');
      fireEvent.click(viewProfileButtons[0]);

      // Expect detailed modal elements
      expect(screen.getByRole('dialog', { name: /Ananya Sharma Memory Profile/i })).toBeDefined();
      expect(screen.getByText('Personal Memory Profile')).toBeDefined();
      expect(screen.getByText(/Our family holiday trip to Shimla watching the snow fall/i)).toBeDefined();
      expect(screen.getByText(/Sitting in the verandah sipping afternoon tea/i)).toBeDefined();
      expect(screen.getByText(/She loves yellow marigolds/i)).toBeDefined();
    });

    it('allows patient or caregiver to edit and save personal notes in profile', () => {
      renderLovedOnes();

      fireEvent.click(screen.getAllByText('View Profile')[0]);
      expect(screen.getByText('Edit Note')).toBeDefined();

      fireEvent.click(screen.getByText('Edit Note'));
      const textarea = screen.getByPlaceholderText(/Write gentle reminders/i);
      fireEvent.change(textarea, { target: { value: 'Loves fresh jasmine flowers and pistachio kulfi.' } });

      fireEvent.click(screen.getByText('Save Note'));
      expect(screen.getByText(/Notes successfully saved!/i)).toBeDefined();
      expect(screen.getByText(/Loves fresh jasmine flowers and pistachio kulfi./i)).toBeDefined();
    });
  });

  // 3. Assisted Memory Cues
  describe('3. Assisted Memory Cues & Gentle Non-Shaming Prompts', () => {
    it('opens gentle memory cues modal and presents non-shaming exploration', () => {
      renderLovedOnes();

      const cueButtons = screen.getAllByText('Gentle Cues');
      fireEvent.click(cueButtons[0]);

      expect(screen.getByRole('dialog', { name: /Assisted Memory Cues/i })).toBeDefined();
      expect(screen.getByText('Gentle Memory Cues')).toBeDefined();
      expect(screen.getByText(/Who is this familiar person\?/i)).toBeDefined();
      expect(screen.getByText(/No test, take your time/i)).toBeDefined();
    });

    it('reveals gentle hint warmly without testing or shaming', () => {
      renderLovedOnes();

      fireEvent.click(screen.getAllByText('Gentle Cues')[0]);
      const hintButton = screen.getByText('Show Gentle Hint');
      fireEvent.click(hintButton);

      expect(screen.getByText(/This is Ananya Sharma/i)).toBeDefined();
      expect(screen.getByText(/They often greet you saying/i)).toBeDefined();
    });

    it('allows patient to skip questions at any point without penalty', () => {
      renderLovedOnes();

      fireEvent.click(screen.getAllByText('Gentle Cues')[0]);
      expect(screen.getByText('Cue 1 of 4')).toBeDefined();

      const skipButton = screen.getByText('Skip this cue');
      fireEvent.click(skipButton);

      // Successfully advances without penalty
      expect(screen.getByText('Cue 2 of 4')).toBeDefined();
      expect(screen.getByText(/What is your loving connection with them\?/i)).toBeDefined();
    });
  });

  // 4. Voice Memories
  describe('4. Voice Memories Playback & Authentic Audio', () => {
    it('displays authentic voice player with manual speaker attribution and duration', () => {
      renderLovedOnes();

      fireEvent.click(screen.getAllByText('View Profile')[0]);

      expect(screen.getByText('Sunday Temple Visit & Afternoon Tea')).toBeDefined();
      expect(screen.getByText(/Verified voice of/i)).toBeDefined();
      expect(screen.getAllByText('Ananya Sharma').length).toBeGreaterThan(0);
      expect(screen.getByText(/0:00 \/ 0:18/i)).toBeDefined();
      expect(screen.getByText(/Spoken Words \(Transcript\)/i)).toBeDefined();
    });

    it('toggles audio playback without failing', () => {
      renderLovedOnes();

      fireEvent.click(screen.getAllByText('View Profile')[0]);
      const playButton = screen.getByRole('button', { name: /Play voice message/i });
      fireEvent.click(playButton);

      // Turns to pause state
      expect(screen.getByRole('button', { name: /Pause voice message/i })).toBeDefined();
    });
  });

  // 5. Add / Edit / Delete Operations
  describe('5. Add, Edit, and Delete Operations', () => {
    it('opens add loved one modal and saves new family member to album', () => {
      renderLovedOnes();

      const addButton = screen.getByRole('button', { name: /Add family member/i });
      fireEvent.click(addButton);

      expect(screen.getByRole('dialog', { name: /Add New Loved One/i })).toBeDefined();

      const nameInput = screen.getByPlaceholderText(/e\.g\. Ananya Sharma/i);
      fireEvent.change(nameInput, { target: { value: 'Uncle Rajesh Sharma' } });

      const saveButton = screen.getByText('Add to Album');
      fireEvent.click(saveButton);

      // Verify new profile appears
      expect(screen.getAllByText('Uncle Rajesh Sharma').length).toBeGreaterThan(0);
    });

    it('deletes a loved one with confirmation dialog', () => {
      renderLovedOnes();

      // Open Aarav's profile
      const viewButtons = screen.getAllByText('View Profile');
      fireEvent.click(viewButtons[1]); // Aarav

      const deleteIconBtn = screen.getByTitle('Remove profile');
      fireEvent.click(deleteIconBtn);

      expect(screen.getByRole('alertdialog', { name: /Confirm deletion/i })).toBeDefined();
      expect(screen.getByText(/Are you sure you want to remove/i)).toBeDefined();

      const confirmBtn = screen.getByText('Yes, Remove');
      fireEvent.click(confirmBtn);

      // Modal closed and Aarav removed from list
      expect(screen.queryByText('Aarav Sharma')).toBeNull();
    });
  });

  // 6. Patient Data Scoping & Caregiver Access Restrictions
  describe('6. Patient Data Isolation & UID Scoping', () => {
    it('strictly isolates memory album data by patient UID in storage', () => {
      const patientA = 'patient_alice_123';
      const patientB = 'patient_bob_456';

      const aliceRecord: LovedOne = {
        id: 'loved_alice',
        name: 'Alice Sister Maya',
        relationship: 'Sister',
        photoUrl: '',
        description: 'Maya lives in Pune',
        cues: ['Calls on Sunday']
      };

      const bobRecord: LovedOne = {
        id: 'loved_bob',
        name: 'Bob Brother Suresh',
        relationship: 'Brother',
        photoUrl: '',
        description: 'Suresh lives in Chennai',
        cues: ['Loves cricket']
      };

      LovedOnesService.saveLovedOnes(patientA, [aliceRecord]);
      LovedOnesService.saveLovedOnes(patientB, [bobRecord]);

      const loadedA = LovedOnesService.getLovedOnes(patientA);
      const loadedB = LovedOnesService.getLovedOnes(patientB);

      expect(loadedA[0].name).toBe('Alice Sister Maya');
      expect(loadedB[0].name).toBe('Bob Brother Suresh');
      expect(loadedA[0].name).not.toBe(loadedB[0].name);
    });
  });

  // 7. Absence of Identity Guessing & Privacy Safeguards
  describe('7. Absence of Facial Recognition & AI Identity Guessing', () => {
    it('prominently displays verified vault banner guaranteeing no facial recognition or automated identity guessing', () => {
      renderLovedOnes();

      const banner = screen.getByText(/Verified Family Memory Vault/i);
      expect(banner).toBeDefined();
      expect(screen.getByText(/AI companion never guesses identities, invents memories, or uses facial recognition/i)).toBeDefined();
    });
  });

  // 8. Search & Filtering
  describe('8. Search & Filtering', () => {
    it('filters loved ones by name, relationship or nickname', () => {
      renderLovedOnes();

      const searchInput = screen.getByPlaceholderText(/Search by name, relationship/i);
      fireEvent.change(searchInput, { target: { value: 'Chhotu' } });

      // Only Aarav should be visible
      expect(screen.getByText('Aarav Sharma')).toBeDefined();
      expect(screen.queryByText('Ananya Sharma')).toBeNull();

      // Clear search
      fireEvent.change(searchInput, { target: { value: '' } });
      expect(screen.getByText('Ananya Sharma')).toBeDefined();
    });
  });
});
