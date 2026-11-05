import { WhitelistedAction } from '../types/index.js';

export interface AIResponse {
  speech: string;
  characterState: 'greeting' | 'listening' | 'speaking' | 'thinking' | 'happy' | 'reminder' | 'encouraging';
  suggestedAction?: {
    action: WhitelistedAction;
    targetId?: string;
    description: string;
  };
}

const PERMITTED_ACTIONS: WhitelistedAction[] = [
  'NAVIGATE_HOME',
  'NAVIGATE_ROUTINES',
  'NAVIGATE_LOVED_ONES',
  'NAVIGATE_MIND_GAMES',
  'NAVIGATE_ROOM_MEMORY',
  'TRIGGER_ROUTINE_REMINDER',
  'SHOW_FAMILY_MEMBER',
  'TRIGGER_ASSISTANCE_TRAY'
];

export const parseAIIntentLocally = (transcript: string): AIResponse => {
  const query = transcript.trim().toLowerCase();

  if (query.includes('game') || query.includes('play') || query.includes('puzzle') || query.includes('matching')) {
    return {
      speech: "Of course! Let's play a friendly memory game together.",
      characterState: 'happy',
      suggestedAction: {
        action: 'NAVIGATE_MIND_GAMES',
        description: 'Open Mind Games'
      }
    };
  }

  if (query.includes('11') || query.includes('eleven') || query.includes('schedule') || query.includes('what should i do') || query.includes('routine') || query.includes('task')) {
    return {
      speech: "You have your morning hydration and gentle stretches scheduled at 11:00 AM. Let's look at your daily routine.",
      characterState: 'reminder',
      suggestedAction: {
        action: 'NAVIGATE_ROUTINES',
        description: 'Open Daily Routines'
      }
    };
  }

  if (query.includes('daughter') || query.includes('family') || query.includes('son') || query.includes('loved one') || query.includes('see my') || query.includes('photo')) {
    return {
      speech: "Here is your Loved Ones gallery. You can see your family pictures and hear their sweet voice messages.",
      characterState: 'encouraging',
      suggestedAction: {
        action: 'NAVIGATE_LOVED_ONES',
        description: 'Open Loved Ones Gallery'
      }
    };
  }

  if (query.includes('glasses') || query.includes('keys') || query.includes('where did i keep') || query.includes('where is') || query.includes('room') || query.includes('lost')) {
    return {
      speech: "Let's check your bedroom photograph together to see where you last kept your glasses.",
      characterState: 'thinking',
      suggestedAction: {
        action: 'NAVIGATE_ROOM_MEMORY',
        description: 'Open Room Memory Game'
      }
    };
  }

  if (query.includes('help') || query.includes('hint') || query.includes('assist') || query.includes('stuck')) {
    return {
      speech: "I am right here with you! Let's open your gentle assistance tray with 3 helpful clues.",
      characterState: 'encouraging',
      suggestedAction: {
        action: 'TRIGGER_ASSISTANCE_TRAY',
        description: 'Open 3-Chance Assisted Recall'
      }
    };
  }

  // Empathetic conversational response
  return {
    speech: "I am right here with you! Would you like to check your 11 AM activity, see your family album, or play a gentle game?",
    characterState: 'speaking'
  };
};

export const queryAICompanion = async (
  transcript: string,
  _currentScreen = 'home',
  _language = 'en'
): Promise<AIResponse> => {
  const backendUrl = import.meta.env.VITE_BACKEND_API_URL;

  if (backendUrl && !backendUrl.includes('placeholder')) {
    try {
      const response = await fetch(`${backendUrl}/ai/converse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, currentScreen: _currentScreen, language: _language })
      });

      if (response.ok) {
        const payload = await response.json();
        if (payload.data) {
          // Validate suggestedAction against whitelist
          if (
            payload.data.suggestedAction &&
            !PERMITTED_ACTIONS.includes(payload.data.suggestedAction.action)
          ) {
            delete payload.data.suggestedAction;
          }
          return payload.data;
        }
      }
    } catch {
      console.warn('Backend AI service unreachable. Falling back to local offline intent parser.');
    }
  }

  // Graceful offline fallback
  return parseAIIntentLocally(transcript);
};
