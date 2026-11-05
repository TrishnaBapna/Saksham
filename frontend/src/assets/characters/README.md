# Saksham AI Character Asset Specifications & State Engine

## 1. Character Overview

Saksham features two primary companion personas:
- **Asha (आशा)**: A warm, calming female companion with lavender attire, expressive warm eyes, and reassuring demeanor.
- **Kabir (कबीर)**: A gentle, grounded male companion with a lilac vest, attentive posture, and supportive presence.

Both characters share identical state keys, rigging coordinates, and transition timings to guarantee seamless interchangeable rendering.

> **Status Notice (Phase 1 Prototype)**:
> Current rendering uses high-fidelity procedural SVG vector avatars with CSS-driven micro-animations (breathing, blinking, wave, audio pulsing, thinking stars, and celebration confetti).
> Production assets will be upgraded to 60fps Rive / Lottie vector animations in subsequent phases following the exact specifications detailed below.

---

## 2. Supported Character States

Every character MUST support the following 8 states:

| State Key | Emotional Tone | Primary Micro-Animation | Visual Cue |
| :--- | :--- | :--- | :--- |
| `idle` | Calm, present | Subdued chest rise/fall (3s loop), soft periodic eye blink (every 4-5s) | Resting smile, hands resting softly |
| `greeting` | Welcoming, delighted | Gentle one-hand wave gesture, slight head tilt | Open radiant smile, bright eyes |
| `listening` | Attentive, patient | Concentric sound-wave ripples around avatar, slight forward lean | Focused eyes, gentle affirmative nod |
| `thinking` | Reflective, calculating | Slow head tilt, soft floating luminous star/sparkle above head | Eyes glancing upward softly, contemplative mouth |
| `speaking` | Conversational, friendly | Subtle rhythmic mouth articulation synced to speech envelope | Warm engaging smile, gentle head gestures |
| `happy` | Celebratory, proud | Slight bounce, soft confetti/sparkle burst, eye crinkle | Wide joyful smile, thumbs-up / clapping motion |
| `reminder` | Caring, punctual | Gentle ringing bell chime cue, soft attentive hand-to-heart | Reassuring gaze, subtle golden ambient halo |
| `encouraging` | Empathetic, supportive | Heart pulsing badge, two hands open forward | Warm crinkled eyes, comforting nod |

---

## 3. Production Asset Specifications (for Rive / Lottie Delivery)

### Dimension & Frame Rate
- **Canvas Size**: 512 × 512 px (Vector scalable viewBox: `0 0 512 512`)
- **Aspect Ratio**: 1:1 square
- **Target Frame Rate**: 60 fps (smooth interpolation, no jitter)
- **Max File Size**: $\le 150\text{ KB}$ per state for Lottie JSON; $\le 80\text{ KB}$ for Rive `.riv` binary.

### Color Palette Constraints
- **Primary Lavender**: `#7C3AED` and `#8B5CF6`
- **Secondary Lilac Tint**: `#EDE9FE`
- **Accent Rose / Heart**: `#F43F5E` / `#FFE4E6`
- **Skin Tone (Warm Medium)**: `#F7D0B2` with soft rosy cheek tints `#F8A5A5`
- **Hair Colors**: Deep natural espresso `#271813`
- **Ambient Aura**: `#A855F7` with 15% opacity radial gradients

### State Machine Transitions
```text
           ┌──────────┐
           │   IDLE   │◄───────────────┐
           └────┬─────┘                │
                │                      │
     ┌──────────┼──────────┐           │
     ▼          ▼          ▼           │
[LISTENING] [THINKING] [GREETING]      │
     │          │          │           │
     └────┬─────┴──────────┘           │
          ▼                            │
      [SPEAKING]                       │
          │                            │
     ┌────┴────────────┐               │
     ▼                 ▼               │
  [HAPPY]        [ENCOURAGING]         │
     │                 │               │
     └─────────────────┴───────────────┘
```
Transitions between states must use ease-in-out interpolation over 250ms–350ms to prevent abrupt snapping.
