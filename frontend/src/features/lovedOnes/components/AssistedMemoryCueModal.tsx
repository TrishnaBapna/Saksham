import React, { useState } from 'react';
import { LovedOne } from '../../../types/index.js';
import { SpeechService } from '../../../services/speechService.js';
import {
  Sparkles,
  HelpCircle,
  Volume2,
  Heart,
  Smile,
  X,
  ChevronRight,
  RotateCcw,
  VolumeX
} from 'lucide-react';

interface AssistedMemoryCueModalProps {
  lovedOne: LovedOne;
  onClose: () => void;
  onPlayVoiceNote?: () => void;
}

export const AssistedMemoryCueModal: React.FC<AssistedMemoryCueModalProps> = ({
  lovedOne,
  onClose,
  onPlayVoiceNote
}) => {
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [revealedHints, setRevealedHints] = useState<Record<number, boolean>>({});
  const [isSpeaking, setIsSpeaking] = useState(false);

  const prompts = [
    {
      id: 'who',
      title: 'Who is this familiar person?',
      subtext: 'Take a gentle look at the photograph. Do you recognize their smile?',
      revealedTitle: `This is ${lovedOne.name}${lovedOne.nickname ? ` (often called "${lovedOne.nickname}")` : ''}`,
      hintText: lovedOne.familiarPhrase
        ? `They often greet you saying: "${lovedOne.familiarPhrase}"`
        : `They are someone very special in your life who loves you dearly.`,
      icon: Smile,
      badge: 'Identity Cue'
    },
    {
      id: 'relationship',
      title: 'What is your loving connection with them?',
      subtext: 'Think about how this person fits into your family or life.',
      revealedTitle: `${lovedOne.name} is your ${lovedOne.relationship}`,
      hintText: lovedOne.cues && lovedOne.cues.length > 0
        ? `Remember: ${lovedOne.cues[0]}`
        : `They visit and check in on you with all their heart.`,
      icon: Heart,
      badge: 'Family Connection'
    },
    {
      id: 'activities',
      title: 'What do you enjoy doing together?',
      subtext: 'Think about quiet afternoons, warm cups of tea, or favorite pastimes.',
      revealedTitle: `Things you both love enjoying together`,
      hintText: lovedOne.favouriteActivities && lovedOne.favouriteActivities.length > 0
        ? lovedOne.favouriteActivities.join(' • ')
        : (lovedOne.description || 'Spending peaceful time together talking and sharing stories.'),
      icon: Sparkles,
      badge: 'Shared Joy'
    },
    {
      id: 'voice',
      title: 'Would you like to hear their voice?',
      subtext: 'Listening to a loved one’s voice can bring deep comfort and calm.',
      revealedTitle: lovedOne.voiceRecording
        ? `Voice message from ${lovedOne.voiceRecording.speakerName}`
        : `Voice note from ${lovedOne.name}`,
      hintText: lovedOne.voiceRecording?.transcript
        ? `"${lovedOne.voiceRecording.transcript}"`
        : (lovedOne.audioNote || 'A warm message recorded just for you.'),
      icon: Volume2,
      badge: 'Voice Memory',
      isVoicePrompt: true
    }
  ];

  const currentPrompt = prompts[currentPromptIndex];
  const isCurrentRevealed = !!revealedHints[currentPromptIndex];

  const handleReveal = () => {
    setRevealedHints((prev) => ({ ...prev, [currentPromptIndex]: true }));
    // Gently read the hint aloud
    SpeechService.speak(
      `${currentPrompt.revealedTitle}. ${currentPrompt.hintText}`,
      () => setIsSpeaking(true),
      () => setIsSpeaking(false)
    );
  };

  const handleReadQuestion = () => {
    if (isSpeaking) {
      SpeechService.cancelSpeech();
      setIsSpeaking(false);
      return;
    }
    const textToRead = isCurrentRevealed
      ? `${currentPrompt.revealedTitle}. ${currentPrompt.hintText}`
      : `${currentPrompt.title}. ${currentPrompt.subtext}`;

    SpeechService.speak(
      textToRead,
      () => setIsSpeaking(true),
      () => setIsSpeaking(false)
    );
  };

  const handleNextPrompt = () => {
    SpeechService.cancelSpeech();
    setIsSpeaking(false);
    if (currentPromptIndex < prompts.length - 1) {
      setCurrentPromptIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const handleSkipPrompt = () => {
    SpeechService.cancelSpeech();
    setIsSpeaking(false);
    if (currentPromptIndex < prompts.length - 1) {
      setCurrentPromptIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const handleResetPrompts = () => {
    SpeechService.cancelSpeech();
    setIsSpeaking(false);
    setCurrentPromptIndex(0);
    setRevealedHints({});
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label="Assisted Memory Cues"
    >
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-purple-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-700 via-purple-600 to-pink-600 text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-yellow-200" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Gentle Memory Cues</h2>
              <p className="text-xs text-purple-100">
                Exploring memories of {lovedOne.name} • No test, take your time
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
            aria-label="Close memory cues modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Person Mini Card */}
        <div className="bg-lavender-50 px-6 py-3.5 border-b border-purple-100 flex items-center space-x-3">
          <img
            src={lovedOne.photoUrl}
            alt={lovedOne.name}
            className="w-12 h-12 rounded-2xl object-cover border-2 border-purple-300 shadow-xs"
          />
          <div>
            <div className="text-xs font-bold text-saksham-darkText">
              {lovedOne.name}
            </div>
            <div className="text-[11px] text-purple-700 font-semibold">
              {lovedOne.relationship}
            </div>
          </div>
          <div className="ml-auto flex items-center space-x-1">
            <span className="text-[11px] font-bold text-purple-800 bg-white px-2.5 py-1 rounded-full border border-purple-200 shadow-2xs">
              Cue {currentPromptIndex + 1} of {prompts.length}
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Question Card */}
          <div className="bg-gradient-to-br from-purple-50/70 to-pink-50/60 rounded-3xl p-5 border border-purple-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center space-x-1 text-xs font-bold text-purple-800 bg-purple-100/80 px-2.5 py-1 rounded-full">
                <currentPrompt.icon className="w-3.5 h-3.5 text-purple-600" />
                <span>{currentPrompt.badge}</span>
              </span>

              <button
                onClick={handleReadQuestion}
                className={`p-2 rounded-xl transition ${
                  isSpeaking
                    ? 'bg-purple-600 text-white animate-pulse'
                    : 'bg-white text-purple-700 hover:bg-purple-100 border border-purple-200'
                }`}
                title="Read aloud"
                aria-label={isSpeaking ? 'Stop speaking' : 'Read question aloud'}
              >
                {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>

            <h3 className="text-base md:text-lg font-bold text-saksham-darkText leading-snug">
              {currentPrompt.title}
            </h3>
            <p className="text-xs md:text-sm text-gray-600 mt-1.5 leading-relaxed">
              {currentPrompt.subtext}
            </p>

            {/* Revealed Hint Box */}
            {isCurrentRevealed ? (
              <div className="mt-4 bg-white rounded-2xl p-4 border border-purple-200 shadow-sm animate-fadeIn space-y-2">
                <div className="flex items-center space-x-2 text-purple-800 font-bold text-sm">
                  <Smile className="w-4 h-4 text-emerald-600" />
                  <span>{currentPrompt.revealedTitle}</span>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed pl-6">
                  {currentPrompt.hintText}
                </p>

                {currentPrompt.isVoicePrompt && onPlayVoiceNote && (
                  <button
                    onClick={() => {
                      onPlayVoiceNote();
                      onClose();
                    }}
                    className="mt-2 w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-xs transition"
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>Play {lovedOne.name}’s Voice Message</span>
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={handleReveal}
                className="mt-4 inline-flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-white border border-purple-300 text-purple-800 text-xs font-bold hover:bg-purple-50 transition shadow-2xs"
              >
                <HelpCircle className="w-4 h-4 text-purple-600" />
                <span>Show Gentle Hint</span>
              </button>
            )}
          </div>

          {/* Reassuring Asha Note */}
          <div className="bg-white rounded-2xl p-3.5 border border-purple-100 flex items-start space-x-3 text-xs text-purple-900 shadow-2xs">
            <span className="text-lg">🌸</span>
            <div className="leading-relaxed">
              <span className="font-bold text-purple-950">Asha’s Gentle Note:</span>{' '}
              "It is completely okay if names or memories take time. Love and warmth stay in the heart, always."
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-lavender-50 px-6 py-4 border-t border-purple-100 flex items-center justify-between">
          <button
            onClick={handleResetPrompts}
            className="text-xs text-gray-500 hover:text-purple-700 font-semibold flex items-center space-x-1"
            title="Start from beginning"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Start Over</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleSkipPrompt}
              className="px-4 py-2.5 rounded-2xl text-xs font-semibold text-gray-600 hover:bg-purple-100 transition"
            >
              Skip this cue
            </button>

            <button
              onClick={handleNextPrompt}
              className="px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
            >
              <span>{currentPromptIndex === prompts.length - 1 ? 'Finish Exploring' : 'Next Cue'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
