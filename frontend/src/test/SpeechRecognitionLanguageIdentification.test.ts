import { describe, it, expect } from 'vitest';
import { SpeechService } from '../services/speechService.js';

describe('Phase B: Speech Recognition & Multilingual Language Identification Suite', () => {
  describe('Individual Language Script Identification (All 22 Indian Languages + English)', () => {
    it('1. identifies Hindi (hi) in Devanagari', () => {
      const res = SpeechService.detectLanguageWithConfidence('मुझे आज बहुत थकान महसूस हो रही है');
      expect(res.detectedLanguage).toBe('hi');
      expect(res.script).toBe('Devanagari');
      expect(res.confidence).toBeGreaterThanOrEqual(0.9);
      expect(res.suggestedAction).toBe('ACCEPT');
    });

    it('2. identifies Marathi (mr) in Devanagari with regional markers', () => {
      const res = SpeechService.detectLanguageWithConfidence('मला औषध घ्यायचं आठवत नाही, पाणी द्या');
      expect(res.detectedLanguage).toBe('mr');
      expect(res.script).toBe('Devanagari');
      expect(res.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('3. identifies Bengali (bn) in Bengali script', () => {
      const res = SpeechService.detectLanguageWithConfidence('আমার ওষুধ খেতে মনে নেই');
      expect(res.detectedLanguage).toBe('bn');
      expect(res.script).toBe('Bengali');
      expect(res.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('4. identifies Assamese (as) in Bengali-Assamese script with distinctive characters', () => {
      const res = SpeechService.detectLanguageWithConfidence('মোৰ দৰব খোৱা হৈছে নে নাই');
      expect(res.detectedLanguage).toBe('as');
      expect(res.script).toBe('Bengali-Assamese');
    });

    it('5. identifies Tamil (ta) in Tamil script', () => {
      const res = SpeechService.detectLanguageWithConfidence('மருந்து சாப்பிட வேண்டும், எனக்கு உதவி செய்');
      expect(res.detectedLanguage).toBe('ta');
      expect(res.script).toBe('Tamil');
      expect(res.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('6. identifies Telugu (te) in Telugu script', () => {
      const res = SpeechService.detectLanguageWithConfidence('నేను ఈ రోజు మందులు వేసుకున్నానా');
      expect(res.detectedLanguage).toBe('te');
      expect(res.script).toBe('Telugu');
      expect(res.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('7. identifies Gujarati (gu) in Gujarati script', () => {
      const res = SpeechService.detectLanguageWithConfidence('મને આજે ખૂબ થાક લાગ્યો છે');
      expect(res.detectedLanguage).toBe('gu');
      expect(res.script).toBe('Gujarati');
    });

    it('8. identifies Punjabi (pa) in Gurmukhi script', () => {
      const res = SpeechService.detectLanguageWithConfidence('ਕੀ ਮੈਂ ਅੱਜ ਦਵਾਈ ਲੈ ਲਈ ਹੈ');
      expect(res.detectedLanguage).toBe('pa');
      expect(res.script).toBe('Gurmukhi');
    });

    it('9. identifies Kannada (kn) in Kannada script', () => {
      const res = SpeechService.detectLanguageWithConfidence('ನಾನು ಇಂದು ಔಷಧಿ ತೆಗೆದುಕೊಂಡಿದ್ದೇನೆಯೇ');
      expect(res.detectedLanguage).toBe('kn');
      expect(res.script).toBe('Kannada');
    });

    it('10. identifies Malayalam (ml) in Malayalam script', () => {
      const res = SpeechService.detectLanguageWithConfidence('ഇന്ന് ഞാൻ മരുന്ന് കഴിച്ചോ');
      expect(res.detectedLanguage).toBe('ml');
      expect(res.script).toBe('Malayalam');
    });

    it('11. identifies Odia (or) in Odia script', () => {
      const res = SpeechService.detectLanguageWithConfidence('ମୁଁ ଆଜି ଔଷଧ ଖାଇଛି କି ନାହିଁ');
      expect(res.detectedLanguage).toBe('or');
      expect(res.script).toBe('Odia');
    });

    it('12. identifies Urdu (ur) in Perso-Arabic script', () => {
      const res = SpeechService.detectLanguageWithConfidence('کیا میں نے آج اپنی دوا لے لی ہے؟');
      expect(res.detectedLanguage).toBe('ur');
      expect(res.script).toBe('Perso-Arabic');
    });

    it('13. identifies Kashmiri (ks) in Perso-Arabic script', () => {
      const res = SpeechService.detectLanguageWithConfidence('کٲشُر زَبان مَنٛز دَواہ کِتھ پٲٹھۍ لٮ۪کھَن');
      expect(res.detectedLanguage).toBe('ks');
      expect(res.script).toBe('Perso-Arabic');
    });

    it('14. identifies Sindhi (sd) in Perso-Arabic script', () => {
      const res = SpeechService.detectLanguageWithConfidence('مون کي اڄ دوا کائڻي آهي ڇا ڄ');
      expect(res.detectedLanguage).toBe('sd');
      expect(res.script).toBe('Perso-Arabic');
    });

    it('15. identifies Sanskrit (sa) in Devanagari script with grammatical markers', () => {
      const res = SpeechService.detectLanguageWithConfidence('मम औषधम् कुत्र अस्ति? अहम् विस्मरामि।');
      expect(res.detectedLanguage).toBe('sa');
      expect(res.script).toBe('Devanagari');
    });

    it('16. identifies Nepali (ne) in Devanagari script with Nepali markers', () => {
      const res = SpeechService.detectLanguageWithConfidence('मलाई आज धेरै थकाई लागेको छैन');
      expect(res.detectedLanguage).toBe('ne');
      expect(res.script).toBe('Devanagari');
    });

    it('17. identifies Santali (sat) in Ol Chiki script', () => {
      const res = SpeechService.detectLanguageWithConfidence('ᱥᱟᱱᱛᱟᱲᱤ ᱯᱟᱹᱨᱥᱤ ᱛᱮ ᱨᱚᱲ ᱢᱮ');
      expect(res.detectedLanguage).toBe('sat');
      expect(res.script).toBe('Ol Chiki');
    });

    it('18. identifies Manipuri (mni) in Meetei Mayek script', () => {
      const res = SpeechService.detectLanguageWithConfidence('ꯃꯤꯇꯩꯂꯣꯟ ꯗꯥ ꯍꯥꯌꯕꯤꯌꯨ');
      expect(res.detectedLanguage).toBe('mni');
      expect(res.script).toBe('Meetei Mayek');
    });

    it('19. identifies English (en) in Latin script', () => {
      const res = SpeechService.detectLanguageWithConfidence('Can you please show me my family photos?');
      expect(res.detectedLanguage).toBe('en');
      expect(res.script).toBe('Latin');
      expect(res.confidence).toBeGreaterThanOrEqual(0.9);
      expect(res.isCodeSwitched).toBe(false);
    });
  });

  describe('Code-Switching & Mixed-Language Speech', () => {
    it('20. detects Hinglish code-switching: "ASHA mujhe water chahiye please"', () => {
      const res = SpeechService.detectLanguageWithConfidence('ASHA mujhe water chahiye please');
      expect(res.detectedLanguage).toBe('hi');
      expect(res.isCodeSwitched).toBe(true);
      expect(res.suggestedAction).toBe('ACCEPT');
    });

    it('21. detects Marathish code-switching: "ASHA aushadh ghyaycha aahe please remind me"', () => {
      const res = SpeechService.detectLanguageWithConfidence('ASHA aushadh ghyaycha aahe please remind me');
      expect(res.detectedLanguage).toBe('mr');
      expect(res.isCodeSwitched).toBe(true);
      expect(res.suggestedAction).toBe('ACCEPT');
    });
  });

  describe('Uncertainty & Ambiguity Handling', () => {
    it('22. flags ultra-short or noisy input as ambiguous and suggests clarification', () => {
      const res = SpeechService.detectLanguageWithConfidence('a');
      expect(res.isAmbiguous).toBe(true);
      expect(res.suggestedAction).toBe('CLARIFY');
      expect(res.confidence).toBeLessThan(0.5);
    });

    it('23. handles empty transcript gracefully with safe English fallback and clarification', () => {
      const res = SpeechService.detectLanguageWithConfidence('');
      expect(res.detectedLanguage).toBe('en');
      expect(res.isAmbiguous).toBe(true);
      expect(res.suggestedAction).toBe('CLARIFY');
    });
  });
});
