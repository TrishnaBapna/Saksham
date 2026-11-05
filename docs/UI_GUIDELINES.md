# Saksham — UI/UX Design System & Accessibility Guidelines

## 1. Design Philosophy: Compassionate, Calming, Clear

Individuals experiencing memory lapses, anxiety, or cognitive fatigue require an environment free of harsh visual alarms, cluttered toolbars, or abrupt state changes. 

The Saksham visual language is grounded in:
- **Soft Lavender & Purple**: Promotes tranquility, reduces cognitive distress, and provides high perceived comfort.
- **Gentle Rose / Pastel Accents**: Warm emotional anchors that feel welcoming rather than clinical.
- **Generous Tactile Surfaces**: Rounded cards ($16\text{px}-24\text{px}$ radius), deep contrast borders, and ample tap buffers.
- **Unambiguous Visual Cues**: Clear icons accompanied by plain-language labels, never icon-only critical navigation.

---

## 2. Color Palette & Design Tokens

```css
:root {
  /* Primary Lavender & Violet Scale */
  --color-primary-50:  #FAF5FF; /* Subtle background tint */
  --color-primary-100: #F3E8FF; /* Card backgrounds, input surfaces */
  --color-primary-200: #E9D5FF; /* Subtle borders, active states */
  --color-primary-400: #C084FC; /* Accent outlines, badges */
  --color-primary-600: #8B5CF6; /* Primary buttons, active highlights */
  --color-primary-700: #7C3AED; /* Deep actionable purple */
  --color-primary-900: #4C1D95; /* High contrast heading violet */

  /* Gentle Rose / Warm Accents */
  --color-accent-50:   #FFF1F2;
  --color-accent-100:  #FFE4E6;
  --color-accent-500:  #F43F5E;
  --color-accent-soft: #FDE8E8; /* Encouragement & heart accents */

  /* Text & Foreground */
  --color-text-main:   #1E1B4B; /* Deep indigo-slate (WCAG AAA contrast) */
  --color-text-muted:  #4B5563; /* Secondary descriptions */
  --color-text-subtle: #6B7280; /* Metadata, timestamps */

  /* Success & Warm Amber (No punitive red) */
  --color-success-bg:  #ECFDF5;
  --color-success-txt: #065F46;
  --color-reminder-bg: #FEF3C7;
  --color-reminder-txt:#92400E;

  /* Card Radii & Soft Shadows */
  --radius-card:       20px;
  --radius-button:     16px;
  --radius-full:       9999px;
  --shadow-soft:       0 8px 24px -4px rgba(124, 58, 237, 0.08), 0 4px 8px -2px rgba(0, 0, 0, 0.04);
  --shadow-hover:      0 12px 32px -4px rgba(124, 58, 237, 0.16);
}
```

---

## 3. Dynamic Typography & Font Scaling

Readability is non-negotiable. Saksham supports three system-wide font scales:

| Scale Mode | Body Text | Headings (H2/H3) | Page Title (H1) | Minimum Tap Target |
| :--- | :--- | :--- | :--- | :--- |
| **Normal** | 16px (1rem) | 20px - 24px | 28px - 32px | 48px × 48px |
| **Large** | 18px (1.125rem) | 24px - 28px | 34px - 38px | 52px × 52px |
| **Extra Large** | 21px (1.3125rem) | 28px - 32px | 40px - 44px | 60px × 60px |

Typography Rule: Avoid thin font weights (100–300). Use **Medium (500)**, **Semi-bold (600)**, and **Bold (700)** for optimal legibility across varying degrees of visual acuity.

---

## 4. Patient Home Screen Blueprint

```text
┌────────────────────────────────────────────────────────┐
│  [🌸 Saksham]                           [🔊 Audio: ON] │
├────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────┐  │
│  │  [AI Avatar - Asha / Kabir]                      │  │
│  │  "Namaste, Sunita! I'm right here with you."     │  │
│  │  (Animated character with friendly emotion cues) │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │  [ 💬 "What would you like to do?" ]      [ 🎙️ ] │  │
│  └──────────────────────────────────────────────────┘  │
│  Suggested: [Play a game] [Check 11 AM Routine] [My Family]
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ ⏰ NEXT ACTIVITY: 11:00 AM                        │  │
│  │ Morning Hydration & Gentle Arm Stretches          │  │
│  │ [Try Recall / View Cues] [Mark Done]             │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ═══ PRIMARY CARE TILES ══════════════════════════════ │
│  ┌─────────────────────────┐  ┌──────────────────────┐ │
│  │ 📅 Daily Routines & Care│  │ 👨‍👩‍👧 Loved Ones       │ │
│  │ 3-Chance Recall & Tasks │  │ Photos & Family Cues │ │
│  └─────────────────────────┘  └──────────────────────┘ │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 🧩 Mind Games & Room Memory                      │  │
│  │ Fun cognitive exercises & object location aids   │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  📊 Gentle Progress: 2 routines done today • 🌟 Streak │
├────────────────────────────────────────────────────────┤
│  [ 🏠 Home ] [ 📅 Routines ] [ 👨‍👩‍👧 Family ] [ 🧩 Games ] [ ⚙️ ]│
└────────────────────────────────────────────────────────┘
```

---

## 5. Accessibility & Cognitive Inclusivity Mandates

1. **No Failure Shaming**: Streaks and statistics never use red text, broken chains, or guilt-inducing warnings (e.g. "You failed 2 routines"). Instead: "Welcome back! Let's take today one gentle step at a time."
2. **Simple Mode**:
   - Reduces the interface to single-column vertical flow.
   - Hides complex statistics and secondary tabs.
   - Enlarges touch buttons to 64px height.
3. **High Contrast Mode**:
   - Shifts borders to solid high-density dark purple/black (`#0F172A`).
   - Replaces subtle pastel fills with solid high-contrast white and dark surfaces.
4. **Voice Feedback Status Indicator**:
   - Audio is never initiated unexpectedly without a clear visual toggle (`Speaking...` indicator with volume/mute toggle).
5. **Memory Assistance Tray**:
   - Preserves state when opened, dismissed, or paused. No timers reset prematurely.
