/* ======================================================================= */
/* SAKSHAM 2.0 — ANIMATED CHARACTER & MIKO ROBOT ILLUSTRATION SYSTEM      */
/* 100% Vector, Customizable Clothing/Accessories, Offline & Scalable      */
/* ======================================================================= */

(function(window) {
  'use strict';

  // Default character customization options
  const DEFAULT_CUSTOMIZATION = {
    character: 'dadi',          // 'dadi' | 'miko' | 'priya' | 'aarav'
    outfitColor: '#4A7C59',     // Sage Green (default)
    sareeColor: '#FCEFDE',      // Peach / Cream drape
    accessory: 'none',          // 'none' | 'glasses' | 'flower' | 'headphones'
    expression: 'waving',       // 'waving' | 'happy' | 'thinking' | 'thumbs_up'
    animated: true
  };

  const CHARACTERS = [
    { id: 'dadi', name: 'Kalyani ji', role: 'Dadi', icon: '🌸', desc: 'Gentle, warm grandmother guide' },
    { id: 'miko', name: 'Miko Robot', role: 'Mascot', icon: '🤖', desc: 'Cute AI companion with glowing antenna' },
    { id: 'priya', name: 'Priya', role: 'Adult Guide', icon: '🌿', desc: 'Mindful, calm healthcare guide' },
    { id: 'aarav', name: 'Aarav', role: 'Youth Guide', icon: '⚡', desc: 'Energetic mentor with headphones' }
  ];

  const OUTFIT_PALETTE = [
    { color: '#4A7C59', name: 'Sage Green' },
    { color: '#D97706', name: 'Saffron Gold' },
    { color: '#1B4225', name: 'Royal Forest' },
    { color: '#4338CA', name: 'Deep Indigo' },
    { color: '#E11D48', name: 'Coral Rose' },
    { color: '#0284C7', name: 'Ocean Cyan' }
  ];

  const SAREE_PALETTE = [
    { color: '#FCEFDE', name: 'Warm Peach' },
    { color: '#FCE7F3', name: 'Rose Silk' },
    { color: '#E0F2FE', name: 'Sky Soft' },
    { color: '#DCFCE7', name: 'Mint Frost' },
    { color: '#FEF3C7', name: 'Golden Ivory' }
  ];

  const ACCESSORIES = [
    { id: 'none', name: 'None', icon: '🚫' },
    { id: 'glasses', name: 'Reading Glasses', icon: '👓' },
    { id: 'flower', name: 'Hair Blossom', icon: '🌸' },
    { id: 'headphones', name: 'Headphones', icon: '🎧' }
  ];

  function getSavedCustomization() {
    try {
      const activeStr = localStorage.getItem('saksham_active_user');
      const uid = activeStr ? (JSON.parse(activeStr).uid || 'guest') : 'guest';
      const raw = localStorage.getItem('saksham_companion_' + uid) || localStorage.getItem('saksham_character_customization');
      if (raw) {
        return Object.assign({}, DEFAULT_CUSTOMIZATION, JSON.parse(raw));
      }
    } catch (e) {}
    return Object.assign({}, DEFAULT_CUSTOMIZATION);
  }

  function saveCustomization(opts) {
    try {
      const activeStr = localStorage.getItem('saksham_active_user');
      const uid = activeStr ? (JSON.parse(activeStr).uid || 'guest') : 'guest';
      localStorage.setItem('saksham_companion_' + uid, JSON.stringify(opts));
      localStorage.setItem('saksham_character_customization', JSON.stringify(opts));
    } catch (e) {}
  }

  const SakshamIllustrations = {

    getSavedCustomization,
    saveCustomization,
    CHARACTERS,
    OUTFIT_PALETTE,
    SAREE_PALETTE,
    ACCESSORIES,
    DEFAULT_CUSTOMIZATION,

    /**
     * Master Companion Generator: Renders the active animated companion
     * Supports Dadi, Miko Robot, Priya, and Aarav with customizable outfit & accessories
     */
    getCompanionSvg: function(customOpts = {}) {
      const saved = getSavedCustomization();
      const opts = Object.assign({}, saved, customOpts);
      const size = opts.size || 120;

      if (opts.character === 'miko') {
        return SakshamIllustrations.getMikoRobotSvg(opts, size);
      } else if (opts.character === 'priya') {
        return SakshamIllustrations.getAdultGuideSvg(opts.expression || 'mindful', size, opts);
      } else if (opts.character === 'aarav') {
        return SakshamIllustrations.getYouthGuideSvg(opts.expression || 'dynamic', size, opts);
      } else {
        return SakshamIllustrations.getElderlyGuideSvg(opts.expression || 'waving', size, opts);
      }
    },

    /**
     * MIKO ROBOT — Cute AI companion robot with animated digital eyes & glowing antenna
     */
    getMikoRobotSvg: function(opts = {}, size = 120) {
      const isAnimated = opts.animated !== false;
      const animFloat = isAnimated ? 'animate-companion-float' : '';
      const animEyes = isAnimated ? 'animate-miko-eyes' : '';
      const animAntenna = isAnimated ? 'animate-miko-antenna' : '';
      const animWave = isAnimated ? 'animate-companion-wave' : '';
      const chassisColor = opts.outfitColor || '#38BDF8'; // Accent color for ear cups & trims

      // Miko Accessories
      let accessorySvg = '';
      if (opts.accessory === 'glasses') {
        accessorySvg = `
          <!-- Cyber Visor / Spectacles -->
          <rect x="38" y="40" width="44" height="10" rx="4" fill="#38BDF8" fill-opacity="0.3" stroke="#0284C7" stroke-width="1.5"/>
          <line x1="60" y1="40" x2="60" y2="50" stroke="#0284C7" stroke-width="1.5"/>
        `;
      } else if (opts.accessory === 'flower') {
        accessorySvg = `
          <!-- Cheerful Antenna Blossom -->
          <circle cx="68" cy="12" r="5" fill="#F43F5E"/>
          <circle cx="68" cy="12" r="2.5" fill="#FDE047"/>
        `;
      } else if (opts.accessory === 'headphones') {
        accessorySvg = `
          <!-- DJ Headset over Antenna -->
          <path d="M26 38C26 16 38 12 60 12C82 12 94 16 94 38" stroke="#F59E0B" stroke-width="3.5" stroke-linecap="round"/>
          <rect x="22" y="32" width="7" height="14" rx="3" fill="#F59E0B"/>
          <rect x="91" y="32" width="7" height="14" rx="3" fill="#F59E0B"/>
        `;
      }

      return `
        <svg viewBox="0 0 120 120" width="${size}" height="${size}" class="eldora-character-svg drop-shadow-md select-none ${animFloat}" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Miko Companion Robot">
          <!-- Soft Background Aura -->
          <circle cx="60" cy="60" r="50" fill="#E0F2FE" fill-opacity="0.7"/>

          <!-- Miko Antenna with Glowing Orb -->
          <g class="${animAntenna}">
            <rect x="58" y="14" width="4" height="12" rx="2" fill="#94A3B8"/>
            <circle cx="60" cy="14" r="6" fill="#38BDF8"/>
            <circle cx="60" cy="14" r="3" fill="#FFFFFF"/>
          </g>

          <!-- Robot Body / Lower Base -->
          <ellipse cx="60" cy="104" rx="28" ry="10" fill="#CBD5E1"/>
          <!-- Rollers / Tracks -->
          <rect x="36" y="96" width="48" height="12" rx="6" fill="#334155"/>
          <circle cx="44" cy="102" r="3" fill="#64748B"/>
          <circle cx="60" cy="102" r="3" fill="#64748B"/>
          <circle cx="76" cy="102" r="3" fill="#64748B"/>

          <!-- Miko Torso -->
          <rect x="38" y="70" width="44" height="30" rx="14" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="2"/>
          <!-- Heart / Health Indicator Badge on Chest -->
          <rect x="50" y="76" width="20" height="16" rx="8" fill="#F0FDF4" stroke="#86EFAC" stroke-width="1.5"/>
          <path d="M60 81C59 79.5 56.5 80 56.5 82C56.5 84 60 86.5 60 86.5C60 86.5 63.5 84 63.5 82C63.5 80 61 79.5 60 81Z" fill="#10B981"/>

          <!-- Left Cute Arm (Waving) -->
          <g class="${animWave}">
            <path d="M38 76C30 74 20 62 24 56C28 50 34 60 38 72Z" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="2"/>
            <circle cx="23" cy="55" r="5" fill="${chassisColor}"/>
          </g>

          <!-- Right Arm (Relaxed) -->
          <path d="M82 76C88 80 94 88 90 92C86 96 82 86 82 78Z" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="2"/>
          <circle cx="90" cy="91" r="4" fill="${chassisColor}"/>

          <!-- Miko Robot Head (Curved Capsule) -->
          <rect x="30" y="24" width="60" height="48" rx="22" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="2"/>
          <!-- Ear Pieces -->
          <rect x="25" y="38" width="6" height="18" rx="3" fill="${chassisColor}"/>
          <rect x="89" y="38" width="6" height="18" rx="3" fill="${chassisColor}"/>

          <!-- Face Screen (Glossy Dark Display) -->
          <rect x="36" y="30" width="48" height="36" rx="16" fill="#0F172A"/>

          <!-- Animated Expressive LED Eyes -->
          <g class="${animEyes}">
            <!-- Left Eye (Happy Curved Arch) -->
            <path d="M44 46C44 42 48 40 52 42" stroke="#38BDF8" stroke-width="3.5" stroke-linecap="round"/>
            <circle cx="51" cy="44" r="1.5" fill="#FFFFFF"/>

            <!-- Right Eye (Happy Curved Arch) -->
            <path d="M68 42C72 40 76 42 76 46" stroke="#38BDF8" stroke-width="3.5" stroke-linecap="round"/>
            <circle cx="69" cy="44" r="1.5" fill="#FFFFFF"/>
          </g>

          <!-- Gentle Cheerful Blush -->
          <circle cx="43" cy="54" r="2.5" fill="#38BDF8" fill-opacity="0.4"/>
          <circle cx="77" cy="54" r="2.5" fill="#38BDF8" fill-opacity="0.4"/>

          ${accessorySvg}
        </svg>
      `;
    },

    /**
     * Elderly Guide Character: "Kalyani ji / Dadi"
     * Supports animated waving arm, customizable saree, shawl, glasses, and flower accessory
     */
    getElderlyGuideSvg: function(expression = 'waving', size = 120, customOpts = {}) {
      const opts = Object.assign({}, getSavedCustomization(), customOpts);
      const isAnimated = opts.animated !== false;
      const animFloat = isAnimated ? 'animate-companion-float' : '';
      const animWave = isAnimated ? 'animate-companion-wave' : '';
      const shawlColor = opts.outfitColor || '#4A7C59';
      const sareeColor = opts.sareeColor || '#FCEFDE';

      // Accessory: Glasses
      let accessorySvg = '';
      if (opts.accessory === 'glasses') {
        accessorySvg = `
          <!-- Reading Glasses -->
          <circle cx="53" cy="52" r="5" stroke="#92400E" stroke-width="1.5" fill="#FFFFFF" fill-opacity="0.3"/>
          <circle cx="67" cy="52" r="5" stroke="#92400E" stroke-width="1.5" fill="#FFFFFF" fill-opacity="0.3"/>
          <path d="M58 52H62" stroke="#92400E" stroke-width="1.5"/>
        `;
      } else if (opts.accessory === 'flower') {
        accessorySvg = `
          <!-- Hair Flower in Bun -->
          <circle cx="70" cy="32" r="4.5" fill="#E11D48"/>
          <circle cx="70" cy="32" r="2" fill="#FDE047"/>
        `;
      } else if (opts.accessory === 'headphones') {
        accessorySvg = `
          <!-- Audio Headphones -->
          <path d="M38 50C38 30 48 24 60 24C72 24 82 30 82 50" stroke="#D97706" stroke-width="3" stroke-linecap="round"/>
          <rect x="35" y="46" width="6" height="12" rx="3" fill="#D97706"/>
          <rect x="79" y="46" width="6" height="12" rx="3" fill="#D97706"/>
        `;
      }

      let armSvg = '';
      if (expression === 'waving') {
        armSvg = `
          <!-- Animated Waving Hand -->
          <g class="${animWave}">
            <g transform="translate(14, 58)">
              <path d="M6 18C4 12 8 4 14 6C18 8 16 16 14 22L6 18Z" fill="#F0C7A6"/>
              <circle cx="12" cy="7" r="3" fill="#F0C7A6"/>
              <circle cx="15" cy="9" r="3" fill="#F0C7A6"/>
              <circle cx="15" cy="13" r="2.5" fill="#F0C7A6"/>
            </g>
          </g>
        `;
      } else if (expression === 'thumbs_up') {
        armSvg = `
          <!-- Thumbs-up Hand -->
          <g transform="translate(18, 54)">
            <path d="M10 18C8 12 10 6 15 6C18 6 18 10 16 14L18 20L10 18Z" fill="#F0C7A6"/>
            <rect x="13" y="4" width="4" height="6" rx="2" fill="#F0C7A6"/>
          </g>
        `;
      } else if (expression === 'thinking') {
        armSvg = `
          <!-- Hand touching cheek in thinking pose -->
          <g transform="translate(42, 60)">
            <path d="M8 16C6 10 8 4 12 5C16 6 15 12 14 18Z" fill="#F0C7A6"/>
            <circle cx="12" cy="6" r="3" fill="#F0C7A6"/>
          </g>
        `;
      }

      return `
        <svg viewBox="0 0 120 120" width="${size}" height="${size}" class="eldora-character-svg drop-shadow-sm select-none ${animFloat}" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Elderly Guide Kalyani ji">
          <!-- Warm Aura Circle -->
          <circle cx="60" cy="60" r="50" fill="#F8E5CA" fill-opacity="0.6"/>
          <!-- Calming Botanical Foliage -->
          <path d="M98 42C106 48 108 60 102 68C96 76 86 78 80 72C84 56 90 46 98 42Z" fill="#A4C4A8"/>
          <path d="M18 50C12 56 12 68 18 74C24 80 34 80 38 72C34 60 26 52 18 50Z" fill="#B7D3BB"/>
          
          <!-- Torso & Customizable Shawl -->
          <path d="M30 115C30 92 42 82 60 82C78 82 90 92 90 115Z" fill="${shawlColor}"/>
          <!-- Saree drape peach/cream/custom -->
          <path d="M48 84C54 94 62 108 68 115H52C44 105 40 95 38 88L48 84Z" fill="${sareeColor}"/>
          
          <!-- Neck -->
          <rect x="53" y="68" width="14" height="18" rx="6" fill="#F0C7A6"/>
          
          <!-- Head -->
          <circle cx="60" cy="54" r="22" fill="#F0C7A6"/>
          <!-- Kind Eyes & Gentle Smile -->
          <path d="M52 52C53 51 55 51 56 52" stroke="#684733" stroke-width="2" stroke-linecap="round"/>
          <path d="M64 52C65 51 67 51 68 52" stroke="#684733" stroke-width="2" stroke-linecap="round"/>
          <path d="M54 62C57 65 63 65 66 62" stroke="#8A4A32" stroke-width="2" stroke-linecap="round"/>
          <circle cx="50" cy="58" r="3" fill="#E8967D" fill-opacity="0.4"/>
          <circle cx="70" cy="58" r="3" fill="#E8967D" fill-opacity="0.4"/>
          <!-- Traditional Red Bindi -->
          <circle cx="60" cy="46" r="2" fill="#C43838"/>
          
          <!-- Gray/Silver Hair with Bun -->
          <path d="M38 52C38 38 48 32 60 32C72 32 82 38 82 52C82 54 80 54 78 48C72 38 48 38 42 48C40 54 38 54 38 52Z" fill="#D6D6DB"/>
          <circle cx="60" cy="30" r="10" fill="#BEBEC4"/>
          
          ${accessorySvg}
          ${armSvg}
        </svg>
      `;
    },

    /**
     * Adult Guide Character: "Priya / Rohan"
     */
    getAdultGuideSvg: function(expression = 'mindful', size = 100, customOpts = {}) {
      const opts = Object.assign({}, getSavedCustomization(), customOpts);
      const isAnimated = opts.animated !== false;
      const animFloat = isAnimated ? 'animate-companion-float' : '';
      const coatColor = opts.outfitColor || '#0D9488';

      let accessorySvg = '';
      if (opts.accessory === 'glasses') {
        accessorySvg = `
          <circle cx="44" cy="42" r="4.5" stroke="#0F172A" stroke-width="1.5" fill="#FFFFFF" fill-opacity="0.2"/>
          <circle cx="56" cy="42" r="4.5" stroke="#0F172A" stroke-width="1.5" fill="#FFFFFF" fill-opacity="0.2"/>
          <path d="M48.5 42H51.5" stroke="#0F172A" stroke-width="1.5"/>
        `;
      }

      return `
        <svg viewBox="0 0 100 100" width="${size}" height="${size}" class="eldora-character-svg drop-shadow-sm select-none ${animFloat}" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Adult Guide Priya">
          <circle cx="50" cy="50" r="42" fill="#E6F4F1"/>
          <!-- Shoulders in customizable coat -->
          <path d="M25 95C25 75 35 68 50 68C65 68 75 75 75 95Z" fill="${coatColor}"/>
          <!-- Neck -->
          <rect x="44" y="55" width="12" height="15" rx="5" fill="#E2BA98"/>
          <!-- Head -->
          <circle cx="50" cy="44" r="18" fill="#E2BA98"/>
          <!-- Focused, friendly eyes -->
          <path d="M42 42C43 41 45 41 46 42" stroke="#4A3427" stroke-width="2" stroke-linecap="round"/>
          <path d="M54 42C55 41 57 41 58 42" stroke="#4A3427" stroke-width="2" stroke-linecap="round"/>
          <path d="M46 51C48 53 52 53 54 51" stroke="#4A3427" stroke-width="2" stroke-linecap="round"/>
          <!-- Neat hair -->
          <path d="M32 40C32 28 40 24 50 24C60 24 68 28 68 40C68 42 66 42 64 36C58 28 42 28 36 36C34 42 32 42 32 40Z" fill="#2E241E"/>
          ${accessorySvg}
        </svg>
      `;
    },

    /**
     * Youth Guide Character: "Aarav"
     */
    getYouthGuideSvg: function(expression = 'dynamic', size = 100, customOpts = {}) {
      const opts = Object.assign({}, getSavedCustomization(), customOpts);
      const isAnimated = opts.animated !== false;
      const animFloat = isAnimated ? 'animate-companion-float' : '';
      const hoodieColor = opts.outfitColor || '#4F46E5';

      return `
        <svg viewBox="0 0 100 100" width="${size}" height="${size}" class="eldora-character-svg drop-shadow-md select-none ${animFloat}" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Youth Guide Aarav">
          <circle cx="50" cy="50" r="42" fill="#312E81"/>
          <path d="M25 95C25 72 35 66 50 66C65 66 75 72 75 95Z" fill="${hoodieColor}"/>
          <!-- Hoodie collar -->
          <path d="M42 66L50 78L58 66" stroke="#818CF8" stroke-width="3"/>
          <rect x="44" y="52" width="12" height="15" rx="5" fill="#F3C59D"/>
          <circle cx="50" cy="42" r="18" fill="#F3C59D"/>
          <!-- Modern messy hair & headphones -->
          <path d="M30 36C30 22 40 18 50 18C60 18 70 22 70 36C70 42 64 36 60 28C52 24 44 26 38 34C34 40 30 42 30 36Z" fill="#1E1B4B"/>
          <!-- Headphones -->
          <path d="M28 42C28 26 36 20 50 20C64 20 72 26 72 42" stroke="#F59E0B" stroke-width="4" stroke-linecap="round"/>
          <rect x="25" y="38" width="6" height="12" rx="3" fill="#F59E0B"/>
          <rect x="69" y="38" width="6" height="12" rx="3" fill="#F59E0B"/>
        </svg>
      `;
    },

    /**
     * Eldora Activity Scene Spot Illustrations (Vector SVGs)
     */
    getActivitySceneSvg: function(type = 'medication', size = 48) {
      if (type === 'medication') {
        return `
          <svg viewBox="0 0 64 64" width="${size}" height="${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="28" fill="#E8F1F5"/>
            <!-- Pill bottle -->
            <rect x="22" y="24" width="20" height="26" rx="6" fill="#2C698D"/>
            <rect x="20" y="20" width="24" height="6" rx="3" fill="#D5E3EB"/>
            <!-- Sparkle heart -->
            <path d="M32 32C30 30 28 32 28 34C28 37 32 40 32 40C32 40 36 37 36 34C36 32 34 30 32 32Z" fill="#FFFFFF"/>
            <!-- Floating capsule -->
            <g transform="translate(38, 14) rotate(35)">
              <rect x="0" y="0" width="8" height="16" rx="4" fill="#FCEFDE"/>
              <rect x="0" y="0" width="8" height="8" rx="4" fill="#E5484D"/>
            </g>
          </svg>
        `;
      } else if (type === 'mind_games') {
        return `
          <svg viewBox="0 0 64 64" width="${size}" height="${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="28" fill="#FCEFDE"/>
            <!-- Puzzle pieces / Brain spark -->
            <path d="M22 28C22 24 26 22 30 22C33 22 35 24 37 26C39 24 41 22 44 22C48 22 50 25 50 29C50 34 46 38 42 40C40 44 36 46 32 46C26 46 22 41 22 36C22 34 23 32 24 30C23 29 22 28.5 22 28Z" fill="#B86A1D"/>
            <circle cx="32" cy="33" r="5" fill="#FFFFFF"/>
            <!-- Sparkles -->
            <path d="M46 16L48 20L52 22L48 24L46 28L44 24L40 22L44 20Z" fill="#F59E0B"/>
          </svg>
        `;
      } else if (type === 'movement') {
        return `
          <svg viewBox="0 0 64 64" width="${size}" height="${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="28" fill="#EBF3EC"/>
            <!-- Park tree & walking shoes -->
            <circle cx="22" cy="26" r="10" fill="#A4C4A8"/>
            <rect x="20" y="32" width="4" height="12" fill="#684733"/>
            <!-- Walking sneaker silhouette -->
            <path d="M26 42C28 36 36 34 44 38L46 44H26Z" fill="#234E35"/>
            <rect x="24" y="44" width="24" height="4" rx="2" fill="#D7E6D9"/>
          </svg>
        `;
      } else if (type === 'family' || type === 'memories') {
        return `
          <svg viewBox="0 0 64 64" width="${size}" height="${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="28" fill="#F1EBF5"/>
            <!-- Photo frame with heart -->
            <rect x="18" y="18" width="28" height="28" rx="6" fill="#FFFFFF" stroke="#7A4988" stroke-width="2"/>
            <path d="M32 26C30 24 26 26 26 29C26 33 32 38 32 38C32 38 38 33 38 29C38 26 34 24 32 26Z" fill="#7A4988"/>
          </svg>
        `;
      } else if (type === 'doctor') {
        return `
          <svg viewBox="0 0 64 64" width="${size}" height="${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="28" fill="#E8F1F5"/>
            <rect x="24" y="24" width="16" height="22" rx="4" fill="#FFFFFF" stroke="#2C698D" stroke-width="2"/>
            <circle cx="32" cy="20" r="7" fill="#F0C7A6"/>
            <path d="M28 26C28 32 36 32 36 26" stroke="#2C698D" stroke-width="2" fill="none"/>
            <circle cx="32" cy="34" r="2.5" fill="#2C698D"/>
          </svg>
        `;
      } else if (type === 'caregiver') {
        return `
          <svg viewBox="0 0 64 64" width="${size}" height="${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="28" fill="#FCEFDE"/>
            <circle cx="32" cy="20" r="7" fill="#F0C7A6"/>
            <path d="M24 44C24 35 28 30 32 30C36 30 40 35 40 44Z" fill="#4A7C59"/>
            <path d="M32 35C31 33 28 34 28 36C28 39 32 42 32 42C32 42 36 39 36 36C36 34 33 33 32 35Z" fill="#E5484D"/>
          </svg>
        `;
      }

      return '';
    }
  };

  window.SakshamIllustrations = SakshamIllustrations;

})(window);
