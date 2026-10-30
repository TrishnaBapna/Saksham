import { describe, it, expect, vi, beforeEach } from 'vitest';
import { voiceService } from '@/services/voiceService';
import { audioSynthesizer } from '@/services/audioService';

describe('Voice & Audio Services (Phase 5)', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  describe('English Voice Navigation Commands', () => {
    it('parses "Open Mind Clinic"', () => {
      const match = voiceService.parseVoiceCommand('Open Mind Clinic');
      expect(match.action).toBe('navigate');
      expect(match.target).toBe('mindClinic');
    });

    it('parses "Open Movement"', () => {
      const match = voiceService.parseVoiceCommand('Open Movement exercise');
      expect(match.action).toBe('navigate');
      expect(match.target).toBe('movement');
    });

    it('parses "Open Speech"', () => {
      const match = voiceService.parseVoiceCommand('Open Speech vocal drills');
      expect(match.action).toBe('navigate');
      expect(match.target).toBe('speech');
    });

    it('parses "Open my calendar"', () => {
      const match = voiceService.parseVoiceCommand('Open my calendar');
      expect(match.action).toBe('navigate');
      expect(match.target).toBe('calendar');
    });

    it('parses "Open Loved Ones & Care"', () => {
      const match = voiceService.parseVoiceCommand('Open Loved Ones and family');
      expect(match.action).toBe('navigate');
      expect(match.target).toBe('lovedOnes');
    });

    it('parses "Go back" and "Go to home"', () => {
      const backMatch = voiceService.parseVoiceCommand('Please go back now');
      expect(backMatch.action).toBe('navigate');
      expect(backMatch.target).toBe('back');

      const homeMatch = voiceService.parseVoiceCommand('Go to home screen');
      expect(homeMatch.action).toBe('navigate');
      expect(homeMatch.target).toBe('home');
    });
  });

  describe('Multilingual Navigation Commands (Hindi & Marathi)', () => {
    it('parses Hindi command for Mind Clinic ("दिमाग क्लीनिक")', () => {
      const match = voiceService.parseVoiceCommand('कृपया दिमाग क्लीनिक खोलो');
      expect(match.action).toBe('navigate');
      expect(match.target).toBe('mindClinic');
    });

    it('parses Hindi command for Movement ("व्यायाम")', () => {
      const match = voiceService.parseVoiceCommand('व्यायाम शुरू करो');
      expect(match.action).toBe('navigate');
      expect(match.target).toBe('movement');
    });

    it('parses Hindi command for Loved Ones ("परिवार")', () => {
      const match = voiceService.parseVoiceCommand('मेरा परिवार दिखाओ');
      expect(match.action).toBe('navigate');
      expect(match.target).toBe('lovedOnes');
    });

    it('parses Marathi command for Mind Clinic games ("खेळ")', () => {
      const match = voiceService.parseVoiceCommand('खेळ उघडा');
      expect(match.action).toBe('navigate');
      expect(match.target).toBe('mindClinic');
    });

    it('parses Marathi command for Movement ("हालचाल")', () => {
      const match = voiceService.parseVoiceCommand('हालचाल व्यायाम दाखवा');
      expect(match.action).toBe('navigate');
      expect(match.target).toBe('movement');
    });

    it('parses Marathi command for Calendar ("दिनदर्शिका")', () => {
      const match = voiceService.parseVoiceCommand('माझी दिनदर्शिका दाखवा');
      expect(match.action).toBe('navigate');
      expect(match.target).toBe('calendar');
    });

    it('parses Marathi command for Go Back ("मागे")', () => {
      const match = voiceService.parseVoiceCommand('मागे चला');
      expect(match.action).toBe('navigate');
      expect(match.target).toBe('back');
    });
  });

  describe('Care Actions & Duplicate Debouncing', () => {
    it('parses natural language command for drinking water in Hindi ("पानी") and Marathi ("पाणी")', () => {
      const hi = voiceService.parseVoiceCommand('मैंने पानी पिया');
      expect(hi.action).toBe('log_water');

      const mr = voiceService.parseVoiceCommand('पाणी प्यायलो');
      expect(mr.action).toBe('log_water');
    });

    it('parses emergency sos command across languages', () => {
      const en = voiceService.parseVoiceCommand('Help me emergency now');
      expect(en.action).toBe('trigger_sos');

      const hi = voiceService.parseVoiceCommand('मदद करो आपातकाल');
      expect(hi.action).toBe('trigger_sos');

      const mr = voiceService.parseVoiceCommand('मला मदत हवी आहे');
      expect(mr.action).toBe('trigger_sos');
    });

    it('debounces identical repeated commands within 2 seconds', () => {
      const first = voiceService.parseVoiceCommand('unique test action command');
      expect(first.raw).toBe('unique test action command');

      // Immediate identical repeat is suppressed as unknown to prevent double execution
      const duplicate = voiceService.parseVoiceCommand('unique test action command');
      expect(duplicate.action).toBe('unknown');
    });
  });

  describe('Audio Synthesizer', () => {
    it('audio synthesizer muting toggles correctly', () => {
      audioSynthesizer.setMuted(true);
      expect(audioSynthesizer.getIsMuted()).toBe(true);
      audioSynthesizer.setMuted(false);
      expect(audioSynthesizer.getIsMuted()).toBe(false);
    });
  });
});
