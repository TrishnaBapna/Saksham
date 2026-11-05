import React from 'react';
import { LovedOne } from '../../../types/index.js';
import { Heart, Volume2, Sparkles, ChevronRight, User } from 'lucide-react';

interface FamilyMemberCardProps {
  member: LovedOne;
  isPlayingVoice: boolean;
  onSelect: () => void;
  onPlayVoice: (e: React.MouseEvent) => void;
  onOpenCues: (e: React.MouseEvent) => void;
}

export const FamilyMemberCard: React.FC<FamilyMemberCardProps> = ({
  member,
  isPlayingVoice,
  onSelect,
  onPlayVoice,
  onOpenCues
}) => {
  return (
    <div
      onClick={onSelect}
      className="group bg-white rounded-3xl p-5 border border-purple-100 shadow-soft-purple hover:shadow-elevated transition-all duration-200 cursor-pointer relative overflow-hidden"
      role="article"
      aria-label={`Family member: ${member.name}, ${member.relationship}`}
    >
      <div className="flex items-start space-x-4">
        {/* Photo Container with Fallback */}
        <div className="relative flex-shrink-0">
          {member.photoUrl ? (
            <img
              src={member.photoUrl}
              alt={member.name}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-purple-200 shadow-xs group-hover:border-purple-400 transition"
              onError={(e) => {
                // Graceful fallback to UI avatar
                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  member.name
                )}&background=8b5cf6&color=ffffff&size=200`;
              }}
            />
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600 border-2 border-purple-200">
              <User className="w-10 h-10" />
            </div>
          )}

          <span className="absolute -bottom-1 -right-1 bg-rose-500 text-white p-1 rounded-full shadow-2xs">
            <Heart className="w-3.5 h-3.5 fill-white" />
          </span>
        </div>

        {/* Identity & Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <h3 className="text-base sm:text-lg font-bold text-saksham-darkText truncate group-hover:text-purple-700 transition">
              {member.name}
            </h3>
            <span className="text-[11px] font-bold text-purple-800 bg-lavender-100 px-2.5 py-0.5 rounded-full border border-purple-200">
              {member.relationship}
            </span>
          </div>

          {member.nickname && (
            <p className="text-[11px] text-purple-600 font-semibold mt-0.5">
              Also known as "{member.nickname}"
            </p>
          )}

          <p className="text-xs text-gray-600 mt-1 line-clamp-2 leading-relaxed">
            {member.description}
          </p>

          {/* Familiar Phrase / Memory Cue Badge */}
          {member.familiarPhrase && (
            <div className="mt-2 text-[11px] text-purple-800 bg-purple-50/80 px-2.5 py-1 rounded-xl border border-purple-100 inline-block font-medium truncate max-w-full">
              💬 "{member.familiarPhrase}"
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="mt-4 pt-3.5 border-t border-purple-100 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          {/* Voice Note Button */}
          {(member.voiceRecording || member.audioNote) && (
            <button
              onClick={onPlayVoice}
              className={`inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition shadow-2xs ${
                isPlayingVoice
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'bg-lavender-100 text-purple-900 hover:bg-lavender-200'
              }`}
              title="Listen to voice message"
              aria-label={isPlayingVoice ? `Pause voice message from ${member.name}` : `Listen to voice message from ${member.name}`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>{isPlayingVoice ? 'Playing...' : 'Voice Note'}</span>
              {member.voiceRecording?.durationSeconds && (
                <span className="text-[10px] opacity-80">({member.voiceRecording.durationSeconds}s)</span>
              )}
            </button>
          )}

          {/* Gentle Cues Button */}
          <button
            onClick={onOpenCues}
            className="inline-flex items-center space-x-1 px-3 py-2 rounded-xl text-xs font-bold bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 transition shadow-2xs"
            title="Explore gentle memory cues"
            aria-label={`Explore gentle memory cues for ${member.name}`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-500" />
            <span>Gentle Cues</span>
          </button>
        </div>

        {/* View Profile Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className="flex items-center space-x-1 text-xs font-bold text-purple-700 hover:text-purple-900 group-hover:translate-x-1 transition-transform cursor-pointer"
          aria-label={`View full memory profile for ${member.name}`}
        >
          <span>View Profile</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
