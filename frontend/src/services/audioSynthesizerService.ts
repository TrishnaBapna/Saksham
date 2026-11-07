/**
 * Web Audio API synthesizer for positive, accessible sensory feedback.
 * 100% offline, browser-native, zero external audio asset dependencies.
 */

type ChimeType = 'chime' | 'bell' | 'fanfare' | 'reminder';

class AudioSynthesizerService {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        try {
          this.ctx = new AudioCtx();
        } catch {
          this.ctx = null;
        }
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  public setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
  }

  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  /**
   * Play a single harmonic note with gentle attack and exponential decay
   */
  public playTone(freq: number, durationSeconds: number = 0.4, type: OscillatorType = 'sine'): void {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationSeconds);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + durationSeconds);
    } catch (e) {
      console.warn('[AudioSynthesizer] Note playback suppressed:', e);
    }
  }

  /**
   * Play pre-composed comforting harmonic feedback
   */
  public playChime(type: ChimeType): void {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      switch (type) {
        case 'chime':
          // Two-tone soothing affirmation (C5 -> E5)
          this.playTone(523.25, 0.25, 'triangle');
          setTimeout(() => this.playTone(659.25, 0.45, 'triangle'), 150);
          break;

        case 'bell':
          // Single clear resonant bell (D5)
          this.playTone(587.33, 0.6, 'sine');
          break;

        case 'fanfare':
          // Celebratory ascending triad (C5 -> E5 -> G5)
          this.playTone(523.25, 0.2, 'sine');
          setTimeout(() => this.playTone(659.25, 0.2, 'sine'), 160);
          setTimeout(() => this.playTone(783.99, 0.6, 'sine'), 320);
          break;

        case 'reminder':
          // Gentle rhythmic attention pulse (A4 -> A4)
          this.playTone(440.0, 0.18, 'sine');
          setTimeout(() => this.playTone(440.0, 0.35, 'sine'), 220);
          break;
      }
    } catch (e) {
      console.warn('[AudioSynthesizer] Chime playback note:', e);
    }
  }
}

export const audioSynthesizer = new AudioSynthesizerService();
