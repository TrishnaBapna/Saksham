import { AIConverseRequest, AIConverseResponse, WhitelistedAction } from '../types/index.js';

const VALID_ACTIONS: WhitelistedAction[] = [
  'NAVIGATE_HOME',
  'NAVIGATE_ROUTINES',
  'NAVIGATE_LOVED_ONES',
  'NAVIGATE_MIND_GAMES',
  'NAVIGATE_ROOM_MEMORY',
  'TRIGGER_ROUTINE_REMINDER',
  'SHOW_FAMILY_MEMBER',
  'TRIGGER_ASSISTANCE_TRAY'
];

export const processAIConversation = async (
  request: AIConverseRequest
): Promise<AIConverseResponse> => {
  const text = (request.transcript || '').trim().toLowerCase();

  // Deterministic intent parsing with strict whitelist
  if (text.includes('game') || text.includes('play') || text.includes('puzzle')) {
    return {
      speech: "Of course! Let's play a friendly memory game together.",
      characterState: 'happy',
      suggestedAction: {
        action: 'NAVIGATE_MIND_GAMES',
        description: 'Open Mind Games'
      }
    };
  }

  if (text.includes('11') || text.includes('eleven') || text.includes('schedule') || text.includes('what should i do') || text.includes('routine')) {
    return {
      speech: "You have a gentle activity scheduled for 11:00 AM. Let's look at your daily routine.",
      characterState: 'reminder',
      suggestedAction: {
        action: 'NAVIGATE_ROUTINES',
        description: 'Open Daily Routines'
      }
    };
  }

  if (text.includes('daughter') || text.includes('family') || text.includes('son') || text.includes('loved one') || text.includes('see my')) {
    return {
      speech: "Let's visit your Loved Ones gallery to see your family photographs and voice messages.",
      characterState: 'encouraging',
      suggestedAction: {
        action: 'NAVIGATE_LOVED_ONES',
        description: 'Open Loved Ones Gallery'
      }
    };
  }

  if (text.includes('glasses') || text.includes('keys') || text.includes('where is') || text.includes('where did i keep') || text.includes('room')) {
    return {
      speech: "Let's check your saved room photographs together to find where you kept that.",
      characterState: 'thinking',
      suggestedAction: {
        action: 'NAVIGATE_ROOM_MEMORY',
        description: 'Open Room Memory'
      }
    };
  }

  if (text.includes('help') || text.includes('stuck') || text.includes('hint') || text.includes('assist')) {
    return {
      speech: "I am right here with you! Let's open your gentle assistance tray for hints.",
      characterState: 'encouraging',
      suggestedAction: {
        action: 'TRIGGER_ASSISTANCE_TRAY',
        description: 'Open Assisted Recall'
      }
    };
  }

  // Friendly conversational fallback
  return {
    speech: "Hello! I am right here with you. Would you like to check your 11 AM routine, see your family photos, or play a game?",
    characterState: 'speaking'
  };
};

export const isActionWhitelisted = (action: string): action is WhitelistedAction => {
  return VALID_ACTIONS.includes(action as WhitelistedAction);
};
