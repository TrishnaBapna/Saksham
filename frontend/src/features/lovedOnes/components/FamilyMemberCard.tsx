import React from 'react';
import { LovedOne } from '../../../types/index.js';
import { Heart, Volume2, Sparkles, ChevronRight, User, Phone, MessageCircle } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext.js';
import { getTranslatedRelationship } from '../utils/relationshipTranslation.js';
import { getLocalizedLovedOneFields } from '../utils/lovedOneTranslation.js';

interface FamilyMemberCardProps {
  member: LovedOne;
  isPlayingVoice: boolean;
  onSelect: () => void;
  onPlayVoice: (e: React.MouseEvent) => void;
  onOpenCues: (e: React.MouseEvent) => void;
  userRole?: string;
}

export const FamilyMemberCard: React.FC<FamilyMemberCardProps> = ({
  member,
  isPlayingVoice,
  onSelect,
  onPlayVoice,
  onOpenCues,
  userRole = 'patient'
}) => {
  const { t, language } = useLanguage();
  const shortLang = (language || 'en').toLowerCase().split('-')[0];
  const cardUi = ({
    en: {
      familyMember: 'Family member:',
      whatsapp: 'WhatsApp',
      pauseVoice: 'Pause voice message from',
      listenVoice: 'Listen to voice message from',
      exploreCues: 'Explore gentle memory cues for',
      viewFull: 'View full memory profile for',
    },
    hi: {
      familyMember: 'परिवार सदस्य:',
      whatsapp: 'व्हाट्सएप',
      pauseVoice: 'वॉयस संदेश रोकें:',
      listenVoice: 'वॉयस संदेश सुनें:',
      exploreCues: 'स्मृति संकेत देखें:',
      viewFull: 'पूरा प्रोफ़ाइल देखें:',
    },
    mr: {
      familyMember: 'कुटुंब सदस्य:',
      whatsapp: 'व्हॉट्सअॅप',
      pauseVoice: 'व्हॉइस संदेश थांबवा:',
      listenVoice: 'व्हॉइस संदेश ऐका:',
      exploreCues: 'स्मृती खुणा पहा:',
      viewFull: 'संपूर्ण प्रोफाइल पहा:',
    },
    bn: {
      familyMember: 'পরিবারের সদস্য:',
      whatsapp: 'হোয়াটসঅ্যাপ',
      pauseVoice: 'ভয়েস বার্তা থামান:',
      listenVoice: 'ভয়েস বার্তা শুনুন:',
      exploreCues: 'স্মৃতি সূত্র দেখুন:',
      viewFull: 'সম্পূর্ণ প্রোফাইল দেখুন:',
    },
    ta: {
      familyMember: 'குடும்ப உறுப்பினர்:',
      whatsapp: 'வாட்ஸ்அப்',
      pauseVoice: 'குரல் பதிவை நிறுத்து:',
      listenVoice: 'குரல் பதிவைக் கேளுங்கள்:',
      exploreCues: 'மென்மையான நினைவுக் குறிப்புகள்:',
      viewFull: 'முழு சுயவிவரத்தைப் பார்:',
    },
    te: {
      familyMember: 'కుటుంబ సభ్యులు:',
      whatsapp: 'వాట్సాప్',
      pauseVoice: 'వాయిస్ సందేశం ఆపండి:',
      listenVoice: 'వాయిస్ సందేశం వినండి:',
      exploreCues: 'జ్ఞాపక సూచనలు చూడండి:',
      viewFull: 'పూర్తి ప్రొఫైల్ చూడండి:',
    },
    kn: {
      familyMember: 'ಕುಟುಂಬ ಸದಸ್ಯರು:',
      whatsapp: 'ವಾಟ್ಸಾಪ್',
      pauseVoice: 'ಧ್ವನಿ ಸಂದೇಶ ನಿಲ್ಲಿಸಿ:',
      listenVoice: 'ಧ್ವನಿ ಸಂದೇಶ ಕೇಳಿ:',
      exploreCues: 'ನೆನಪಿನ ಸುಳಿವುಗಳು ನೋಡಿ:',
      viewFull: 'ಸಂಪೂರ್ಣ ಪ್ರೊಫೈಲ್ ನೋಡಿ:',
    },
  } as Record<string, Record<string, string>>)[shortLang] || {
    familyMember: 'Family member:',
    whatsapp: 'WhatsApp',
    pauseVoice: 'Pause voice message from',
    listenVoice: 'Listen to voice message from',
    exploreCues: 'Explore gentle memory cues for',
    viewFull: 'View full memory profile for',
  };
  const canContact = userRole !== 'doctor';
  const effectivePhone = member.phoneNumber || member.phone;
  const effectiveWhatsApp = member.whatsappNumber || effectivePhone;

  // Translate relationship and system-seeded demo descriptions accurately while preserving Category C data
  const translatedRel = getTranslatedRelationship(member.relationship, t);
  const localized = getLocalizedLovedOneFields(member, t);
  return (
    <div
      onClick={onSelect}
      className="group bg-white rounded-3xl p-5 border border-purple-100 shadow-soft-purple hover:shadow-elevated transition-all duration-200 cursor-pointer relative overflow-hidden"
      role="article"
      aria-label={`${cardUi.familyMember} ${member.name}, ${translatedRel}`}
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
              {translatedRel}
            </span>
          </div>

          {member.nickname && (
            <p className="text-[11px] text-purple-600 font-semibold mt-0.5">
              {t('loved_ones.also_known_as', { nickname: member.nickname })}
            </p>
          )}

          <p className="text-xs text-gray-600 mt-1 line-clamp-2 leading-relaxed">
            {localized.description}
          </p>

          {/* Familiar Phrase / Memory Cue Badge */}
          {localized.familiarPhrase && (
            <div className="mt-2 text-[11px] text-purple-800 bg-purple-50/80 px-2.5 py-1 rounded-xl border border-purple-100 inline-block font-medium truncate max-w-full">
              💬 "{localized.familiarPhrase}"
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="mt-4 pt-3.5 border-t border-purple-100 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Direct Phone Call Button */}
          {canContact && effectivePhone && (
            <a
              href={`tel:${effectivePhone.replace(/[^0-9+]/g, '')}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center space-x-1 px-3 py-2 rounded-xl text-xs font-bold bg-teal-50 border border-teal-200 text-teal-800 hover:bg-teal-100 transition shadow-2xs min-h-[36px]"
              title={t('loved_ones.call_member', { name: member.name })}
              aria-label={t('loved_ones.call_member', { name: member.name })}
            >
              <Phone className="w-3.5 h-3.5 text-teal-600" />
              <span>{t('loved_ones.call')}</span>
            </a>
          )}

          {/* Direct WhatsApp Button */}
          {canContact && effectiveWhatsApp && (
            <a
              href={`https://wa.me/${effectiveWhatsApp.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center space-x-1 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 transition shadow-2xs min-h-[36px]"
              title={t('loved_ones.whatsapp_member', { name: member.name })}
              aria-label={t('loved_ones.whatsapp_member', { name: member.name })}
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>{cardUi.whatsapp}</span>
            </a>
          )}

          {/* Voice Note Button */}
          {(member.voiceRecording || member.audioNote) && (
            <button
              onClick={onPlayVoice}
              className={`inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition shadow-2xs min-h-[36px] ${
                isPlayingVoice
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'bg-lavender-100 text-purple-900 hover:bg-lavender-200'
              }`}
              title={t('loved_ones.listen_voice')}
              aria-label={isPlayingVoice ? `${cardUi.pauseVoice} ${member.name}` : `${cardUi.listenVoice} ${member.name}`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>{isPlayingVoice ? t('common.loading') : t('loved_ones.listen_voice')}</span>
              {member.voiceRecording?.durationSeconds && (
                <span className="text-[10px] opacity-80">({member.voiceRecording.durationSeconds}s)</span>
              )}
            </button>
          )}

          {/* Gentle Cues Button */}
          <button
            onClick={onOpenCues}
            className="inline-flex items-center space-x-1 px-3 py-2 rounded-xl text-xs font-bold bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 transition shadow-2xs min-h-[36px]"
            title={t('loved_ones.gentle_cues')}
            aria-label={`${cardUi.exploreCues} ${member.name}`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-500" />
            <span>{t('loved_ones.gentle_cues')}</span>
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
          aria-label={`${cardUi.viewFull} ${member.name}`}
        >
          <span>{t('loved_ones.view_profile')}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
