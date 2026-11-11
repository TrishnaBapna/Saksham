# SAKSHAM NEURO-CARE — STAGE 7.5.1.4
## Asha Character Redesign & Reference-Matching Implementation Plan

**Document Version:** 1.0.0  
**Date:** 11 November 2026  
**Repository:** `/Users/trishnabapna/Desktop/Saksham`  
**Branch:** `phase-2-patient-experience`  
**Governing Directive:** User Request — Strict Google Flow Reference Matching (No Independent Character Design)  
**Firebase Plan:** Spark Free Tier ($0.00 / Zero Paid APIs / Zero Cloud Functions)  
**Status:** Planning & Visual Analysis Report (Awaiting Product Owner Approval)

---

## 1. Executive Summary & Directive Acknowledgment

The Product Owner has rejected all procedurally generated iterations of Asha's 3D character asset. The procedural geometry, constructed via mathematical equations (spheres, cylinders, ellipsoids), produced a rigid, artificial, doll-like mannequin that fails to reproduce the organic facial anatomy, hair volume, and cinematic warmth of the approved references.

### Governing Reference Authority
1. **Dynamic Visual Authority:** Google Flow Reference Video (`media_1794386144637_fee2920c.mp4` / `media_1794384438352_9bdfe6fa.mp4`)
2. **Turnaround & Specification Authority:** Asha 3D Character Sheet with Orthogonal Turnaround (`asha_3d_turnaround_reference.jpg`)
3. **Expression Matrix Authority:** Aira 30-Expression Caregiver Registry Reference Sheet (`aira_30_expressions_reference.jpg`)

### Strict Constraints
- **Do not invent a new character.**
- **Do not reinterpret the references into a flat or chibi anime doll.**
- **Do not use the existing `asha.glb` as visual authority.**
- **Preserve existing files, branch, and commits without modification.**
- **Stop after this planning report and wait for Product Owner approval before implementing the visual prototype.**

---

## 2. Visual Analysis & Reference Comparison

```
+---------------------------------------------------------------------------------------------------+
|                                 GOVERNING REFERENCE HIERARCHY                                     |
|                                                                                                   |
|  [ REFERENCE 1: Google Flow Video ]    --> Cinematic motion, natural speech articulation, organic |
|  (fee2920c.mp4 / 9bdfe6fa.mp4)             head tilt, breathing, soft cloth drape, warm lighting  |
|                                                                                                   |
|  [ REFERENCE 2: 3D Turnaround Sheet ]  --> Orthogonal Front 3/4, Profile Right, Back View,        |
|  (asha_3d_turnaround_reference.jpg)        large close-up bust, 15 expression cards               |
|                                                                                                   |
|  [ REFERENCE 3: 30 Expression Sheet ]  --> Clinical expression mapping (Conversation, Support,    |
|  (aira_30_expressions_reference.jpg)       Guidance, Memory Recall, Mood & Well-being)            |
+---------------------------------------------------------------------------------------------------+
```

### Reference 1: Google Flow Video (`fee2920c.mp4` / `9bdfe6fa.mp4`)
- **Visual Style:** Polished, cinematic, 3D animated character comparable to high-end animated feature films (e.g. Sony Pictures Animation / Disney / Pixar stylized realism).
- **Facial Anatomy:** Continuous, organic facial surface. Cheeks lift naturally during speech; lips articulate fluidly without pinching; eyelids deform smoothly over the eyeballs with realistic lid creases.
- **Hair Movement:** Soft physics dynamics on the wavy bob and crown bun. Individual clump volume with soft separation and natural highlights.
- **Clothing Dynamics:** Lavender hoodie fabric has weight, realistic elbow creases, and natural collar drape over the inner white t-shirt.

### Reference 2: Asha 3D Turnaround Sheet (`asha_3d_turnaround_reference.jpg`)
- **Orthogonal 3/4 View:** Confident standing pose; cropped lavender zip hoodie ending at natural waist; dark slate cargo trousers with large bellows pockets; skate sneakers.
- **Right Side Profile (Sagittal Authority):**
  - Cranium has full rounded volume at the back.
  - Messy bun sits high at the crown apex.
  - Feminine profile: smooth forehead slope, dainty nasal bridge, rounded button tip protruding gently, soft philtrum, defined Cupid's bow, subtle mentolabial sulcus, rounded chin, clean jawline angle to ear.
  - Hoodie cowl draped over upper back.
- **Close-up Bust:**
  - Warm, creamy-peach skin tone with soft peachy-coral cheek and nose blush.
  - Large warm amber/chocolate almond eyes with dual white specular highlights.
  - Two parallel lilac barrettes on the right temple; blossom flower pin on the left bun base; purple lanyard with white flower ID card.

### Reference 3: Aira 30-Expression Matrix (`aira_30_expressions_reference.jpg`)
- 30 distinct emotional and clinical states categorized into:
  1. General / Conversation (Neutral, Listening, Thinking, Explaining, Acknowledging, Surprised)
  2. Emotional Support (Happy, Encouraging, Reassuring, Comforting, Concerned, Empathetic)
  3. Reminders / Guidance (Reminder, Alert, Guiding, Confirming, Noting, Completed)
  4. Memory & Recall (Helping Recall, Past Reference, Recognizing, Clarifying, Understanding, Remembered)
  5. Mood & Well-being (Calm, Relaxed, Motivated, Proud, Tired, Resting)

---

## 3. Root Cause Analysis: Why Procedural Code Failed

| Previous Approach (Procedural Python) | Actual Defect Observed | Product Owner Impact |
| :--- | :--- | :--- |
| **Sphere-based Cranium & Jaw** | UV sphere with arbitrary radius equations. Lacks jawline, zygomatic arches, and chin pad. | "Looks like an egg-shaped head / mannequin." |
| **Floating Eye/Nose Patches** | Planar geometry hovering in front of the skull. | "Disconnected floating eyes, nose or mouth." |
| **Cylindrical Limbs & Torso** | Rigid lathe-extruded cylinders with flat cutoffs. | "Looks like a wooden doll / plastic mannequin." |
| **Flat Cut Hair Cap** | Hemisphere with sinusoidal ridge displacement. | "Looks like a rubber helmet / swim cap." |
| **Procedural Math Inherent Limitation** | Equations produce geometric primitives, not organic human anatomy. | **FUNDAMENTALLY INCAPABLE of producing Pixar-quality organic characters.** |

**Conclusion:** Procedural geometry generation is permanently retired for Asha's visual design.

---

## 4. Recommended Modeling Workflow & Toolchain Analysis

To produce a genuine, high-quality 3D character matching the Google Flow reference:

### Professional Character Creation Pipeline

```
[ Step 1: Base Humanoid Mesh ] 
  --> Clean quad-dominant topology with anatomical eye/mouth edge loops
         |
         v
[ Step 2: Reference-Guided Sculpting ]
  --> Match Front, Side Profile, and Back turnaround silhouettes from Reference 2
         |
         v
[ Step 3: Layered 3D Hair Clump Modeling ]
  --> Forehead side-swept bangs, wavy side locks, messy crown bun, flower pin & clips
         |
         v
[ Step 4: Clothing Construction ]
  --> Cropped lavender hoodie, draped hood, drawstrings, cargo pants, sneakers
         |
         v
[ Step 5: High-Res PBR Texturing ]
  --> Warm creamy peach skin, amber eyes with catchlights, hair sheen, fabric weave
         |
         v
[ Step 6: Visual Prototype Approval ]  <=== MANDATORY GATEWAY (STOP HERE)
  --> Review static 3D model against Google Flow video & turnaround sheets
         |
         v
[ Step 7: Rigging & Blendshapes (Post-Approval) ]
  --> 21-bone humanoid skeleton, skin weights, 5 vowel visemes, 18 morph targets
         |
         v
[ Step 8: WebGL Optimization & Integration ]
  --> Export valid GLB (<= 22k tris, <= 4.5 MB), test in Three.js r160 viewer
```

### Toolchain Evaluation

| Tool / Option | Role in Pipeline | Strengths | Constraints |
| :--- | :--- | :--- | :--- |
| **VRoid Studio (User / Artist)** | Character Base & Turnaround Sculpting | Native support for stylized 3D anime/Pixar characters; intuitive hair clump sculpting; clothes texturing; exports rigged VRM 1.0 with 21 bones and 52 blendshapes out of the box. | Requires desktop GUI; cannot run headless in terminal sandbox. |
| **Blender 4.x / ZBrush (User / Artist)** | Full Digital Sculpting & Retopology | Unlimited artistic control; organic sculpting against reference image planes; precise quad topology; PBR texture baking. | Requires desktop GUI and 3D artist execution. |
| **AI 3D Mesh Generation (e.g. Meshy / Rodin / Tripo3D)** | Multi-view Image-to-3D | Generates 3D mesh directly from turnaround sheet (`asha_3d_turnaround_reference.jpg`). | Mesh is often dense/triangulated; requires retopology and bone rigging. |
| **Headless Base-Mesh Retopology Engine (In-Sandbox)** | Sandbox Asset Assembly | Imports clean humanoid base topology OBJ/glTF, refines vertices to match reference landmarks, applies PBR atlas, compiles GLB. | Relies on existing base topology rather than freehand mouse sculpting. |

---

## 5. Visual Identity Preservation Matrix

| Feature | Reference 1 & 2 Specification | Technical Preservation Rule |
| :--- | :--- | :--- |
| **Head & Face Shape** | Soft heart-shaped oval, delicate chin, smooth jawline, gentle cheekbone curves. | Continuous quad mesh topology with organic edge loops around eyes, mouth, and jaw. |
| **Eyes** | Large expressive warm amber almond eyes, dark limbal ring, deep pupil, dual white specular catchlights. | Recessed orbital sockets with organic eyelid margins wrapping around corneal bulges. |
| **Eyebrows** | Naturally arched dark espresso brows, tapered at temples, positioned closely above eye crease. | Modeled along brow ridge curvature with soft feathery hair shading. |
| **Nose** | Small, cute button nose with smooth nasal bridge, rounded tip ($+1.8\text{cm}$ protrusion), soft warm under-nose shadow. | Sculpted 3D button geometry. **Strictly zero dark nostril dots.** |
| **Mouth & Lips** | Defined Cupid's bow upper lip, full plump lower lip with gloss highlight, curved white dental arch, warm rose mouth cavity, soft smile dimples. | Modeled oral cavity with upper teeth row and vermilion lip borders. |
| **Skin Tone** | Warm, healthy creamy-peach complexion (`#FCE4D6` / `#FBE2D5`) with soft peachy-coral blush across cheeks and nose bridge. | PBR material with calibrated diffuse color, soft ambient occlusion, and non-clipping studio lighting. |
| **Hair & Style** | Dark chocolate wavy layered bob, 5 side-swept forehead bangs, wavy side locks, high messy bun at crown apex. | Modeled from contoured polygonal hair ribbons/clumps clinging naturally to skull curvature. |
| **Accessories** | 5-petal pink blossom pin on left bun base; two parallel lilac barrettes on right temple; purple lanyard with white flower ID card. | Dedicated 3D accessory geometry pinned to hair and chest. |
| **Clothing** | Cropped lavender zip hoodie with white cords, inner white t-shirt, high-waisted dark slate cargo trousers with side pockets, skate sneakers. | Layered clothing mesh with natural cloth folds, seam lines, and realistic silhouette drape. |

---

## 6. Implementation Plan for Visual Prototype (Stage 7.5.1.4)

### Phase 1: Base Humanoid Topology Foundation
- Establish a clean, production-grade stylized female humanoid base mesh with continuous quad edge loops.
- Ensure anatomical proportions align with the $1.25 : 1$ head aspect ratio and $1.62\text{m}$ overall character height.

### Phase 2: Reference-Guided Facial & Silhouette Fitting
- Calibrate cranium, eye sockets, eyelids, button nose, lips, jawline, and chin directly against the front and profile views in `asha_3d_turnaround_reference.jpg`.
- Construct 3D hair clumps (bangs, locks, crown bun) conforming to the skull.
- Construct the cropped hoodie, cargo pants, and sneakers.

### Phase 3: PBR Texture Atlas Integration
- Unwrap non-overlapping UVs.
- Apply high-resolution ($2048 \times 2048$) PBR texture maps capturing warm skin tones, expressive amber eyes, chocolate hair, and lavender fabric.

### Phase 4: Isolated Visual Prototype Submission (STOPPING GATEWAY)
- Export prototype asset as `frontend/public/assets/asha-3d/asha_prototype_v1.glb` (leaving existing `asha.glb` completely untouched).
- Render 4 inspection views: Front Face Close-up, Three-Quarter View, Side Profile, Full-Body Front.
- Present rendered views and Three.js viewer link to the Product Owner for personal visual review.
- **Halt all work. Do not proceed to rigging, blendshapes, or application integration until the visual prototype is approved.**

---

## 7. Project Protection & Safeguards

- **Branch Protection:** Current working branch `phase-2-patient-experience` is preserved with a clean working tree.
- **Asset Protection:** Existing `asha.glb`, textures, test suites, and documentation are preserved untouched.
- **Scope Freeze:** Stage 7.5.2 (runtime Three.js sanctuary integration, WebLLM, STT, TTS) remains strictly frozen.
- **Zero Cost:** Firebase Spark Free Tier ($0.00) strictly maintained. No Cloud Functions, paid APIs, or external infrastructure.
- **Visual-First Rule:** Automated tests will verify file integrity and budget compliance, but visual acceptance is solely determined by the Product Owner's personal inspection.

---

## 8. Request for Product Owner Approval

This plan is submitted for your formal review and approval.

**Upon your authorization of this plan, we will proceed to Phase 1–4 to produce the isolated visual prototype for your inspection.**
