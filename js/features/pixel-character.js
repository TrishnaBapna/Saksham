/* ======================================================================= */
/* SAKSHAM 2.0 — FULL-BODY PIXEL CHARACTER ENGINE                          */
/* Dynamic, expressive retro pixel companion with multi-emotion animations */
/* Supports: idle, attentive (reminder), happy, talking, thinking, sad     */
/* Respects reduced-motion, saves battery on background, never angry       */
/* ======================================================================= */

(function(window) {
  'use strict';

  // Canvas pixel grid dimensions
  const GRID_W = 32;
  const GRID_H = 40;

  // Active state
  let currentEmotion = 'idle';
  let emotionTimer = null;
  let animFrame = 0;
  let animInterval = null;
  let prefersReducedMotion = false;
  let isPageVisible = true;
  let activeCustomization = {
    character: 'dadi',
    outfitColor: '#D97706',
    sareeColor: '#FCE7F3',
    accessory: 'flower'
  };

  // Particles (hearts, sparkles, teardrops, question marks, notes)
  let particles = [];

  // Color palettes for default character features
  const PALETTES = {
    skin: '#FCD34D',
    skinShadow: '#F59E0B',
    white: '#FFFFFF',
    black: '#1F2937',
    hairSilver: '#E2E8F0',
    hairSilverShadow: '#94A3B8',
    hairDark: '#334155',
    blush: '#F87171',
    bindi: '#DC2626',
    gold: '#F59E0B',
    tearBlue: '#38BDF8',
    sparkleGold: '#FBBF24',
    noteAmber: '#D97706',
    heartRed: '#EF4444',
    // Miko Robot Palette
    mikoBody: '#387D82',
    mikoDark: '#1E293B',
    mikoCyan: '#06B6D4',
    mikoGlow: '#22D3EE',
    mikoScreen: '#0F172A',
    mikoYellow: '#FBBF24',
    mikoAmber: '#F59E0B'
  };

  const SakshamPixelCharacter = {
    init: function() {
      this.detectReducedMotion();
      this.syncCustomizationFromStorage();
      this.bindVisibilityListener();
      this.startAnimationLoop();
    },

    detectReducedMotion: function() {
      try {
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          prefersReducedMotion = true;
        }
      } catch(e) {}
    },

    setReducedMotion: function(enabled) {
      prefersReducedMotion = !!enabled;
      if (prefersReducedMotion) {
        particles = [];
      }
      this.renderAll();
    },

    bindVisibilityListener: function() {
      const self = this;
      document.addEventListener('visibilitychange', function() {
        isPageVisible = (document.visibilityState === 'visible');
        if (isPageVisible) {
          self.startAnimationLoop();
        } else {
          // If no Picture-in-Picture window is active, pause loop to save battery
          if (!window.companionPipWindow || window.companionPipWindow.closed) {
            if (animInterval) {
              clearInterval(animInterval);
              animInterval = null;
            }
          }
        }
      });
    },

    syncCustomizationFromStorage: function() {
      try {
        if (window.SakshamIllustrations && typeof window.SakshamIllustrations.getSavedCustomization === 'function') {
          activeCustomization = window.SakshamIllustrations.getSavedCustomization();
        } else {
          const raw = localStorage.getItem('saksham_character_customization');
          if (raw) activeCustomization = JSON.parse(raw);
        }
      } catch(e) {}
    },

    getEmotion: function() {
      return currentEmotion;
    },

    /**
     * Sets character emotion with auto-revert to idle
     * Note: 'angry' or 'reminder' are normalized to 'attentive' (caring, warm expression, never angry)
     */
    setEmotion: function(emotion, durationMs = 0, onComplete = null) {
      // Warm, respectful emotional normalization: never shame or angry
      if (emotion === 'angry' || emotion === 'reminder' || emotion === 'alert') {
        currentEmotion = 'attentive';
      } else {
        currentEmotion = emotion || 'idle';
      }
      particles = [];

      // Spawn initial particles based on emotion (if reduced motion is not active)
      if (!prefersReducedMotion) {
        if (currentEmotion === 'happy') {
          particles.push({ type: 'heart', x: 24, y: 8, life: 1.0, dy: -0.3 });
          particles.push({ type: 'sparkle', x: 8, y: 10, life: 0.9, dy: -0.2 });
        } else if (currentEmotion === 'attentive') {
          particles.push({ type: 'sparkle', x: 24, y: 7, life: 1.0, dy: -0.15 });
          particles.push({ type: 'note', x: 8, y: 8, life: 0.9, dy: -0.2 });
        } else if (currentEmotion === 'sad') {
          particles.push({ type: 'tear', x: 12, y: 15, life: 1.0, dy: 0.3 });
        } else if (currentEmotion === 'thinking') {
          particles.push({ type: 'question', x: 23, y: 5, life: 1.0, dy: -0.15 });
        }
      }

      if (emotionTimer) {
        clearTimeout(emotionTimer);
        emotionTimer = null;
      }

      if (durationMs > 0) {
        emotionTimer = setTimeout(() => {
          currentEmotion = 'idle';
          if (typeof onComplete === 'function') onComplete();
        }, durationMs);
      }
    },

    setCustomization: function(opts) {
      activeCustomization = Object.assign({}, activeCustomization, opts);
      this.renderAll();
    },

    startAnimationLoop: function() {
      if (animInterval) clearInterval(animInterval);
      // Run loop at ~8 FPS for classic pixel character charm
      animInterval = setInterval(() => {
        animFrame++;
        this.updateParticles();
        this.renderAll();
      }, 125);
    },

    updateParticles: function() {
      if (prefersReducedMotion) {
        particles = [];
        return;
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= 0.05;
        p.y += p.dy;
        if (p.life <= 0) {
          particles.splice(i, 1);
        }
      }

      // Periodically spawn ongoing emotion particles
      if (animFrame % 12 === 0) {
        if (currentEmotion === 'happy') {
          particles.push({ type: 'heart', x: 12 + Math.floor(Math.random() * 10), y: 8, life: 1.0, dy: -0.25 });
        } else if (currentEmotion === 'attentive') {
          particles.push({ type: 'sparkle', x: 14 + Math.floor(Math.random() * 8), y: 7, life: 0.9, dy: -0.2 });
        } else if (currentEmotion === 'sad') {
          particles.push({ type: 'tear', x: 12, y: 15, life: 1.0, dy: 0.35 });
        }
      }
    },

    renderAll: function() {
      const canvases = document.querySelectorAll('.pixel-companion-canvas, #companionPixelCanvas');
      canvases.forEach(c => this.renderToCanvas(c));
    },

    renderToCanvas: function(canvas, overrideChar = null, overrideEmotion = null) {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const char = overrideChar || activeCustomization.character || 'dadi';
      let emotion = overrideEmotion || currentEmotion;
      if (emotion === 'angry' || emotion === 'reminder' || emotion === 'alert') {
        emotion = 'attentive';
      }

      const outfitColor = activeCustomization.outfitColor || '#D97706';
      const sareeColor = activeCustomization.sareeColor || '#FCE7F3';
      const accessory = activeCustomization.accessory || 'flower';

      // Internal resolution is 32x40
      const w = canvas.width;
      const h = canvas.height;
      const scaleX = w / GRID_W;
      const scaleY = h / GRID_H;

      ctx.clearRect(0, 0, w, h);
      ctx.imageSmoothingEnabled = false;

      // Helper to draw a pixel block
      function px(x, y, color, pw = 1, ph = 1) {
        ctx.fillStyle = color;
        ctx.fillRect(Math.floor(x * scaleX), Math.floor(y * scaleY), Math.ceil(pw * scaleX), Math.ceil(ph * scaleY));
      }

      // Idle breathing cycle / hop offset
      let yBob = 0;
      let xHop = 0;
      if (prefersReducedMotion) {
        yBob = 0;
        xHop = 0;
      } else if (emotion === 'happy') {
        // Joyful jumping hop
        yBob = (animFrame % 4 === 0 || animFrame % 4 === 1) ? -2 : 0;
        xHop = (animFrame % 6 < 3) ? 1 : -1;
      } else if (emotion === 'attentive') {
        // Calm attentive posture (no jerky shake)
        yBob = 0;
        xHop = 0;
      } else if (emotion === 'sad') {
        // Drooping low
        yBob = 1;
      } else {
        // Idle gentle breathing
        yBob = (animFrame % 8 < 4) ? 0 : 1;
      }

      // Draw shadow under feet
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.ellipse((16 + xHop) * scaleX, 38 * scaleY, 7 * scaleX, 2.5 * scaleY, 0, 0, Math.PI * 2);
      ctx.fill();

      // Dispatch character drawing
      if (char === 'miko') {
        this.drawMikoRobot(px, emotion, animFrame, outfitColor, accessory, xHop, yBob);
      } else if (char === 'priya') {
        this.drawPriyaYouth(px, emotion, animFrame, outfitColor, accessory, xHop, yBob);
      } else if (char === 'aarav') {
        this.drawAaravAdult(px, emotion, animFrame, outfitColor, accessory, xHop, yBob);
      } else {
        // Default Dadi (Kalyani ji)
        this.drawDadi(px, emotion, animFrame, outfitColor, sareeColor, accessory, xHop, yBob);
      }

      // Render Floating Emotion Particles
      if (!prefersReducedMotion) {
        this.drawParticles(px, xHop, yBob);
      }
    },

    /* ======================================================================= */
    /* CHARACTER 1: KALYANI JI (DADI) — ELDERLY INDIAN GRANDMOTHER             */
    /* ======================================================================= */
    drawDadi: function(px, emotion, frame, outfitColor, sareeColor, accessory, ox, oy) {
      const cx = 16 + ox;
      const cy = oy;

      // 1. Silver Bun (Hair)
      px(cx - 4, cy + 2, PALETTES.hairSilverShadow, 8, 4);
      px(cx - 3, cy + 1, PALETTES.hairSilver, 6, 2);
      px(cx - 1, cy + 0, PALETTES.hairSilver, 2, 2);

      // Flower in hair accessory
      if (accessory === 'flower') {
        px(cx + 3, cy + 2, '#F43F5E', 2, 2);
        px(cx + 4, cy + 3, '#FBBF24', 1, 1);
      }

      // 2. Head & Hair Frame
      px(cx - 6, cy + 5, PALETTES.hairSilver, 12, 6);
      px(cx - 7, cy + 7, PALETTES.hairSilverShadow, 2, 6);
      px(cx + 5, cy + 7, PALETTES.hairSilverShadow, 2, 6);

      // Face (Warm soft tone)
      px(cx - 5, cy + 7, PALETTES.skin, 10, 8);
      px(cx - 4, cy + 15, PALETTES.skinShadow, 8, 2);

      // Red Bindi
      px(cx - 0.5, cy + 8, PALETTES.bindi, 1.5, 1.5);

      // Eyebrows based on emotion
      if (emotion === 'attentive') {
        // Gentle attentive arch with slight caring tilt
        px(cx - 4, cy + 8, PALETTES.hairDark, 3, 1);
        px(cx + 1, cy + 9, PALETTES.hairDark, 3, 1);
      } else if (emotion === 'sad') {
        // Slanted down sad brows
        px(cx - 4, cy + 10, PALETTES.hairDark, 1, 1);
        px(cx - 3, cy + 9, PALETTES.hairDark, 2, 1);
        px(cx + 1, cy + 9, PALETTES.hairDark, 2, 1);
        px(cx + 3, cy + 10, PALETTES.hairDark, 1, 1);
      } else {
        // Gentle natural arch
        px(cx - 4, cy + 9, PALETTES.hairDark, 3, 1);
        px(cx + 1, cy + 9, PALETTES.hairDark, 3, 1);
      }

      // Eyes (Blinking every 28 frames in idle)
      const isBlinking = (emotion === 'idle' && frame % 28 === 0);
      if (isBlinking) {
        px(cx - 4, cy + 11, PALETTES.hairDark, 3, 1);
        px(cx + 1, cy + 11, PALETTES.hairDark, 3, 1);
      } else if (emotion === 'happy') {
        // Cheerful smiling eye arcs (^ ^)
        px(cx - 4, cy + 12, PALETTES.hairDark, 1, 1);
        px(cx - 3, cy + 11, PALETTES.hairDark, 2, 1);
        px(cx + 1, cy + 11, PALETTES.hairDark, 2, 1);
        px(cx + 3, cy + 12, PALETTES.hairDark, 1, 1);
      } else if (emotion === 'sad') {
        // Drooping gentle eyes
        px(cx - 4, cy + 11, PALETTES.hairDark, 2, 2);
        px(cx + 2, cy + 11, PALETTES.hairDark, 2, 2);
      } else {
        // Normal warm attentive eyes
        px(cx - 3, cy + 11, PALETTES.hairDark, 2, 2);
        px(cx + 1, cy + 11, PALETTES.hairDark, 2, 2);
        px(cx - 3, cy + 11, PALETTES.white, 1, 1);
        px(cx + 1, cy + 11, PALETTES.white, 1, 1);
      }

      // Spectacles accessory
      if (accessory === 'glasses') {
        px(cx - 5, cy + 10, '#B45309', 4, 3);
        px(cx - 4, cy + 11, 'rgba(255,255,255,0.4)', 2, 1);
        px(cx - 1, cy + 11, '#B45309', 2, 1); // Bridge
        px(cx + 1, cy + 10, '#B45309', 4, 3);
        px(cx + 2, cy + 11, 'rgba(255,255,255,0.4)', 2, 1);
      }

      // Rosy Blushing Cheeks
      px(cx - 5, cy + 13, PALETTES.blush, 2, 1);
      px(cx + 3, cy + 13, PALETTES.blush, 2, 1);

      // Mouth based on emotion
      if (emotion === 'happy') {
        // Big open happy smile
        px(cx - 2, cy + 14, PALETTES.hairDark, 4, 2);
        px(cx - 1, cy + 15, '#EF4444', 2, 1);
      } else if (emotion === 'attentive') {
        // Warm encouraging smile
        px(cx - 2, cy + 14, PALETTES.hairDark, 4, 1);
        px(cx - 1, cy + 15, PALETTES.hairDark, 2, 1);
      } else if (emotion === 'sad') {
        // Downturned gentle curve
        px(cx - 2, cy + 15, PALETTES.hairDark, 4, 1);
        px(cx - 3, cy + 16, PALETTES.hairDark, 1, 1);
        px(cx + 2, cy + 16, PALETTES.hairDark, 1, 1);
      } else if (emotion === 'talking') {
        // Animated talking mouth
        const isOpen = frame % 4 < 2;
        px(cx - 1.5, cy + 14, PALETTES.hairDark, 3, isOpen ? 2 : 1);
      } else {
        // Gentle pleasant smile
        px(cx - 2, cy + 14, PALETTES.hairDark, 4, 1);
      }

      // 3. Torso & Blouse / Shawl
      px(cx - 5, cy + 17, outfitColor, 10, 10);

      // Saree Drape (Pallu crossing chest)
      px(cx + 1, cy + 17, sareeColor, 4, 2);
      px(cx - 1, cy + 19, sareeColor, 5, 2);
      px(cx - 3, cy + 21, sareeColor, 5, 2);
      px(cx - 5, cy + 23, sareeColor, 5, 4);

      // Pearl Mala / Necklace accessory
      if (accessory === 'necklace') {
        px(cx - 3, cy + 18, '#F8FAFC', 1, 1);
        px(cx - 1, cy + 19, '#F8FAFC', 1, 1);
        px(cx + 1, cy + 19, '#F8FAFC', 1, 1);
        px(cx + 3, cy + 18, '#F8FAFC', 1, 1);
      }

      // 4. Arms & Hands (Animated per emotion)
      if (emotion === 'happy') {
        // Both arms raised high waving (\o/)
        const waveOffset = (frame % 4 < 2) ? 0 : 1;
        px(cx - 7, cy + 16 - waveOffset, outfitColor, 2, 4);
        px(cx - 9, cy + 13 - waveOffset, outfitColor, 2, 4);
        px(cx - 9, cy + 11 - waveOffset, PALETTES.skin, 2, 2);
        px(cx + 5, cy + 16 + waveOffset, outfitColor, 2, 4);
        px(cx + 7, cy + 13 + waveOffset, outfitColor, 2, 4);
        px(cx + 7, cy + 11 + waveOffset, PALETTES.skin, 2, 2);
      } else if (emotion === 'attentive') {
        // Left arm resting, Right hand raised in friendly gentle attention wave
        px(cx - 7, cy + 18, outfitColor, 2, 6);
        px(cx - 6, cy + 24, PALETTES.skin, 2, 2);

        const waveOffset = (frame % 6 < 3) ? 0 : 1;
        px(cx + 5, cy + 18, outfitColor, 2, 3);
        px(cx + 7, cy + 15 - waveOffset, outfitColor, 2, 3);
        px(cx + 8, cy + 13 - waveOffset, PALETTES.skin, 2, 2);
      } else if (emotion === 'sad') {
        // Limp drooping arms by sides
        px(cx - 7, cy + 19, outfitColor, 2, 7);
        px(cx - 7, cy + 26, PALETTES.skin, 2, 2);
        px(cx + 5, cy + 19, outfitColor, 2, 7);
        px(cx + 5, cy + 26, PALETTES.skin, 2, 2);
      } else if (emotion === 'talking' || emotion === 'thinking') {
        // Left arm resting, Right hand raised pointing/gesturing
        px(cx - 7, cy + 18, outfitColor, 2, 6);
        px(cx - 7, cy + 24, PALETTES.skin, 2, 2);

        px(cx + 5, cy + 18, outfitColor, 2, 3);
        px(cx + 7, cy + 16, outfitColor, 2, 3);
        px(cx + 8, cy + 14, PALETTES.skin, 2, 2);
      } else {
        // Idle resting hands in front
        px(cx - 7, cy + 18, outfitColor, 2, 6);
        px(cx - 6, cy + 24, PALETTES.skin, 2, 2);
        px(cx + 5, cy + 18, outfitColor, 2, 6);
        px(cx + 4, cy + 24, PALETTES.skin, 2, 2);
      }

      // 5. Lower Saree & Hem
      px(cx - 6, cy + 27, sareeColor, 12, 9);
      // Gold Zari Saree border
      px(cx - 6, cy + 35, PALETTES.gold, 12, 1);

      // 6. Feet & Slippers (Calm resting stance)
      px(cx - 4, cy + 36, PALETTES.skin, 3, 2);
      px(cx + 1, cy + 36, PALETTES.skin, 3, 2);
      px(cx - 5, cy + 37, '#78350F', 4, 1);
      px(cx + 1, cy + 37, '#78350F', 4, 1);
    },

    /* ======================================================================= */
    /* CHARACTER 2: MIKO ROBOT — RETRO CYBER COMPANION                         */
    /* ======================================================================= */
    drawMikoRobot: function(px, emotion, frame, outfitColor, accessory, ox, oy) {
      const cx = 16 + ox;
      const cy = oy;

      // 1. Antenna & LED Light (Glowing amber/cyan alert pulse; never red)
      const ledColor = (emotion === 'attentive') ? PALETTES.mikoAmber : (emotion === 'happy') ? '#10B981' : PALETTES.mikoGlow;
      px(cx - 1, cy + 2, ledColor, 2, 2);
      px(cx - 0.5, cy + 4, PALETTES.mikoDark, 1, 3);

      // 2. Chassis Head
      px(cx - 7, cy + 7, outfitColor, 14, 10);
      px(cx - 8, cy + 9, PALETTES.mikoDark, 1, 6);
      px(cx + 7, cy + 9, PALETTES.mikoDark, 1, 6);

      // LED Screen Face
      px(cx - 5, cy + 9, PALETTES.mikoScreen, 10, 6);

      // Robot Eyes / Expression Screen
      if (emotion === 'happy') {
        px(cx - 4, cy + 11, PALETTES.heartRed, 3, 2);
        px(cx + 1, cy + 11, PALETTES.heartRed, 3, 2);
      } else if (emotion === 'attentive') {
        // Cheerful alert arches (^ ^)
        px(cx - 4, cy + 11, PALETTES.mikoAmber, 3, 1);
        px(cx - 3, cy + 10, PALETTES.mikoAmber, 2, 1);
        px(cx + 1, cy + 10, PALETTES.mikoAmber, 2, 1);
        px(cx + 2, cy + 11, PALETTES.mikoAmber, 3, 1);
      } else if (emotion === 'sad') {
        px(cx - 4, cy + 11, PALETTES.mikoCyan, 2, 2);
        px(cx + 2, cy + 11, PALETTES.mikoCyan, 2, 2);
        px(cx - 3, cy + 13, PALETTES.tearBlue, 1, 1);
      } else if (emotion === 'talking') {
        const hWave = frame % 4;
        px(cx - 4, cy + 11, PALETTES.mikoCyan, 2, 1 + (hWave % 2));
        px(cx - 1, cy + 10, PALETTES.mikoCyan, 2, 3);
        px(cx + 2, cy + 11, PALETTES.mikoCyan, 2, 1 + ((hWave + 1) % 2));
      } else {
        // Default glowing cyan eyes
        px(cx - 4, cy + 11, PALETTES.mikoGlow, 2, 2);
        px(cx + 2, cy + 11, PALETTES.mikoGlow, 2, 2);
      }

      // Cyber Visor accessory
      if (accessory === 'glasses') {
        px(cx - 6, cy + 10, '#38BDF8', 12, 1);
      }

      // 3. Neck & Torso
      px(cx - 2, cy + 17, PALETTES.mikoDark, 4, 1);
      px(cx - 6, cy + 18, outfitColor, 12, 9);
      // Chest display / battery gauge
      px(cx - 3, cy + 20, PALETTES.mikoScreen, 6, 4);
      px(cx - 2, cy + 21, (emotion === 'attentive') ? PALETTES.mikoAmber : PALETTES.mikoGlow, 4, 2);

      // 4. Robot Arms
      if (emotion === 'happy') {
        px(cx - 8, cy + 17, outfitColor, 2, 4);
        px(cx - 9, cy + 14, PALETTES.mikoDark, 2, 3);
        px(cx + 6, cy + 17, outfitColor, 2, 4);
        px(cx + 7, cy + 14, PALETTES.mikoDark, 2, 3);
      } else if (emotion === 'attentive') {
        // Left arm resting, Right arm raised in friendly greeting wave
        px(cx - 8, cy + 19, outfitColor, 2, 5);
        px(cx - 8, cy + 24, PALETTES.mikoDark, 2, 2);

        px(cx + 6, cy + 18, outfitColor, 2, 3);
        px(cx + 8, cy + 15, PALETTES.mikoDark, 2, 3);
      } else {
        // Downward resting clamps
        px(cx - 8, cy + 19, outfitColor, 2, 6);
        px(cx - 8, cy + 25, PALETTES.mikoDark, 2, 2);
        px(cx + 6, cy + 19, outfitColor, 2, 6);
        px(cx + 6, cy + 25, PALETTES.mikoDark, 2, 2);
      }

      // 5. Hip Joint & Tread Legs
      px(cx - 4, cy + 27, PALETTES.mikoDark, 8, 2);
      px(cx - 5, cy + 29, outfitColor, 4, 7);
      px(cx + 1, cy + 29, outfitColor, 4, 7);
      // Tread feet
      px(cx - 6, cy + 36, PALETTES.mikoDark, 5, 2);
      px(cx + 1, cy + 36, PALETTES.mikoDark, 5, 2);
    },

    /* ======================================================================= */
    /* CHARACTER 3: PRIYA (YOUTH) — MODERN ENERGETIC COMPANION                 */
    /* ======================================================================= */
    drawPriyaYouth: function(px, emotion, frame, outfitColor, accessory, ox, oy) {
      const cx = 16 + ox;
      const cy = oy;

      // Dark ponytail with ribbon
      px(cx - 5, cy + 3, PALETTES.hairDark, 10, 5);
      px(cx + 4, cy + 4, PALETTES.hairDark, 4, 6);
      if (accessory === 'flower') px(cx + 3, cy + 4, '#F43F5E', 2, 2);

      // Face
      px(cx - 4, cy + 7, PALETTES.skin, 8, 8);
      // Eyes & Mouth
      if (emotion === 'happy') {
        px(cx - 3, cy + 10, PALETTES.hairDark, 2, 1);
        px(cx + 1, cy + 10, PALETTES.hairDark, 2, 1);
        px(cx - 2, cy + 12, '#EF4444', 4, 2);
      } else if (emotion === 'attentive') {
        px(cx - 3, cy + 9, PALETTES.hairDark, 2, 1);
        px(cx + 1, cy + 9, PALETTES.hairDark, 2, 1);
        px(cx - 2, cy + 10, PALETTES.hairDark, 2, 2);
        px(cx + 1, cy + 10, PALETTES.hairDark, 2, 2);
        px(cx - 2, cy + 13, PALETTES.hairDark, 4, 1);
      } else {
        px(cx - 3, cy + 10, PALETTES.hairDark, 2, 2);
        px(cx + 1, cy + 10, PALETTES.hairDark, 2, 2);
        px(cx - 1, cy + 13, PALETTES.hairDark, 2, 1);
      }
      px(cx - 4, cy + 12, PALETTES.blush, 1, 1);
      px(cx + 3, cy + 12, PALETTES.blush, 1, 1);

      // Hoodie / Jacket
      px(cx - 5, cy + 16, outfitColor, 10, 10);
      px(cx - 1, cy + 16, '#F8FAFC', 2, 10);

      // Arms
      if (emotion === 'happy') {
        px(cx - 7, cy + 15, outfitColor, 2, 5);
        px(cx - 7, cy + 13, PALETTES.skin, 2, 2);
        px(cx + 5, cy + 15, outfitColor, 2, 5);
        px(cx + 5, cy + 13, PALETTES.skin, 2, 2);
      } else if (emotion === 'attentive') {
        px(cx - 7, cy + 17, outfitColor, 2, 6);
        px(cx - 7, cy + 23, PALETTES.skin, 2, 2);
        px(cx + 5, cy + 16, outfitColor, 2, 4);
        px(cx + 7, cy + 13, PALETTES.skin, 2, 2);
      } else {
        px(cx - 7, cy + 17, outfitColor, 2, 7);
        px(cx - 7, cy + 24, PALETTES.skin, 2, 2);
        px(cx + 5, cy + 17, outfitColor, 2, 7);
        px(cx + 5, cy + 24, PALETTES.skin, 2, 2);
      }

      // Jeans & Sneakers
      px(cx - 4, cy + 26, '#1E40AF', 8, 9);
      px(cx - 5, cy + 35, '#FFFFFF', 4, 2);
      px(cx + 1, cy + 35, '#FFFFFF', 4, 2);
    },

    /* ======================================================================= */
    /* CHARACTER 4: AARAV (ADULT) — SMART GENTLEMAN COMPANION                  */
    /* ======================================================================= */
    drawAaravAdult: function(px, emotion, frame, outfitColor, accessory, ox, oy) {
      const cx = 16 + ox;
      const cy = oy;

      // Dark Hair
      px(cx - 5, cy + 4, PALETTES.hairDark, 10, 4);
      px(cx - 4, cy + 3, PALETTES.hairDark, 8, 2);

      // Face
      px(cx - 4, cy + 7, PALETTES.skin, 8, 9);
      // Eyebrows & Eyes
      if (emotion === 'attentive') {
        px(cx - 3, cy + 9, PALETTES.hairDark, 2, 1);
        px(cx + 1, cy + 9, PALETTES.hairDark, 2, 1);
        px(cx - 3, cy + 10, PALETTES.hairDark, 2, 2);
        px(cx + 1, cy + 10, PALETTES.hairDark, 2, 2);
        px(cx - 2, cy + 14, PALETTES.hairDark, 4, 1);
      } else {
        px(cx - 3, cy + 10, PALETTES.hairDark, 2, 2);
        px(cx + 1, cy + 10, PALETTES.hairDark, 2, 2);
        px(cx - 1, cy + 14, PALETTES.hairDark, 2, 1);
      }

      // Glasses accessory
      if (accessory === 'glasses') {
        px(cx - 4, cy + 9, '#1E293B', 3, 3);
        px(cx - 1, cy + 10, '#1E293B', 2, 1);
        px(cx + 1, cy + 9, '#1E293B', 3, 3);
      }

      // Blazer / Collared Shirt
      px(cx - 5, cy + 16, outfitColor, 10, 11);
      px(cx - 1, cy + 16, '#F8FAFC', 2, 5);
      px(cx - 0.5, cy + 18, '#DC2626', 1, 3);

      // Arms
      if (emotion === 'happy') {
        px(cx - 7, cy + 15, outfitColor, 2, 5);
        px(cx - 7, cy + 13, PALETTES.skin, 2, 2);
        px(cx + 5, cy + 15, outfitColor, 2, 5);
        px(cx + 5, cy + 13, PALETTES.skin, 2, 2);
      } else if (emotion === 'attentive') {
        px(cx - 7, cy + 17, outfitColor, 2, 6);
        px(cx - 7, cy + 23, PALETTES.skin, 2, 2);
        px(cx + 5, cy + 16, outfitColor, 2, 4);
        px(cx + 7, cy + 13, PALETTES.skin, 2, 2);
      } else {
        px(cx - 7, cy + 17, outfitColor, 2, 7);
        px(cx - 7, cy + 24, PALETTES.skin, 2, 2);
        px(cx + 5, cy + 17, outfitColor, 2, 7);
        px(cx + 5, cy + 24, PALETTES.skin, 2, 2);
      }

      // Trousers & Leather Shoes
      px(cx - 4, cy + 27, '#334155', 8, 9);
      px(cx - 5, cy + 36, '#1E293B', 4, 2);
      px(cx + 1, cy + 36, '#1E293B', 4, 2);
    },

    /* ======================================================================= */
    /* PARTICLES: FLOATING HEARTS, SPARKLES, TEARDROPS, QUESTION MARKS, NOTES */
    /* ======================================================================= */
    drawParticles: function(px, ox, oy) {
      particles.forEach(p => {
        const pxPos = p.x + ox;
        const pyPos = p.y + oy;

        if (p.type === 'heart') {
          px(pxPos - 1, pyPos, PALETTES.heartRed, 1, 1);
          px(pxPos + 1, pyPos, PALETTES.heartRed, 1, 1);
          px(pxPos - 1.5, pyPos + 1, PALETTES.heartRed, 4, 1);
          px(pxPos - 1, pyPos + 2, PALETTES.heartRed, 3, 1);
          px(pxPos, pyPos + 3, PALETTES.heartRed, 1, 1);
        } else if (p.type === 'sparkle') {
          // Warm golden sparkle for attentive/encouraging alert
          px(pxPos, pyPos, PALETTES.sparkleGold, 1, 1);
          px(pxPos - 1, pyPos, PALETTES.sparkleGold, 1, 1);
          px(pxPos + 1, pyPos, PALETTES.sparkleGold, 1, 1);
          px(pxPos, pyPos - 1, PALETTES.sparkleGold, 1, 1);
          px(pxPos, pyPos + 1, PALETTES.sparkleGold, 1, 1);
        } else if (p.type === 'note') {
          // Soft music note for gentle reminder
          px(pxPos, pyPos, PALETTES.noteAmber, 1, 3);
          px(pxPos - 1, pyPos + 2, PALETTES.noteAmber, 2, 1);
          px(pxPos, pyPos, PALETTES.noteAmber, 2, 1);
        } else if (p.type === 'tear') {
          px(pxPos, pyPos, PALETTES.tearBlue, 1, 2);
          px(pxPos - 0.5, pyPos + 2, PALETTES.tearBlue, 2, 1);
        } else if (p.type === 'question') {
          px(pxPos - 1, pyPos, '#F59E0B', 3, 1);
          px(pxPos + 1, pyPos + 1, '#F59E0B', 1, 1);
          px(pxPos, pyPos + 2, '#F59E0B', 1, 1);
          px(pxPos, pyPos + 4, '#F59E0B', 1, 1);
        }
      });
    },

    /**
     * Generates a Data URL image of the customized character in a specific emotion
     * for use as Desktop/Push Notification Icon
     */
    getNotificationIconDataUrl: function(overrideEmotion = 'attentive') {
      try {
        const offCanvas = document.createElement('canvas');
        offCanvas.width = 128;
        offCanvas.height = 160;
        this.renderToCanvas(offCanvas, activeCustomization.character, overrideEmotion);
        return offCanvas.toDataURL('image/png');
      } catch(e) {
        return 'icons/icon-192.png';
      }
    },

    /**
     * Generates a Rich Media Hero Card Data URL showing the full-body character,
     * speech bubble, and task information for desktop and Android notifications
     */
    getNotificationHeroCardDataUrl: function(task, overrideEmotion = 'attentive') {
      try {
        const offCanvas = document.createElement('canvas');
        offCanvas.width = 360;
        offCanvas.height = 180;
        const ctx = offCanvas.getContext('2d');
        if (!ctx) return this.getNotificationIconDataUrl(overrideEmotion);

        // 1. Background gradient (Calm forest green)
        const grad = ctx.createLinearGradient(0, 0, 360, 180);
        grad.addColorStop(0, '#1B4225');
        grad.addColorStop(1, '#0E2413');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 360, 180);

        // 2. Draw Full-Body Pixel Character on the left
        const charCanvas = document.createElement('canvas');
        charCanvas.width = 120;
        charCanvas.height = 150;
        this.renderToCanvas(charCanvas, activeCustomization.character, overrideEmotion);
        ctx.drawImage(charCanvas, 12, 15, 120, 150);

        // 3. Speech Card on the right
        ctx.fillStyle = '#FFFDF8';
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(140, 18, 208, 144, 16);
        } else {
          ctx.rect(140, 18, 208, 144);
        }
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#9FC57C';
        ctx.stroke();

        // Speech triangle notch pointing toward character
        ctx.fillStyle = '#FFFDF8';
        ctx.beginPath();
        ctx.moveTo(140, 80);
        ctx.lineTo(130, 88);
        ctx.lineTo(140, 96);
        ctx.closePath();
        ctx.fill();

        // 4. Header & Task Title
        ctx.fillStyle = '#1B4225';
        ctx.font = 'bold 12px sans-serif';
        const charCode = activeCustomization.character || 'dadi';
        let charName = "Kalyani ji";
        if (charCode === 'miko') charName = 'Miko Robot';
        else if (charCode === 'priya') charName = 'Priya';
        else if (charCode === 'aarav') charName = 'Aarav';

        ctx.fillText(`⏰ ${charName} Reminder`, 155, 42);

        ctx.fillStyle = '#1C2C22';
        ctx.font = 'bold 14px sans-serif';
        const rawTitle = (task && task.title) ? task.title : 'Scheduled Activity';
        const title = rawTitle.length > 22 ? rawTitle.substring(0, 20) + '...' : rawTitle;
        ctx.fillText(title, 155, 68);

        ctx.fillStyle = '#5B665E';
        ctx.font = '11px sans-serif';
        ctx.fillText(`Scheduled: ${task?.time || 'Now'}`, 155, 90);
        ctx.fillText("Shall we do it together? 🌟", 155, 108);

        // Action button pill
        ctx.fillStyle = '#234E35';
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(155, 122, 140, 26, 8);
        } else {
          ctx.rect(155, 122, 140, 26);
        }
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('Tap to Open Routine ▶', 165, 139);

        return offCanvas.toDataURL('image/png');
      } catch(e) {
        return this.getNotificationIconDataUrl(overrideEmotion);
      }
    }
  };

  window.SakshamPixelCharacter = SakshamPixelCharacter;

  // Initialize once DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SakshamPixelCharacter.init());
  } else {
    setTimeout(() => SakshamPixelCharacter.init(), 100);
  }

})(window);
