import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LovedOnes } from '../pages/patient/LovedOnes.js';
import { AuthProvider } from '../context/AuthContext.js';
import { LanguageProvider } from '../context/LanguageContext.js';
import { AccessibilityProvider } from '../context/AccessibilityContext.js';
import { CharacterProvider } from '../context/CharacterContext.js';
import { LovedOnesService } from '../features/lovedOnes/services/lovedOnesService.js';
import { LovedOne } from '../types/index.js';
import { SpeechService } from '../services/speechService.js';
import { DEMO_USERS } from '../features/auth/services/roleService.js';

const mockLovedOnesData: LovedOne[] = [
  {
    id: 'loved-01',
    name: 'Ananya Sharma',
    relationship: 'Daughter & Primary Caregiver',
    nickname: 'Anu',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    phoneNumber: '+91 98201 12345',
    whatsappNumber: '+919820112345',
    phone: '+91 98201 12345',
    description: 'Lives nearby in Indiranagar. Visits every Tuesday and Sunday afternoon with home-cooked cardamom kheer.',
    familiarPhrase: 'Namaste Ma! Time for a warm cup of cardamom tea.',
    cues: [
      'Calls you every morning at 9:00 AM without fail',
      'Loves listening to old ghazals with you'
    ],
    importantMemories: [
      'Our family holiday trip to Shimla watching the snow fall'
    ],
    favouriteActivities: [
      'Sitting in the verandah sipping afternoon tea'
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
    nickname: 'Guddu',
    photoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80',
    phoneNumber: '+91 98201 54321',
    whatsappNumber: '+919820154321',
    phone: '+91 98201 54321',
    description: 'Ananya’s son. Full of cheerful curiosity.',
    familiarPhrase: 'Dadi! Look what I made for you today!',
    cues: [
      'Loves hearing your bedtime story about the friendly tiger in Shimla'
    ],
    importantMemories: [
      'Built a Lego solar system model together during summer vacations'
    ],
    favouriteActivities: [
      'Playing word puzzle and memory games on Sunday mornings'
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

const renderLovedOnes = (userOverride = DEMO_USERS['patient@saksham.care']) => {
  window.localStorage.setItem('saksham_auth_user', JSON.stringify(userOverride));
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

describe('Milestone 3 — Integrated Loved Ones Memory Experience', () => {
  beforeEach(() => {
    LovedOnesService.saveLovedOnes('default_patient', JSON.parse(JSON.stringify(mockLovedOnesData)));
    LovedOnesService.saveLovedOnes('demo-patient-001', JSON.parse(JSON.stringify(mockLovedOnesData)));
    window.localStorage.setItem('saksham_auth_user', JSON.stringify(DEMO_USERS['patient@saksham.care']));
    vi.restoreAllMocks();
  });

  describe('1. Natural Integration Directly on Home Page', () => {
    it('renders the Family Memory Recall experience immediately without requiring a toggle button click', () => {
      renderLovedOnes();

      // Immediately visible in the DOM
      expect(screen.getByRole('region', { name: /Gentle Face Recall Quiz/i })).toBeDefined();
      expect(screen.getByText(/Do you remember who this is\?/i)).toBeDefined();
      expect(screen.getByText(/Memory Anchor Clue:/i)).toBeDefined();
      expect(screen.getByText(/Person 1 of 2/i)).toBeDefined();
    });

    it('confirms the complete absence of unwanted Miko notifications from Loved Ones', () => {
      renderLovedOnes();

      expect(screen.queryByText(/MIKO ROBOT/i)).toBeNull();
      expect(screen.queryByText(/COMPANION NUDGE/i)).toBeNull();
      expect(screen.queryByText(/Friendly reminder:/i)).toBeNull();
      expect(screen.queryByTitle(/Toggle Miko Companion/i)).toBeNull();
    });
  });

  describe('2. Progressive Clue System & Reassuring Answer', () => {
    it('reveals Hint 1 progressively upon first hint tap', () => {
      renderLovedOnes();

      expect(screen.queryByText(/Hint 1/i)).toBeNull();
      const hintBtn = screen.getByRole('button', { name: /Reveal Hint/i });
      fireEvent.click(hintBtn);

      expect(screen.getByText(/Hint 1/i)).toBeDefined();
      expect(screen.getByText(/This person is part of your family and loves you dearly/i)).toBeDefined();
    });

    it('reveals Hint 2 with relationship anchor and familiar phrase upon second hint tap', () => {
      renderLovedOnes();

      const hintBtn = screen.getByRole('button', { name: /Reveal Hint/i });
      fireEvent.click(hintBtn);
      fireEvent.click(hintBtn);

      expect(screen.getByText(/Hint 2/i)).toBeDefined();
      expect(screen.getByText(/This is someone you have saved as your Daughter & Primary Caregiver/i)).toBeDefined();
      expect(screen.getAllByText(/Time for a warm cup of cardamom tea/i).length).toBeGreaterThan(0);
    });

    it('reveals full reassuring answer when Reveal Answer is tapped', () => {
      renderLovedOnes();

      const answerBtn = screen.getByRole('button', { name: /Reveal Relation \/ Answer/i });
      fireEvent.click(answerBtn);

      expect(screen.getByText(/This is your/i)).toBeDefined();
      expect(screen.getAllByText(/Ananya Sharma/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Daughter & Primary Caregiver/i).length).toBeGreaterThan(0);
    });
  });

  describe('3. Non-Punitive Multiple-Choice Interactions', () => {
    it('encourages warmly upon selecting correct name option', () => {
      renderLovedOnes();

      const options = screen.getAllByRole('button').filter((b) => b.textContent?.includes('Ananya Sharma'));
      fireEvent.click(options[0]);

      expect(screen.getByText(/Wonderful! That is Ananya Sharma, your Daughter & Primary Caregiver!/i)).toBeDefined();
    });

    it('provides reassuring guidance and auto-advances hint upon incorrect option tap', () => {
      renderLovedOnes();

      const distractor = screen.getAllByRole('button', { name: /Neighbor Ramesh|Dr. Sameer Joshi|Care Nurse Sunita|Aunt Shanti/i })[0];
      fireEvent.click(distractor);

      expect(screen.getByText(/A warm and loving face! Listen to the clue or tap Reveal Relationship to help remember/i)).toBeDefined();
      expect(screen.getByText(/Hint 1/i)).toBeDefined();
    });
  });

  describe('4. Genuine Voice Recordings & Transcripts', () => {
    it('plays authentic voice recording directly and renders spoken words transcript', () => {
      renderLovedOnes();

      const playVoiceBtn = screen.getByRole('button', { name: /Play voice note from Ananya Sharma/i });
      expect(playVoiceBtn).toBeDefined();

      fireEvent.click(playVoiceBtn);

      expect(screen.getByText(/Spoken Words from Ananya Sharma:/i)).toBeDefined();
      expect(screen.getByText(/Just wanted to remind you that I am coming over on Sunday at 3 PM/i)).toBeDefined();
    });
  });

  describe('5. Asha AI Companion Warm Memory Guidance', () => {
    it('provides interactive memory prompts for photos, clues, and voice memories', () => {
      const speakSpy = vi.spyOn(SpeechService, 'speak');
      renderLovedOnes();

      expect(screen.getByText(/Asha AI Companion/i)).toBeDefined();
      expect(screen.getAllByText(/Memory Guide/i).length).toBeGreaterThan(0);

      // Prompt 1: Explore Photos
      fireEvent.click(screen.getByRole('button', { name: /Explore Photos/i }));
      expect(speakSpy).toHaveBeenCalledWith(expect.stringContaining('smiling photographs of your cherished family'), expect.any(Function), expect.any(Function));

      // Prompt 2: Gentle Memory Clue
      fireEvent.click(screen.getByRole('button', { name: /Gentle Memory Clue/i }));
      expect(speakSpy).toHaveBeenCalledWith(expect.stringContaining('connect with a familiar memory together'), expect.any(Function), expect.any(Function));

      // Prompt 3: Hear Voice Memories
      fireEvent.click(screen.getByRole('button', { name: /Hear Voice Memories/i }));
      expect(speakSpy).toHaveBeenCalledWith(expect.stringContaining('Playing a warm voice memory from Ananya Sharma'), expect.any(Function), expect.any(Function));
    });
  });

  describe('6. Doctor Clinical Review Safeguards', () => {
    it('displays clinical review banner and hides contact dials and add controls for doctor role', () => {
      const doctorUser = {
        ...DEMO_USERS['doctor@saksham.care'],
        role: 'doctor' as const
      };
      renderLovedOnes(doctorUser);

      expect(screen.getByText(/Clinical Review Mode:/i)).toBeDefined();
      expect(screen.queryByRole('button', { name: /Add Loved One/i })).toBeNull();
      expect(screen.queryByRole('link', { name: /Call/i })).toBeNull();
      expect(screen.queryByRole('link', { name: /WhatsApp/i })).toBeNull();
    });
  });
});
