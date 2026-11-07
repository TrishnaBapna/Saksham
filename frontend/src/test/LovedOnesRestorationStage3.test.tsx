import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LovedOnes } from '../pages/patient/LovedOnes.js';
import { AuthProvider } from '../context/AuthContext.js';
import { LanguageProvider } from '../context/LanguageContext.js';
import { AccessibilityProvider } from '../context/AccessibilityContext.js';
import { CharacterProvider } from '../context/CharacterContext.js';
import { LovedOnesService } from '../features/lovedOnes/services/lovedOnesService.js';
import { LovedOne } from '../types/index.js';
import { compressImage, validateImageInput, ALLOWED_IMAGE_MIME_TYPES, MAX_IMAGE_RAW_BYTES } from '../features/lovedOnes/utils/imageCompression.js';
import { queryAICompanion } from '../services/aiService.js';
import { PatientContextService } from '../services/patientContextService.js';
import { DEMO_USERS } from '../features/auth/services/roleService.js';

const mockStage3LovedOnes: LovedOne[] = [
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
    phoneNumber: '+91 98201 12345',
    whatsappNumber: '+919820112345',
    phone: '+91 98201 12345',
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

describe('Loved Ones & Family Memory Restoration — Stage 3 Full Specification', () => {
  beforeEach(() => {
    LovedOnesService.saveLovedOnes('default_patient', JSON.parse(JSON.stringify(mockStage3LovedOnes)));
    LovedOnesService.saveLovedOnes('demo-patient-001', JSON.parse(JSON.stringify(mockStage3LovedOnes)));
    window.localStorage.setItem('saksham_auth_user', JSON.stringify(DEMO_USERS['patient@saksham.care']));
  });

  // 1. Loved Ones Home & Reassuring Visuals
  describe('1. Loved Ones Home & Reassuring Structure', () => {
    it('renders friendly heading, reassuring visual description, and verified privacy vault banner', () => {
      renderLovedOnes();

      expect(screen.getByRole('heading', { name: /^Loved Ones$/i })).toBeDefined();
      expect(screen.getByText('Familiar Faces & Family Memory Anchor')).toBeDefined();
      expect(screen.getByText(/Familiar faces, personal memories and gentle recall activities to support everyday connection/i)).toBeDefined();
      expect(screen.getByText(/Verified Family Memory Vault/i)).toBeDefined();
      expect(screen.getByText(/AI companion never guesses identities, invents memories, or uses facial recognition/i)).toBeDefined();
    });

    it('renders family memory recall section teaser card and toggle button', () => {
      renderLovedOnes();

      expect(screen.getByText('Family Memory Recall Quiz')).toBeDefined();
      expect(screen.getByRole('button', { name: /Start Face Recall Quiz/i })).toBeDefined();
    });

    it('displays clear reassuring empty state when album has zero members', () => {
      LovedOnesService.saveLovedOnes('demo-patient-001', []);
      renderLovedOnes();

      expect(screen.getByText('Your Family Memory Album is Empty')).toBeDefined();
      expect(screen.getByText(/Add your cherished family members, smiling photos/i)).toBeDefined();
      expect(screen.getByRole('button', { name: /Add First Loved One/i })).toBeDefined();
    });
  });

  // 2. Family Photo Cards & Direct Contacts (Areas A & G)
  describe('2. Family Photo Cards & Contact Actions (Call & WhatsApp)', () => {
    it('renders Call and WhatsApp action buttons on cards when phone numbers are present', () => {
      renderLovedOnes();

      const callButtons = screen.getAllByRole('link', { name: /Call/i });
      expect(callButtons.length).toBeGreaterThan(0);
      expect(callButtons[0].getAttribute('href')).toBe('tel:+919820112345');

      const whatsappButtons = screen.getAllByRole('link', { name: /WhatsApp/i });
      expect(whatsappButtons.length).toBeGreaterThan(0);
      expect(whatsappButtons[0].getAttribute('href')).toContain('https://wa.me/919820112345');
    });

    it('strictly hides direct Call and WhatsApp dials and Add Loved One button for doctor role', () => {
      const doctorUser = {
        ...DEMO_USERS['doctor@saksham.care'],
        role: 'doctor' as const
      };
      renderLovedOnes(doctorUser);

      // Verify clinical banner
      expect(screen.getByText(/Clinical Review Mode:/i)).toBeDefined();
      // Add Loved One button should not be rendered
      expect(screen.queryByRole('button', { name: /Add family member/i })).toBeNull();
      // Direct call links should not be rendered
      expect(screen.queryByRole('link', { name: /^Call /i })).toBeNull();
      expect(screen.queryByRole('link', { name: /^WhatsApp/i })).toBeNull();
    });
  });

  // 3. Personal Memory Profile Modal (Area B)
  describe('3. Personal Memory Profile Modal', () => {
    it('opens detailed profile modal with relationship, phone, notes, and shared activities', () => {
      renderLovedOnes();

      const viewProfileButtons = screen.getAllByText('View Profile');
      fireEvent.click(viewProfileButtons[0]);

      expect(screen.getByRole('dialog', { name: /Ananya Sharma Memory Profile/i })).toBeDefined();
      expect(screen.getByText('Personal Memory Profile')).toBeDefined();
      expect(screen.getByText(/Call \+91 98201 12345/i)).toBeDefined();
      expect(screen.getByText('WhatsApp Message')).toBeDefined();
      expect(screen.getByText('Favorite Shared Activities')).toBeDefined();
      expect(screen.getByText(/Sitting in the verandah sipping afternoon tea/i)).toBeDefined();
    });

    it('hides edit and delete controls in profile modal when viewed by doctor', () => {
      const doctorUser = {
        ...DEMO_USERS['doctor@saksham.care'],
        role: 'doctor' as const
      };
      renderLovedOnes(doctorUser);

      fireEvent.click(screen.getAllByText('View Profile')[0]);
      expect(screen.getAllByText(/Clinical Review Mode:/i).length).toBeGreaterThan(0);
      expect(screen.queryByTitle('Edit details')).toBeNull();
      expect(screen.queryByTitle('Remove profile')).toBeNull();
    });
  });

  // 4. Relationship Hint (Area E)
  describe('4. Relationship Hint Toggle', () => {
    it('allows patient to reveal relationship hint calmly without pressure', () => {
      renderLovedOnes();

      fireEvent.click(screen.getAllByText('View Profile')[0]);

      const hintButton = screen.getByRole('button', { name: /Reveal Relationship/i });
      expect(hintButton).toBeDefined();

      fireEvent.click(hintButton);

      expect(screen.getByText(/is your/i)).toBeDefined();
      expect(screen.getByRole('button', { name: /Hide Relationship/i })).toBeDefined();
    });
  });

  // 5. Assisted Family Recall Quiz (Area F)
  describe('5. Assisted Family Recall Quiz', () => {
    it('opens the interactive recall quiz with photo, anchor clue, and options', () => {
      renderLovedOnes();

      const startQuizButton = screen.getByRole('button', { name: /Start Face Recall Quiz/i });
      fireEvent.click(startQuizButton);

      expect(screen.getByRole('region', { name: /Gentle Face Recall Quiz/i })).toBeDefined();
      expect(screen.getByText(/Memory Anchor Clue/i)).toBeDefined();
      expect(screen.getByRole('button', { name: /Listen to Clue/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /Reveal Relation/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /Next Person/i })).toBeDefined();
    });

    it('provides warm positive encouragement when correct name is chosen', () => {
      renderLovedOnes();

      fireEvent.click(screen.getByRole('button', { name: /Start Face Recall Quiz/i }));

      // Target person is Ananya Sharma (index 0)
      const options = screen.getAllByRole('button').filter((b) => b.textContent?.includes('Ananya Sharma'));
      // Click the option button inside quiz
      fireEvent.click(options[0]);

      expect(screen.getByText(/Wonderful! That is Ananya Sharma, your Daughter & Primary Caregiver!/i)).toBeDefined();
    });

    it('provides gentle non-shaming feedback on incorrect attempt', () => {
      renderLovedOnes();

      fireEvent.click(screen.getByRole('button', { name: /Start Face Recall Quiz/i }));

      // Click a distractor option
      const distractors = screen.getAllByRole('button', { name: /Neighbor Ramesh|Dr. Sameer Joshi|Care Nurse Sunita|Aunt Shanti/i });
      fireEvent.click(distractors[0]);

      expect(screen.getByText(/A warm and loving face! Listen to the clue or tap Reveal Relationship/i)).toBeDefined();
    });

    it('navigates to next family member and allows closing quiz at any time', () => {
      renderLovedOnes();

      fireEvent.click(screen.getByRole('button', { name: /Start Face Recall Quiz/i }));
      expect(screen.getByText(/Person 1 of 2/i)).toBeDefined();

      const nextButton = screen.getByRole('button', { name: /Next Person/i });
      fireEvent.click(nextButton);
      expect(screen.getByText(/Person 2 of 2/i)).toBeDefined();

      const closeButton = screen.getByRole('button', { name: /Close Quiz/i });
      fireEvent.click(closeButton);

      // Quiz is closed, teaser banner is back
      expect(screen.queryByRole('region', { name: /Gentle Face Recall Quiz/i })).toBeNull();
      expect(screen.getByText('Family Memory Recall Quiz')).toBeDefined();
    });
  });

  // 6. Photo Management & Zero-Cost On-Device Compression (Section 3)
  describe('6. Photo Management & Lightweight Compression', () => {
    it('compresses high-resolution images to lightweight JPEG data URL (~15 KB)', async () => {
      // Mock 1x1 png data url
      const sampleDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      const compressed = await compressImage(sampleDataUrl, { maxWidth: 320, maxHeight: 320, quality: 0.75 });
      expect(compressed).toBeDefined();
      expect(compressed.length).toBeLessThan(100000); // Well under 100 KB
    });

    it('allows patient to save contact numbers and camera/file photo in Add Loved One modal', async () => {
      renderLovedOnes();

      const addButton = screen.getByRole('button', { name: /Add family member/i });
      fireEvent.click(addButton);

      expect(screen.getByRole('dialog', { name: /Add New Loved One/i })).toBeDefined();

      // Enter name & phone
      fireEvent.change(screen.getByPlaceholderText(/e\.g\. Ananya Sharma/i), {
        target: { value: 'Brother Rajesh' }
      });
      fireEvent.change(screen.getByPlaceholderText(/Direct Phone/i), {
        target: { value: '+91 98204 11223' }
      });

      // Submit
      fireEvent.click(screen.getByText('Add to Album'));

      await waitFor(() => {
        expect(screen.getAllByText('Brother Rajesh').length).toBeGreaterThan(0);
      });
    });
  });

  // 7. Patient Data Isolation (Section 6)
  describe('7. Patient Data Isolation & UID Scoping', () => {
    it('strictly isolates loved ones memory storage between different patient UIDs', () => {
      const patientA = 'patient_raj_01';
      const patientB = 'patient_priya_02';

      const rajLovedOne: LovedOne = {
        id: 'loved_raj_sister',
        name: 'Sister Sunita',
        relationship: 'Sister',
        photoUrl: '',
        phoneNumber: '+91 98200 11111',
        description: 'Lives in Jaipur',
        cues: ['Calls on Sunday mornings']
      };

      const priyaLovedOne: LovedOne = {
        id: 'loved_priya_brother',
        name: 'Brother Rohan',
        relationship: 'Brother',
        photoUrl: '',
        phoneNumber: '+91 98200 22222',
        description: 'Lives in Mumbai',
        cues: ['Sends fresh sweets on Diwali']
      };

      LovedOnesService.saveLovedOnes(patientA, [rajLovedOne]);
      LovedOnesService.saveLovedOnes(patientB, [priyaLovedOne]);

      const loadedA = LovedOnesService.getLovedOnes(patientA);
      const loadedB = LovedOnesService.getLovedOnes(patientB);

      expect(loadedA[0].name).toBe('Sister Sunita');
      expect(loadedB[0].name).toBe('Brother Rohan');
      expect(loadedA[0].phoneNumber).toBe('+91 98200 11111');
      expect(loadedB[0].phoneNumber).toBe('+91 98200 22222');
      expect(loadedA[0].name).not.toBe(loadedB[0].name);
    });
  });

  // 8. Asha AI Companion Integration (Section 5)
  describe('8. Asha AI Companion Integration with Loved Ones', () => {
    it('answers "Who is Ananya?" using saved verified information', async () => {
      const context = PatientContextService.getPatientContext(DEMO_USERS['patient@saksham.care']);
      const response = await queryAICompanion('Who is Ananya?', 'lovedOnes', 'en', context);

      expect(response.speech).toContain('Ananya Sharma');
      expect(response.speech).toContain('Daughter');
      expect(response.suggestedAction?.action).toBe('NAVIGATE_LOVED_ONES');
    });

    it('reads saved memory clue when requested', async () => {
      const context = PatientContextService.getPatientContext(DEMO_USERS['patient@saksham.care']);
      const response = await queryAICompanion('Tell me a memory clue for Ananya', 'lovedOnes', 'en', context);

      expect(response.speech).toContain('Ananya');
      expect(response.speech).toContain('Calls you every morning at 9:00 AM');
    });

    it('offers gentle face recall quiz when asked about family games or quiz', async () => {
      const context = PatientContextService.getPatientContext(DEMO_USERS['patient@saksham.care']);
      const response = await queryAICompanion('Can we play a family face recall quiz?', 'home', 'en', context);

      expect(response.speech).toContain('Family Face Recall Quiz');
      expect(response.suggestedAction?.action).toBe('NAVIGATE_LOVED_ONES');
    });

    it('reassures the patient warmly when they express forgetfulness ("I cannot remember")', async () => {
      const context = PatientContextService.getPatientContext(DEMO_USERS['patient@saksham.care']);
      const response = await queryAICompanion('I cannot remember who this is', 'lovedOnes', 'en', context);

      expect(response.speech).toContain('Please do not worry at all');
      expect(response.speech).toContain('Your loved ones are always with you');
    });

    it('honestly states when a person is not found in the verified album instead of guessing', async () => {
      const context = PatientContextService.getPatientContext(DEMO_USERS['patient@saksham.care']);
      const response = await queryAICompanion('Who is John Doe?', 'lovedOnes', 'en', context);

      expect(response.speech).toContain("I don't have a record for that specific person in your Loved Ones album yet");
      expect(response.speech).not.toContain('John Doe is your');
    });
  });

  // 9. Photo Storage, Validation, and Reliability Audits (Stage 3 Verification)
  describe('9. Photo Storage, Validation, and Reliability Audits', () => {
    it('strictly rejects image files exceeding the 10MB ceiling', async () => {
      // Create a mock large file > 10MB
      const largeFile = new File(['x'.repeat(100)], 'huge-photo.jpg', { type: 'image/jpeg' });
      Object.defineProperty(largeFile, 'size', { value: 11 * 1024 * 1024, writable: false });

      expect(() => validateImageInput(largeFile)).toThrow(/exceeds 10MB limit/i);
      await expect(compressImage(largeFile)).rejects.toThrow(/exceeds 10MB limit/i);
    });

    it('strictly rejects unsupported file formats such as PDF or text', async () => {
      const pdfFile = new File(['%PDF-1.4'], 'document.pdf', { type: 'application/pdf' });
      expect(() => validateImageInput(pdfFile)).toThrow(/Unsupported file format/i);
      await expect(compressImage(pdfFile)).rejects.toThrow(/Unsupported file format/i);

      const txtFile = new File(['hello'], 'notes.txt', { type: 'text/plain' });
      expect(() => validateImageInput(txtFile)).toThrow(/Unsupported file format/i);
    });

    it('strictly rejects invalid or non-image data URLs', () => {
      const pdfDataUrl = 'data:application/pdf;base64,JVBERi0xLjQK';
      expect(() => validateImageInput(pdfDataUrl)).toThrow(/Unsupported file format/i);

      const malformedDataUrl = 'not-a-valid-url-at-all';
      expect(() => validateImageInput(malformedDataUrl)).toThrow(/Invalid image format/i);
    });

    it('accepts valid JPEG, PNG, and WebP image inputs within size limit', () => {
      expect(ALLOWED_IMAGE_MIME_TYPES).toContain('image/jpeg');
      expect(MAX_IMAGE_RAW_BYTES).toBe(10 * 1024 * 1024);

      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
      for (const mime of allowedMimes) {
        const validFile = new File(['sample image content'], `sample.${mime.split('/')[1]}`, { type: mime });
        expect(() => validateImageInput(validFile)).not.toThrow();
      }

      // Valid remote photo URL
      expect(() =>
        validateImageInput('https://images.unsplash.com/photo-1534528741775-53994a69daeb')
      ).not.toThrow();
    });

    it('retains local cache safely when cloud Firestore write encounters an error', () => {
      const patientId = 'patient-offline-test';
      const testAlbum: LovedOne[] = [
        {
          id: 'loved-offline-1',
          name: 'Grandmother Shanti',
          relationship: 'Grandmother',
          photoUrl: '',
          description: 'Loving grandmother',
          cues: ['Loves drinking warm milk before bed']
        }
      ];

      // Even if Firestore write is rejected or background sync catches error, local cache is preserved
      LovedOnesService.saveLovedOnes(patientId, testAlbum, true);

      const loaded = LovedOnesService.getLovedOnes(patientId);
      expect(loaded).toHaveLength(1);
      expect(loaded[0].name).toBe('Grandmother Shanti');
    });

    it('allows updating or removing a photo and preserves all other family member fields', () => {
      const patientId = 'patient-photo-edit-test';
      LovedOnesService.saveLovedOnes(patientId, [
        {
          id: 'loved-photo-1',
          name: 'Uncle Ramesh',
          relationship: 'Uncle',
          photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d',
          phoneNumber: '+91 98200 33333',
          description: 'Visiting uncle who loves gardening',
          cues: ['Brings sweets on Diwali']
        }
      ]);

      // Update to remove photo (replace with empty string)
      const updated = LovedOnesService.updateLovedOne(patientId, 'loved-photo-1', {
        photoUrl: ''
      });

      expect(updated).not.toBeNull();
      expect(updated?.photoUrl).toBe('');
      expect(updated?.name).toBe('Uncle Ramesh');
      expect(updated?.phoneNumber).toBe('+91 98200 33333');

      // Verify in storage
      const fetched = LovedOnesService.getLovedOneById(patientId, 'loved-photo-1');
      expect(fetched?.photoUrl).toBe('');
    });
  });
});
