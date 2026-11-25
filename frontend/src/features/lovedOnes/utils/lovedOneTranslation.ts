/**
 * SAKSHAM — Seeded Loved One Content Translation Helper
 * Translates system-seeded demo descriptions, phrases, and cues into the active language
 * while strictly preserving all personal names, nicknames, and user-entered Category C data verbatim.
 */

import { LovedOne } from '../../../types/index.js';

type TranslatorFn = (key: string, params?: Record<string, any>) => string;

function normText(s: string | undefined | null): string {
  return (s || '').replace(/\u2019/g, "'").trim();
}

const SEEDED_TEXT_TO_KEY: Record<string, Record<string, string>> = {
  'loved-01': {
    "Lives nearby in Indiranagar. Visits every Tuesday and Sunday afternoon with home-cooked cardamom kheer.": 'loved_ones.demo_01_desc',
    "Namaste Ma! Time for a warm cup of cardamom tea.": 'loved_ones.demo_01_phrase',
    "Calls you every morning at 9:00 AM without fail": 'loved_ones.demo_01_cue_0',
    "Loves listening to old ghazals and humming along with you": 'loved_ones.demo_01_cue_1',
    "Works as a sustainable landscape architect in Bengaluru": 'loved_ones.demo_01_cue_2',
    "Always wears her grandmother's silver floral earrings": 'loved_ones.demo_01_cue_3',
    "Our family holiday trip to Shimla watching the snow fall": 'loved_ones.demo_01_mem_0',
    "Graduation day celebration at Bangalore University in 2012": 'loved_ones.demo_01_mem_1',
    "Planting the fragrant night-blooming jasmine in your verandah": 'loved_ones.demo_01_mem_2',
    "Sitting in the verandah sipping afternoon tea": 'loved_ones.demo_01_act_0',
    "Looking through old black-and-white family photograph albums": 'loved_ones.demo_01_act_1',
    "Watering the potted balcony tulsi and marigold plants": 'loved_ones.demo_01_act_2',
    "Namaste Ma! It is Ananya. Remember, I am picking you up on Sunday for the temple visit. Love you always!": 'loved_ones.demo_01_audio',
    "Sunday Temple Visit & Afternoon Tea": 'loved_ones.demo_01_rec_title',
    "Namaste Ma! It is Ananya. Just wanted to remind you that I am coming over on Sunday at 3 PM. We will visit the temple and have hot cardamom tea. Love you so much!": 'loved_ones.demo_01_rec_transcript',
    "She loves yellow marigolds. Brings soft warm sweaters in winter.": 'loved_ones.demo_01_notes',
  },
  'loved-02': {
    "Ananya's son. Full of cheerful curiosity, loves showing you his origami paper animals and playing carrom on the verandah.": 'loved_ones.demo_02_desc',
    "Dadi! Look what I made for you today!": 'loved_ones.demo_02_phrase',
    "Loves hearing your bedtime story about the friendly tiger in Shimla": 'loved_ones.demo_02_cue_0',
    "Always asks for a warm hug before school every morning": 'loved_ones.demo_02_cue_1',
    "Studies in 4th grade and plays football": 'loved_ones.demo_02_cue_2',
    "Folds origami animals for your bedside wooden table": 'loved_ones.demo_02_cue_3',
    "Teaching him how to flick carrom counters on your wooden board": 'loved_ones.demo_02_mem_0',
    "His 7th birthday picnic at Cubbon Park under the big banyan tree": 'loved_ones.demo_02_mem_1',
    "Making homemade mango kulfi together in summer": 'loved_ones.demo_02_mem_2',
    "Playing carrom on the sunny verandah table": 'loved_ones.demo_02_act_0',
    "Folding colorful origami birds and paper cranes": 'loved_ones.demo_02_act_1',
    "Listening to you tell childhood stories about Lucknow": 'loved_ones.demo_02_act_2',
    "Dadi! It is Aarav. Look at the paper crane I folded for your bedside table!": 'loved_ones.demo_02_audio',
    "Bedside Paper Crane Voice Note": 'loved_ones.demo_02_rec_title',
    "Dadi! It is Aarav. I folded a brand new turquoise paper crane for your bedside table! Keep it safe until Sunday. Bye Dadi!": 'loved_ones.demo_02_rec_transcript',
    "His favorite sweet is coconut laddoos. He giggles when we play carrom.": 'loved_ones.demo_02_notes',
  },
  'loved-03': {
    "Cardiologist living in New Delhi. Thoughtful and caring, video-calls every Wednesday evening on WhatsApp at 7:00 PM.": 'loved_ones.demo_03_desc',
    "Pranam Maa, how is your blood pressure and rest today?": 'loved_ones.demo_03_phrase',
    "Video-calls you every Wednesday at 7:00 PM without missing": 'loved_ones.demo_03_cue_0',
    "Sends your favorite melt-in-mouth Lucknow revdi sweets in winter": 'loved_ones.demo_03_cue_1',
    "Reminds you gently to drink water and do morning arm stretches": 'loved_ones.demo_03_cue_2',
    "Speaks with a calm, deep, reassuring voice": 'loved_ones.demo_03_cue_3',
    "His medical school convocation in Delhi when you put the stethoscope around his neck": 'loved_ones.demo_03_mem_0',
    "The quiet train journeys from Lucknow to Delhi during holidays": 'loved_ones.demo_03_mem_1',
    "Listening to All India Radio evening classical concerts together": 'loved_ones.demo_03_mem_2',
    "Wednesday evening WhatsApp video conversations": 'loved_ones.demo_03_act_0',
    "Discussing classical Indian music and old radio singers": 'loved_ones.demo_03_act_1',
    "Talking about news from Lucknow and family updates": 'loved_ones.demo_03_act_2',
    "Maa, Vikram here. Hope you are doing your morning arm stretches and drinking enough water. Sending you so much love!": 'loved_ones.demo_03_audio',
    "Wednesday Evening Health & Love Note": 'loved_ones.demo_03_rec_title',
    "Pranam Maa, Vikram here. I hope you are taking your morning tea and doing those gentle arm stretches. Looking forward to our video call on Wednesday. Pranam!": 'loved_ones.demo_03_rec_transcript',
    "Very busy hospital schedule, but always calls at 7 PM sharp on Wednesdays.": 'loved_ones.demo_03_notes',
  },
  'loved-04': {
    "Your dear college friend of 40 years. Shares your passion for gardening, classical ragas, and embroidered cotton sarees.": 'loved_ones.demo_04_desc',
    "Kamala, our jasmine flowers are blooming in Lucknow again!": 'loved_ones.demo_04_phrase',
    "Known each other since college days in Lucknow in 1978": 'loved_ones.demo_04_cue_0',
    "Exchanges cuttings of potted herbs and flower seeds every spring": 'loved_ones.demo_04_cue_1',
    "Sends handwritten greeting postcards on festivals": 'loved_ones.demo_04_cue_2',
    "Shares your love for Pandit Bhimsen Joshi's morning ragas": 'loved_ones.demo_04_cue_3',
    "Sitting in the college library courtyard studying together": 'loved_ones.demo_04_mem_0',
    "Attending the annual music conference in Varanasi": 'loved_ones.demo_04_mem_1',
    "Sharing recipes for winter ginger chai and spiced murabba": 'loved_ones.demo_04_mem_2',
    "Exchanging gardening tips and photos of blooming flowers": 'loved_ones.demo_04_act_0',
    "Reminiscing about college hostel days and professors": 'loved_ones.demo_04_act_1',
    "Listening to morning ragas on cassette recordings": 'loved_ones.demo_04_act_2',
    "Kamala, it is Kavita! Our jasmine plant has bloomed today, just like the ones we used to plant in Lucknow.": 'loved_ones.demo_04_audio',
    "Blooming Jasmine & Garden Update": 'loved_ones.demo_04_rec_title',
    "Kamala, it is Kavita! Our white jasmine plant has bloomed today with twelve flowers! It smells exactly like our Lucknow days. Calling you soon!": 'loved_ones.demo_04_rec_transcript',
    "Her birthday is in October. She loves white jasmine and light pink sarees.": 'loved_ones.demo_04_notes',
  },
};

export function getTranslatedLovedOneField(
  memberId: string | undefined,
  rawText: string | undefined | null,
  t: TranslatorFn
): string {
  if (!rawText) return '';
  if (!memberId) return rawText;
  const table = SEEDED_TEXT_TO_KEY[memberId];
  if (!table) return rawText;
  const key = table[normText(rawText)];
  if (!key) return rawText;
  const translated = t(key);
  return translated && translated !== key ? translated : rawText;
}

export function getTranslatedLovedOneList(
  memberId: string | undefined,
  items: string[] | undefined,
  t: TranslatorFn
): string[] {
  if (!items || !Array.isArray(items)) return [];
  return items.map((item) => getTranslatedLovedOneField(memberId, item, t));
}

export function getLocalizedLovedOneFields(member: LovedOne, t: TranslatorFn) {
  return {
    description: getTranslatedLovedOneField(member.id, member.description, t),
    familiarPhrase: getTranslatedLovedOneField(member.id, member.familiarPhrase, t),
    cues: getTranslatedLovedOneList(member.id, member.cues, t),
    importantMemories: getTranslatedLovedOneList(member.id, member.importantMemories, t),
    favouriteActivities: getTranslatedLovedOneList(member.id, member.favouriteActivities, t),
    audioNote: getTranslatedLovedOneField(member.id, member.audioNote, t),
    voiceTitle: getTranslatedLovedOneField(member.id, member.voiceRecording?.title, t),
    voiceTranscript: getTranslatedLovedOneField(member.id, member.voiceRecording?.transcript, t),
    patientNotes: getTranslatedLovedOneField(member.id, member.patientNotes, t),
  };
}
