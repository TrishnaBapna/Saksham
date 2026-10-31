/* ======================================================================= */
/* SAKSHAM 2.0 — FULL-BODY PIXEL CHARACTER ENGINE                          */
/* Dynamic, expressive retro pixel companion with multi-emotion animations */
/* Supports: happy, sad, angry (caring reminder), idle, talking, thinking  */
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
  let activeCustomization = {
    character: 'dadi',
    outfitColor: '#D97706',
    sareeColor: '#FCE7F3',
    accessory: 'flower'
  };

  // Particles (hearts, steam, tears, question marks)
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
    steamGrey: '#CBD5E1',
    heartRed: '#EF4444',
    // Miko Robot Palette
    mikoBody: '#387D82',
    mikoDark: '#1E293B',
    mikoCyan: '#06B6D4',
    mikoGlow: '#22D3EE',
    mikoScreen: '#0F172A',
    mikoYellow: '#FBBF24',
    mikoRed: '#EF4444'
  };

  const SakshamPixelCharacter = {
    init: function() {
      this.syncCustomizationFromStorage();
      this.startAnimationLoop();
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

    setEmotion: function(emotion, durationMs = 0, onComplete = null) {
      currentEmotion = emotion;
      particles = [];

      // Spawn initial particles based on emotion
      if (emotion === 'happy') {
        particles.push({ type: 'heart', x: 24, y: 8, life: 1.0, dy: -0.3 });
        particles.push({ type: 'sparkle', x: 8, y: 10, life: 0.9, dy: -0.2 });
      } else if (emotion === 'angry') {
        particles.push({ type: 'steam', x: 7, y: 6, life: 1.0, dy: -0.2 });
        particles.push({ type: 'exclamation', x: 25, y: 6, life: 1.0, dy: -0.1 });
      } else if (emotion === 'sad') {
        particles.push({ type: 'tear', x: 12, y: 15, life: 1.0, dy: 0.3 });
      } else if (emotion === 'thinking') {
        particles.push({ type: 'question', x: 23, y: 5, life: 1.0, dy: -0.15 });
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
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= 0.05;
        p.y += p.dy;
        if (p.life <= 0) {
          particles.splice(i, 1);
        }
      }

      // Periodically spawn ongoing emotion particles
      if (animFrame % 10 === 0) {
        if (currentEmotion === 'happy') {
          particles.push({ type: 'heart', x: 12 + Math.floor(Math.random() * 10), y: 8, life: 1.0, dy: -0.25 });
        } else if (currentEmotion === 'angry') {
          particles.push({ type: 'steam', x: 6 + Math.floor(Math.random() * 4), y: 7, life: 0.9, dy: -0.2 });
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
      const emotion = overrideEmotion || currentEmotion;
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
      if (emotion === 'happy') {
        // Joyful jumping hop
        yBob = (animFrame % 4 === 0 || animFrame % 4 === 1) ? -2 : 0;
        xHop = (animFrame % 6 < 3) ? 1 : -1;
      } else if (emotion === 'angry') {
        // Tapping shake / agitated lean
        yBob = 0;
        xHop = (animFrame % 4 < 2) ? 0 : 1;
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
      this.drawParticles(px, xHop, yBob);
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
      if (emotion === 'angry') {
        // Furrowed inward / stern reminder look
        px(cx - 4, cy + 9, PALETTES.hairDark, 3, 1);
        px(cx - 2, cy + 10, PALETTES.hairDark, 1, 1);
        px(cx + 1, cy + 10, PALETTES.hairDark, 1, 1);
        px(cx + 2, cy + 9, PALETTES.hairDark, 3, 1);
      } else if (emotion === 'sad') {
        // Slanted down sad brows
        px(cx - 4, cy + 10, PALETTES.hairDark, 1, 1);
        px(cx - 3, cy + 9, PALETTES.hairDark, 2, 1);
        px(cx + 1, cy + 9, PALETTES.hairDark, 2, 1);
        px(cx + 3, cy + 10, PALETTES.hairDark, 1, 1);
      } else {
        // Gentle arch
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
        // Drooping sad eyes
        px(cx - 4, cy + 11, PALETTES.hairDark, 2, 2);
        px(cx + 2, cy + 11, PALETTES.hairDark, 2, 2);
      } else {
        // Normal warm eyes
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
      } else if (emotion === 'angry') {
        // Pouty/firm line
        px(cx - 2, cy + 14, PALETTES.hairDark, 4, 1);
        px(cx - 3, cy + 15, PALETTES.hairDark, 1, 1);
        px(cx + 2, cy + 15, PALETTES.hairDark, 1, 1);
      } else if (emotion === 'sad') {
        // Downturned frown curve
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
        px(cx - 1, cy + 15, PALETTES.hairDark, 2, 1);
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
        // Left arm up
        px(cx - 7, cy + 16 - waveOffset, outfitColor, 2, 4);
        px(cx - 9, cy + 13 - waveOffset, outfitColor, 2, 4);
        px(cx - 9, cy + 11 - waveOffset, PALETTES.skin, 2, 2); // Left hand
        // Right arm up
        px(cx + 5, cy + 16 + waveOffset, outfitColor, 2, 4);
        px(cx + 7, cy + 13 + waveOffset, outfitColor, 2, 4);
        px(cx + 7, cy + 11 + waveOffset, PALETTES.skin, 2, 2); // Right hand
      } else if (emotion === 'angry') {
        // Hands on hips stance (\ _ /) — "Hey, you missed your task!"
        // Left arm bent to hip
        px(cx - 7, cy + 18, outfitColor, 2, 4);
        px(cx - 8, cy + 21, outfitColor, 2, 3);
        px(cx - 6, cy + 23, PALETTES.skin, 2, 2);
        // Right arm bent to hip
        px(cx + 5, cy + 18, outfitColor, 2, 4);
        px(cx + 6, cy + 21, outfitColor, 2, 3);
        px(cx + 4, cy + 23, PALETTES.skin, 2, 2);
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
        px(cx + 8, cy + 14, PALETTES.skin, 2, 2); // Pointing hand
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

      // 6. Feet & Slippers
      const footTap = (emotion === 'angry' && frame % 4 < 2) ? -1 : 0;
      px(cx - 4, cy + 36, PALETTES.skin, 3, 2);
      px(cx + 1, cy + 36 + footTap, PALETTES.skin, 3, 2);
      px(cx - 5, cy + 37, '#78350F', 4, 1);
      px(cx + 1, cy + 37 + footTap, '#78350F', 4, 1);
    },

    /* ======================================================================= */
    /* CHARACTER 2: MIKO ROBOT — RETRO CYBER COMPANION                         */
    /* ======================================================================= */
    drawMikoRobot: function(px, emotion, frame, outfitColor, accessory, ox, oy) {
      const cx = 16 + ox;
      const cy = oy;

      // 1. Antenna & LED Light
      const ledColor = (emotion === 'angry') ? PALETTES.mikoRed : (emotion === 'happy') ? '#10B981' : PALETTES.mikoGlow;
      px(cx - 1, cy + 2, ledColor, 2, 2);
      px(cx - 0.5, cy + 4, PALETTES.mikoDark, 1, 3);

      // 2. Chassis Head
      px(cx - 7, cy + 7, outfitColor, 14, 10);
      px(cx - 8, cy + 9, PALETTES.mikoDark, 1, 6); // Left ear bolt
      px(cx + 7, cy + 9, PALETTES.mikoDark, 1, 6); // Right ear bolt

      // LED Screen Face
      px(cx - 5, cy + 9, PALETTES.mikoScreen, 10, 6);

      // Robot Eyes / Expression Screen
      if (emotion === 'happy') {
        // Heart eyes or happy arches
        px(cx - 4, cy + 11, PALETTES.heartRed, 3, 2);
        px(cx + 1, cy + 11, PALETTES.heartRed, 3, 2);
      } else if (emotion === 'angry') {
        // Red angry laser eyes (> <)
        px(cx - 4, cy + 10, PALETTES.mikoRed, 3, 1);
        px(cx - 3, cy + 11, PALETTES.mikoRed, 2, 1);
        px(cx + 1, cy + 11, PALETTES.mikoRed, 2, 1);
        px(cx + 2, cy + 10, PALETTES.mikoRed, 3, 1);
      } else if (emotion === 'sad') {
        // Blue tear dots
        px(cx - 4, cy + 11, PALETTES.mikoCyan, 2, 2);
        px(cx + 2, cy + 11, PALETTES.mikoCyan, 2, 2);
        px(cx - 3, cy + 13, PALETTES.tearBlue, 1, 1);
      } else if (emotion === 'talking') {
        // Oscillating waveform
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
      px(cx - 2, cy + 21, PALETTES.mikoGlow, 4, 2);

      // 4. Robot Arms
      if (emotion === 'happy') {
        // Upward celebratory wave
        px(cx - 8, cy + 17, outfitColor, 2, 4);
        px(cx - 9, cy + 14, PALETTES.mikoDark, 2, 3);
        px(cx + 6, cy + 17, outfitColor, 2, 4);
        px(cx + 7, cy + 14, PALETTES.mikoDark, 2, 3);
      } else if (emotion === 'angry') {
        // Stern robot clamp hands on waist
        px(cx - 8, cy + 19, outfitColor, 2, 4);
        px(cx - 7, cy + 23, PALETTES.mikoDark, 2, 2);
        px(cx + 6, cy + 19, outfitColor, 2, 4);
        px(cx + 5, cy + 23, PALETTES.mikoDark, 2, 2);
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
      px(cx + 4, cy + 4, PALETTES.hairDark, 4, 6); // Ponytail side
      if (accessory === 'flower') px(cx + 3, cy + 4, '#F43F5E', 2, 2);

      // Face
      px(cx - 4, cy + 7, PALETTES.skin, 8, 8);
      // Eyes & Mouth
      if (emotion === 'happy') {
        px(cx - 3, cy + 10, PALETTES.hairDark, 2, 1);
        px(cx + 1, cy + 10, PALETTES.hairDark, 2, 1);
        px(cx - 2, cy + 12, '#EF4444', 4, 2);
      } else if (emotion === 'angry') {
        px(cx - 3, cy + 9, PALETTES.hairDark, 2, 1);
        px(cx + 1, cy + 9, PALETTES.hairDark, 2, 1);
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
      px(cx - 1, cy + 16, '#F8FAFC', 2, 10); // White zipper

      // Arms
      if (emotion === 'happy') {
        px(cx - 7, cy + 15, outfitColor, 2, 5);
        px(cx - 7, cy + 13, PALETTES.skin, 2, 2);
        px(cx + 5, cy + 15, outfitColor, 2, 5);
        px(cx + 5, cy + 13, PALETTES.skin, 2, 2);
      } else if (emotion === 'angry') {
        px(cx - 7, cy + 18, outfitColor, 2, 4);
        px(cx - 6, cy + 22, PALETTES.skin, 2, 2);
        px(cx + 5, cy + 18, outfitColor, 2, 4);
        px(cx + 4, cy + 22, PALETTES.skin, 2, 2);
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
      if (emotion === 'angry') {
        px(cx - 3, cy + 9, PALETTES.hairDark, 2, 1);
        px(cx + 1, cy + 9, PALETTES.hairDark, 2, 1);
        px(cx - 2, cy + 13, PALETTES.hairDark, 4, 1);
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
      px(cx - 1, cy + 16, '#F8FAFC', 2, 5); // White inner collar
      px(cx - 0.5, cy + 18, '#DC2626', 1, 3); // Tie

      // Arms
      if (emotion === 'happy') {
        px(cx - 7, cy + 15, outfitColor, 2, 5);
        px(cx - 7, cy + 13, PALETTES.skin, 2, 2);
        px(cx + 5, cy + 15, outfitColor, 2, 5);
        px(cx + 5, cy + 13, PALETTES.skin, 2, 2);
      } else if (emotion === 'angry') {
        px(cx - 7, cy + 18, outfitColor, 2, 4);
        px(cx - 6, cy + 22, PALETTES.skin, 2, 2);
        px(cx + 5, cy + 18, outfitColor, 2, 4);
        px(cx + 4, cy + 22, PALETTES.skin, 2, 2);
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
    /* PARTICLES: FLOATING HEARTS, STEAM PUFFS, TEARDROPS, QUESTION MARKS     */
    /* ======================================================================= */
    drawParticles: function(px, ox, oy) {
      particles.forEach(p => {
        const pxPos = p.x + ox;
        const pyPos = p.y + oy;

        if (p.type === 'heart') {
          // Pixel Heart
          px(pxPos - 1, pyPos, PALETTES.heartRed, 1, 1);
          px(pxPos + 1, pyPos, PALETTES.heartRed, 1, 1);
          px(pxPos - 1.5, pyPos + 1, PALETTES.heartRed, 4, 1);
          px(pxPos - 1, pyPos + 2, PALETTES.heartRed, 3, 1);
          px(pxPos, pyPos + 3, PALETTES.heartRed, 1, 1);
        } else if (p.type === 'steam') {
          // Steam puff for angry reminder
          px(pxPos, pyPos, PALETTES.steamGrey, 2, 2);
          px(pxPos - 1, pyPos + 1, PALETTES.steamGrey, 1, 1);
          px(pxPos + 1, pyPos - 1, PALETTES.steamGrey, 1, 1);
        } else if (p.type === 'tear') {
          // Teardrop for sad
          px(pxPos, pyPos, PALETTES.tearBlue, 1, 2);
          px(pxPos - 0.5, pyPos + 2, PALETTES.tearBlue, 2, 1);
        } else if (p.type === 'question') {
          // Question mark for thinking
          px(pxPos - 1, pyPos, '#F59E0B', 3, 1);
          px(pxPos + 1, pyPos + 1, '#F59E0B', 1, 1);
          px(pxPos, pyPos + 2, '#F59E0B', 1, 1);
          px(pxPos, pyPos + 4, '#F59E0B', 1, 1);
        } else if (p.type === 'exclamation') {
          // Exclamation mark for angry alert
          px(pxPos, pyPos, '#EF4444', 1, 3);
          px(pxPos, pyPos + 4, '#EF4444', 1, 1);
        }
      });
    },

    /**
     * Generates a Data URL image of the customized character in a specific emotion
     * for use as Desktop/Push Notification Icon
     */
    getNotificationIconDataUrl: function(overrideEmotion = 'angry') {
      try {
        const offCanvas = document.createElement('canvas');
        offCanvas.width = 128;
        offCanvas.height = 160;
        this.renderToCanvas(offCanvas, activeCustomization.character, overrideEmotion);
        return offCanvas.toDataURL('image/png');
      } catch(e) {
        return 'icons/icon-192.png';
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
