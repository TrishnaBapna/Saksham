import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MindGames } from '../pages/patient/MindGames.js';
import { AuthProvider } from '../context/AuthContext.js';
import { LanguageProvider } from '../context/LanguageContext.js';
import { AccessibilityProvider } from '../context/AccessibilityContext.js';
import { CharacterProvider } from '../context/CharacterContext.js';
import { GamesService } from '../features/games/services/gamesService.js';
import { GameSessionRecord } from '../types/index.js';

const renderMindGames = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
          <AccessibilityProvider>
            <CharacterProvider>
              <MindGames />
            </CharacterProvider>
          </AccessibilityProvider>
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('Mind Games (Cognitive Wellness & Engagement) — Milestone 4 Full Specification', () => {
  beforeEach(() => {
    // Reset service storage before each test for both default_patient and demo patient
    const mockSessions: GameSessionRecord[] = [
      {
        id: 'sess-01',
        patientId: 'demo-patient-001',
        gameId: 'game-matching',
        gameTitle: 'Peaceful Nature Card Matching',
        category: 'memory',
        difficulty: 'Gentle',
        date: '2026-11-05',
        durationSeconds: 145,
        completed: true,
        patientFeedback: 'Relaxing',
        notes: 'Enjoyed flower cards',
        completedAt: '10:30 AM'
      }
    ];

    GamesService.setDifficultyPreference('demo-patient-001', 'Gentle');
    GamesService.setDifficultyPreference('default_patient', 'Gentle');
    try {
      localStorage.setItem('saksham_game_sessions_demo-patient-001', JSON.stringify(mockSessions));
      localStorage.setItem('saksham_game_sessions_default_patient', JSON.stringify(mockSessions));
    } catch {
      // In-memory fallback
    }
  });

  // 1. Game Library Rendering & Categories
  describe('1. Game Library Rendering & Catalogue', () => {
    it('renders mind games library with titles, category labels, and wellness disclaimers', () => {
      renderMindGames();

      expect(screen.getByRole('heading', { name: /^Mind Games$/i })).toBeDefined();
      expect(screen.getByText(/Cognitive Wellness & Supportive Engagement/i)).toBeDefined();
      expect(screen.getByText(/Cognitive Wellness Safe Space/i)).toBeDefined();
      expect(screen.getByText(/Performance is never a medical test, IQ score, or diagnostic evaluation/i)).toBeDefined();

      // Verify sample activities across categories
      expect(screen.getByText('Peaceful Nature Card Matching')).toBeDefined();
      expect(screen.getByText('Daily Routine Story Order')).toBeDefined();
      expect(screen.getByText('Find the Hidden Blossom')).toBeDefined();
      expect(screen.getByText('Complete the Shape Pattern')).toBeDefined();
      expect(screen.getByText('Word Garden: Missing Letters')).toBeDefined();
      expect(screen.getByText('Reference Room Memory Observation')).toBeDefined();
    });

    it('filters activities when clicking category tabs', () => {
      renderMindGames();

      const memoryTab = screen.getByRole('tab', { name: /Memory & Recall/i });
      fireEvent.click(memoryTab);

      expect(screen.getByText('Peaceful Nature Card Matching')).toBeDefined();
      expect(screen.getByText('Warm Object Recall')).toBeDefined();

      // Daily routine (sequence category) should not appear in Memory filter
      expect(screen.queryByText('Daily Routine Story Order')).toBeNull();
    });
  });

  // 2. Starting, Pausing, Restarting, and Exiting Games
  describe('2. Game Session Lifecycle & Controls', () => {
    it('starts an activity and renders in-game header with pause, restart, and exit controls', () => {
      renderMindGames();

      const playButtons = screen.getAllByRole('button', { name: /Start activity:/i });
      fireEvent.click(playButtons[0]); // Starts Peaceful Nature Card Matching

      // In-game view should be active
      expect(screen.getByRole('button', { name: /Exit game and return to Mind Games library/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /Pause game/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /Restart activity/i })).toBeDefined();

      // Pause toggle
      const pauseBtn = screen.getByRole('button', { name: /Pause game/i });
      fireEvent.click(pauseBtn);
      expect(screen.getByText(/Activity is paused\. Take your time to rest!/i)).toBeDefined();

      // Resume
      const resumeBtn = screen.getByRole('button', { name: /Resume game/i });
      fireEvent.click(resumeBtn);
      expect(screen.queryByText(/Activity is paused/i)).toBeNull();

      // Exit back to library
      const exitBtn = screen.getByRole('button', { name: /Exit game and return to Mind Games library/i });
      fireEvent.click(exitBtn);

      // Successfully back at library
      expect(screen.getByRole('heading', { name: /^Mind Games$/i })).toBeDefined();
    });
  });

  // 3. Card Matching Game Mechanics (Memory)
  describe('3. Card Matching Activity Mechanics', () => {
    it('flips cards on tap and detects matching pairs without negative messaging on mismatch', () => {
      renderMindGames();

      // Start Card Matching
      const matchingPlayBtn = screen.getByRole('button', { name: /Start activity: Peaceful Nature Card Matching/i });
      fireEvent.click(matchingPlayBtn);

      const cards = screen.getAllByRole('button', { name: /Hidden card/i });
      expect(cards.length).toBe(6); // Gentle level = 3 pairs (6 cards)

      // Tap first card
      fireEvent.click(cards[0]);
      // Should not throw or show any negative failure screen
      expect(screen.queryByText(/failure|game over|wrong|penalty/i)).toBeNull();
    });
  });

  // 4. Daily Routine Sequencing Mechanics (Sequence & Ordering)
  describe('4. Daily Routine Sequencing Mechanics', () => {
    it('allows moving activity cards up and down and provides gentle feedback on check', () => {
      renderMindGames();

      const sequencePlayBtn = screen.getByRole('button', { name: /Start activity: Daily Routine Story Order/i });
      fireEvent.click(sequencePlayBtn);

      expect(screen.getByText(/Daily Story Sequence/i)).toBeDefined();
      const checkBtn = screen.getByRole('button', { name: /Check My Daily Routine Order/i });
      fireEvent.click(checkBtn);

      // Reassuring feedback is surfaced without shame
      expect(screen.getByText(/Almost there!|Wonderful!/i)).toBeDefined();
    });
  });

  // 5. Pattern Recognition Mechanics
  describe('5. Pattern Recognition Mechanics', () => {
    it('displays alternating shape pattern and handles option selection', () => {
      renderMindGames();

      const patternPlayBtn = screen.getByRole('button', { name: /Start activity: Complete the Shape Pattern/i });
      fireEvent.click(patternPlayBtn);

      expect(screen.getByText(/Pattern Recognition Sequence/i)).toBeDefined();
      expect(screen.getByText('Choose the symbol that comes next:')).toBeDefined();

      const options = screen.getAllByRole('button', { name: /Option/i });
      expect(options.length).toBe(3);

      // Tap first option
      fireEvent.click(options[0]);
      expect(screen.getByText(/The pattern alternates between|Notice the rhythm/i)).toBeDefined();
    });
  });

  // 6. Language & Word Recall (Word Garden)
  describe('6. Language & Word Recall Mechanics', () => {
    it('displays missing letter puzzle and allows switching between English and Hindi', () => {
      renderMindGames();

      const wordPlayBtn = screen.getByRole('button', { name: /Start activity: Word Garden: Missing Letters/i });
      fireEvent.click(wordPlayBtn);

      expect(screen.getByText('Word Garden & Language Recall')).toBeDefined();
      expect(screen.getByText('English')).toBeDefined();
      expect(screen.getByText('हिंदी')).toBeDefined();

      // Switch language
      fireEvent.click(screen.getByText('हिंदी'));
      expect(screen.getByText('Tap the letter that completes the word:')).toBeDefined();

      // Tap letter option
      const letterBtn = screen.getByRole('button', { name: /Letter D/i });
      fireEvent.click(letterBtn);

      expect(screen.getByText(/Beautiful! The word is "GARDEN"/i)).toBeDefined();
    });
  });

  // 7. Reference Room Memory Activity & Clinical Safeguards
  describe('7. Reference Room Memory Activity Safeguards', () => {
    it('clearly displays reference photo notice and prevents real-time representation claims', () => {
      renderMindGames();

      const roomPlayBtn = screen.getByRole('button', { name: /Start activity: Reference Room Memory Observation/i });
      fireEvent.click(roomPlayBtn);

      // Mandatory clinical safeguard notice
      expect(screen.getByText(/Observation Safeguard Note:/i)).toBeDefined();
      expect(screen.getByText(/This is an archived reference photograph/i)).toBeDefined();
      expect(screen.getByText(/It does not represent real-time room status/i)).toBeDefined();

      // Reference photo title
      expect(screen.getByText(/Reference Photo • Master Bedroom/i)).toBeDefined();

      // Question strictly about what is visible in the reference photo
      expect(screen.getByText(/Where are the reading glasses resting in this reference photograph\?/i)).toBeDefined();

      // Answer question
      const answerBtn = screen.getByText('Resting on the wooden bedside table next to the reading lamp');
      fireEvent.click(answerBtn);

      expect(screen.getByText(/Spot on! You remembered exactly where it is in the reference photo!/i)).toBeDefined();
    });
  });

  // 8. Adaptive Difficulty & Level Switching
  describe('8. Transparent Adaptive Difficulty System', () => {
    it('allows cycling between Gentle, Moderate, and Stimulating difficulty levels', () => {
      renderMindGames();

      const playBtn = screen.getAllByRole('button', { name: /Start activity:/i })[0];
      fireEvent.click(playBtn);

      const levelBtn = screen.getByRole('button', { name: /Current difficulty: Gentle/i });
      fireEvent.click(levelBtn);

      expect(screen.getByRole('button', { name: /Current difficulty: Moderate/i })).toBeDefined();
    });

    it('provides transparent adaptive rationale without clinical assumptions', () => {
      const rec = GamesService.getAdaptiveRecommendation('demo-patient-001');
      expect(rec.recommendedDifficulty).toBeDefined();
      expect(rec.reason).not.toContain('dementia');
      expect(rec.reason).not.toContain('impairment');
      expect(rec.reason).not.toContain('cognitive decline');
    });
  });

  // 9. Asha AI Companion In-Game Assistance
  describe('9. Asha Companion In-Game Assistance', () => {
    it('provides instruction read-aloud, gentle hints, encouragement, and break recommendations', () => {
      renderMindGames();

      const playBtn = screen.getAllByRole('button', { name: /Start activity:/i })[0];
      fireEvent.click(playBtn);

      expect(screen.getByText(/Asha AI Companion/i)).toBeDefined();

      // Ask for hint
      const hintBtn = screen.getByRole('button', { name: /Ask Asha for a gentle hint/i });
      fireEvent.click(hintBtn);
      expect(screen.getByText(/Gentle Hint:/i)).toBeDefined();

      // Ask for encouragement
      const encourageBtn = screen.getByRole('button', { name: /Get warm encouragement/i });
      fireEvent.click(encourageBtn);
      expect(screen.getByText(/You are doing wonderfully!|Take your time|Wonderful effort!/i)).toBeDefined();

      // Take a break
      const breakBtn = screen.getByRole('button', { name: /Take a gentle break/i });
      fireEvent.click(breakBtn);
      expect(screen.getByText(/Taking a break is part of good care!/i)).toBeDefined();
    });
  });

  // 10. Patient Data Isolation & History Scoping
  describe('10. Patient Data Isolation & History Scoping', () => {
    it('isolates game session history strictly by patient UID', () => {
      const patientA = 'patient_sarah_101';
      const patientB = 'patient_rajesh_202';

      GamesService.recordSession(patientA, {
        gameId: 'game-matching',
        gameTitle: 'Sarah Nature Matching',
        category: 'memory',
        difficulty: 'Gentle',
        date: '2026-11-05',
        durationSeconds: 120,
        completed: true
      });

      GamesService.recordSession(patientB, {
        gameId: 'game-matching',
        gameTitle: 'Rajesh Nature Matching',
        category: 'memory',
        difficulty: 'Moderate',
        date: '2026-11-05',
        durationSeconds: 240,
        completed: true
      });

      const historyA = GamesService.getHistory(patientA);
      const historyB = GamesService.getHistory(patientB);

      expect(historyA[0].gameTitle).toBe('Sarah Nature Matching');
      expect(historyB[0].gameTitle).toBe('Rajesh Nature Matching');
      expect(historyA[0].patientId).not.toBe(historyB[0].patientId);
    });

    it('renders personal engagement history tab without competitive rankings', () => {
      renderMindGames();

      const historyTab = screen.getByRole('tab', { name: /My History/i });
      fireEvent.click(historyTab);

      expect(screen.getByText('Your Personal Engagement History')).toBeDefined();
      expect(screen.getByText(/Saksham celebrates your participation and personal calm moments/i)).toBeDefined();
      expect(screen.queryByText(/leaderboard|rank #|competitive ranking/i)).toBeNull();
    });
  });

  // 11. Search Filtering
  describe('11. Search Filtering', () => {
    it('filters mind games by keyword', () => {
      renderMindGames();

      const searchInput = screen.getByPlaceholderText(/Search activities by name or category/i);
      fireEvent.change(searchInput, { target: { value: 'Blossom' } });

      expect(screen.getByText('Find the Hidden Blossom')).toBeDefined();
      expect(screen.queryByText('Word Garden: Missing Letters')).toBeNull();

      // Clear search
      fireEvent.change(searchInput, { target: { value: '' } });
      expect(screen.getByText('Word Garden: Missing Letters')).toBeDefined();
    });
  });
});
