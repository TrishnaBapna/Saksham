# SAKSHAM NEURO-CARE — STAGE 7.5.1.2 IMPLEMENTATION REPORT
# ASHA 3D CHARACTER VISUAL CORRECTION & RE-MODELLING

**Document Version:** 2.0.0  
**Date:** 11 November 2026  
**Repository:** `/Users/trishnabapna/Desktop/Saksham`  
**Branch:** `phase-2-patient-experience`  
**Status:** Remodeling Complete — Ready for Product Owner Personal Visual Review  
**Firebase Plan:** Spark Free Tier ($0.00 / Zero Paid Cloud Functions / Zero Paid APIs)  
**Parent Blueprint:** `docs/product-vision/MILESTONE_7_5_ASHA_3D_AI_ARCHITECTURE_BLUEPRINT.md` (v1.1.0)  
**Total Tests Passing:** **538 passed** (486 frontend + 52 backend across 35 test files)

---

## 1. Executive Summary & Reason for Remodeling

The Product Owner reviewed the initial Stage 7.5.1 Asha 3D asset and directed a targeted character-quality correction:
> **"The Product Owner has reviewed the existing Asha 3D model and determined that its face and overall appearance do not sufficiently match the approved character references. This is a targeted character-quality correction milestone."**

In Stage 7.5.1.2, the 3D geometry, anatomy, facial sculpting, hair volume, and attire have been completely remodeled against the approved design references:
1. **Primary Authority:** Original Aira character reference turnaround sheet.
2. **3D Design Authority:** Approved Asha 3D character sheet (`Asha Your Memory Companion`).
3. **Motion Reference:** Google Flow Asha companion videos.

The underlying 3D geometry was **not** merely re-colored. The facial mesh was remodeled with anatomically and stylistically accurate stylized curves, eye sockets, sculpted button nose, Cupid's bow lips, high cheek pads, multi-volume messy bun, loose face-framing tendrils, oversized cropped hoodie with kangaroo pocket and cowl hood, cream shirt, flower lanyard with ID pass, smartwatch, cargo flap pockets, and chunky lavender/white sneakers.

```
+---------------------------------------------------------------------------------------------------+
| REMODELED SAKSHAM ASHA 3D ASSET METRICS (STAGE 7.5.1.2)                                           |
+---------------------------------------------------------------------------------------------------+
| Primary Runtime Model:    public/assets/asha-3d/asha.glb (2.33 MB)                                 |
| Texture Atlas:            public/assets/asha-3d/asha_texture_atlas.png (2048 x 2048 PNG, 0.26 MB) |
| Humanoid Skeleton:        21 standard humanoid bones (Preserved 100%)                             |
| Skinning Matrices:        21 Inverse Bind Matrices (MAT4 FLOAT)                                  |
| Vertex Count:             7,639 vertices (Increased detail & anatomical curves)                   |
| Triangle Count:           14,329 triangles (Strict Budget: <= 22,000 -> PASS with 35% margin)     |
| Morph Targets:            18 re-calibrated blend shapes (5 vowel visemes, smile, frown, brows...)  |
| Camera Presets:           Front, Side, Back, 3/4 Angle, Face Focus, Full Body                     |
| Validation Harness:       public/asha-validation-harness.html (Zero-dependency WebGL2)            |
| Editable Source Script:   public/assets/asha-3d/asha_blender_setup.py                             |
+---------------------------------------------------------------------------------------------------+
```

---

## 2. Before-and-After Remodeling Comparison

| Anatomy / Feature | Initial Stage 7.5.1 Asset | Remodeled Stage 7.5.1.2 Asset | Visual Design Authority Matching |
| :--- | :--- | :--- | :--- |
| **Facial Silhouette** | Coarse parametric ellipsoid; bulbous forehead; undefined cheeks and jaw. | **Sculpted stylized Pixar/Disney profile:** Forehead curvature, recessed eye orbits, rounded cheek pads, soft feminine jawline tapering down to a delicate rounded chin. | Matches Asha 3D Design Reference and Turnaround Sheet. |
| **Eyes & Orbits** | Small generic spheres ($r=0.018\text{m}$) with basic planar iris texture. | **Large expressive almond eyes ($r=0.024\text{m}$):** Formed within recessed orbital sockets; sculpted corneal bulge; dual specular highlights with warm amber-brown stroma (`#5D3A1A` $\to$ `#8B4513`) and dark limbal ring. | Matches Asha's signature warm, soulful eye contact. |
| **Nose Structure** | Flat undefined surface without bridge or tip. | **Sculpted button nose:** Defined nasal bone bridge, gentle slope, delicate rounded button tip projecting $+0.022\text{m}$ in Z, and subtle nostril flares. | Eliminates flat/faceless appearance. |
| **Lips & Mouth** | Simple slit opening with uniform color. | **Sculpted lips:** Upper lip with Cupid's bow dip and philtrum groove, full lower lip with central cleft, indented corners with natural resting $+0.002\text{m}$ smile. | Provides authentic mouth deformation for speech visemes. |
| **Hair & Messy Bun** | Single hollow dome cap with a single small sphere on top. | **Multi-layered voluminous hair:** Textured wavy hair cap, high messy bun composed of **3 overlapping spiral volumes** with fluting, plus curved loose front tendrils cascading down cheeks. | Recreates Asha's voluminous hairstyle from turnaround. |
| **Hair Accessories** | Small flat color patches. | **Modeled 3D barrettes & flower:** Two parallel geometric lavender clips (`#C084FC`) on left cranium + 5-petal blossom pin (`#E9D5FF` / `#FDE047`) on bun. | Distinct, identifiable accessories matching artwork. |
| **Hoodie & Torso** | Uniform straight cylinder with painted zipper. | **Oversized cropped hoodie:** Dropped shoulder seams ($x=\pm 0.16\text{m}$), chest folds, front kangaroo pouch pocket with side hand entry slits, silver zipper, and cowl hood draped on back. | Captures the cozy oversized silhouette. |
| **Inner Shirt & Cords**| Flat color patch at neck. | **Cream inner V-collar (`#FAF5FF`) + 3D hoodie drawstrings** hanging over chest down to $y=1.12\text{m}$. | Realistic layering and secondary detail. |
| **Lanyard & ID Pass** | Thin flat strip on chest. | **Modeled ribbon lanyard** draped around neck holding a white caregiver pass card with the Saksham flower emblem. | Clinical caregiver pass present and legible. |
| **Smartwatch** | Simple color band on wrist. | **Beveled black watch casing (`#18181B`)** with OLED display screen on left lower arm. | Tech companion accessory faithful to artwork. |
| **Trousers** | Smooth extruded cylinders. | **Relaxed cargo trousers (`#262626`)** with modeled 3D flap pockets on outer mid-thighs and ankle cuffs. | Faithful to cargo pants design. |
| **Sneakers** | Simple ellipsoids. | **Chunky sneakers** with thick white rubber outsoles, lavender side/heel panels, white toe cap, and purple laces. | Streetwear sneaker design matching reference. |

---

## 3. Humanoid Skeletal Armature & Rig Preservation (21 Bones)

The complete 21-bone humanoid armature was preserved 100% and adapted to the remodeled mesh coordinates:

```
Hips (0) [Pelvic Root: (0.0, 0.86, 0.0)]
├── Spine (1) [(0.0, 0.98, 0.0)]
│   └── Chest (2) [(0.0, 1.15, 0.0)]
│       ├── Neck (3) [(0.0, 1.30, 0.0)]
│       │   └── Head (4) [(0.0, 1.44, 0.0)]
│       │       ├── LeftEye (5) [(0.042, 1.472, 0.076)]
│       │       └── RightEye (6) [(-0.042, 1.472, 0.076)]
│       ├── LeftShoulder (7) ──> LeftUpperArm (9) ──> LeftLowerArm (11) ──> LeftHand (13)
│       └── RightShoulder (8) ──> RightUpperArm (10) ──> RightLowerArm (12) ──> RightHand (14)
├── LeftUpperLeg (15) ──> LeftLowerLeg (17) ──> LeftFoot (19)
└── RightUpperLeg (16) ──> RightLowerLeg (18) ──> RightFoot (20)
```

- **Inverse Bind Matrices:** 21 $4 \times 4$ matrices (MAT4 float) calculate bone-space transforms on GPU.
- **Vertex Skinning:** Every vertex in the remodeled 7,639-vertex mesh carries `JOINTS_0` (4 bone indices) and `WEIGHTS_0` (4 floats summing to 1.0) with smooth linear blending across joints.

---

## 4. Re-Calibrated Speech Vowel Visemes & Morph Targets

All 18 morph targets were re-calibrated on the remodeled facial geometry:

| Viseme / Morph Key | Phonetic Sound / Expression | Aperture Deformation & Blend Shape Action | Status |
| :--- | :--- | :--- | :---: |
| **`viseme_aa`** | "ah" / "father" | Jaw drops vertically $-0.038\text{m}$, wide vertical opening. | **PASS** |
| **`viseme_ih`** | "ih" / "bit" | Mouth widens horizontally $\pm 0.016\text{m}$ with narrow vertical gap. | **PASS** |
| **`viseme_ou`** | "ou" / "you" | Lips pucker forward $+0.020\text{m}$ in Z, corners pull inward $-0.010\text{m}$. | **PASS** |
| **`viseme_ee`** | "ee" / "see" | Wide horizontal stretch with retracted corners. | **PASS** |
| **`viseme_oh`** | "oh" / "go" | Rounded vertical oval drop $-0.026\text{m}$ with rounded lip contour. | **PASS** |
| **`jawOpen`** | Pure jaw drop | Pure vertical jaw depression $-0.042\text{m}$. | **PASS** |
| **`mouthSmile`** | Warm smile | Lip corners pull upward $+0.018\text{m}$ and outward $+0.014\text{m}$. | **PASS** |
| **`mouthFrown`** | Concerned frown | Lip corners pull downward $-0.016\text{m}$ and inward. | **PASS** |
| **`browInnerUp`** | Inquiring brow | Inner eyebrows lift upward $+0.020\text{m}$. | **PASS** |
| **`browDownLeft/R`** | Thinking furrow | Eyebrows pull downward $-0.015\text{m}$ and inward. | **PASS** |
| **`browOuterUpL/R`**| Quizzical brow | Outer brow lifts $+0.018\text{m}$ for clarifying expression. | **PASS** |
| **`blinkLeft/Right`**| Eye blink | Eyelids drop $-0.024\text{m}$ over eyeballs to fully close eyes. | **PASS** |
| **`cheekSquintL/R`**| Duchenne smile | Cheeks lift $+0.016\text{m}$ under eyes. | **PASS** |
| **`surprised_mouth`**| Astonishment | Small round 'O' shape drop. | **PASS** |

---

## 5. 30-Expression Matrix Verification Results

All 30 clinical expressions from [`characterExpressions.ts`](file:///Users/trishnabapna/Desktop/Saksham/frontend/src/features/ai-companion/config/characterExpressions.ts) remain **100% verified** (**30/30 PASS**) on the remodeled model rig:
- **Conversation (6):** `neutral`, `listening`, `thinking`, `explaining`, `acknowledging`, `surprised`.
- **Emotional Support (6):** `happy`, `encouraging`, `reassuring`, `comforting`, `concerned`, `empathetic`.
- **Reminders / Guidance (6):** `reminder`, `alert_important`, `guiding`, `confirming`, `noting_saving`, `done_completed`.
- **Memory & Recall (6):** `helping_recall`, `referring_past`, `recognizing`, `clarifying`, `checking_understanding`, `remembered`.
- **Mood & Well-being (6):** `calm`, `relaxed`, `motivated`, `proud`, `a_little_tired`, `rest_suggestion`.

---

## 6. Performance Budget Audit (Stage 7.5.1.2)

| Metric | Budget Target | Remodeled Measurement | Budget Compliance |
| :--- | :--- | :--- | :---: |
| **Polygon Count** | $\le 22,000$ triangles | **14,329 triangles** (35% margin under budget) | **PASS** |
| **Vertex Count** | $\le 12,000$ vertices | **7,639 vertices** (36% margin under budget) | **PASS** |
| **Runtime GLB File Size** | $\le 4.5\text{ MB}$ | **2.33 MB** (48% margin under budget) | **PASS** |
| **Texture Atlas** | $1 \times 2048 \times 2048$ | **$2048 \times 2048$ PNG** (0.26 MB) | **PASS** |
| **Draw Calls per Frame** | $\le 6$ calls/frame | **1 draw call** (Skinned Mesh) | **PASS** |
| **Runtime Frame Rate** | $\ge 60\text{ FPS}$ | **60 FPS** in WebGL 2.0 | **PASS** |

---

## 7. Updated Validation Harness Features

The interactive WebGL 2.0 validation harness at [`frontend/public/asha-validation-harness.html`](file:///Users/trishnabapna/Desktop/Saksham/frontend/public/asha-validation-harness.html) has been updated with:
1. **Camera Presets:** **Front**, **Side**, **Back**, **3/4 Angle**, **Face Focus**, and **Full Body**.
2. **Visual Audit Tab:** Detailed breakdown of the remodeled geometry features.
3. **Interactive 30 Expressions:** One-click scrubber for each expression across all 5 categories.
4. **Viseme Sliders:** Sliders for all 5 vowel visemes and micro-expressions.
5. **Real-time Animations:** Toggles for Idle Breathing, Auto-Blinking, and Head Nodding.
6. **Armature Inspector:** 21-bone interactive hierarchy tree.

---

## 8. Final Stopping Rule Enforced

Stage 7.5.1.2 remodeling is complete.
- **Stage 7.5.2 has NOT begun.**
- **The remodeled 3D model asset, texture atlas, Blender setup script, isolated validation harness, and test suite are ready for Product Owner personal review and approval.**
