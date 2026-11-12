# SAKSHAM NEURO-CARE — ASHA 3D BLENDER CALIBRATION (STAGE B.2)

This directory contains the calibrated Blender workspace, datum guides, and verification preview renders for Asha 3D.

## Calibration Scene
- **File:** `calibration/asha_calibration_scene.blend`
- **Blender Target:** Blender 5.3.0+ (Apple Silicon ARM64, macOS)
- **Setup Script:** `scripts/blender_setup_asha.py`

## Verified Ground and Bun Datum Alignments
Mathematical calibration formula applied to reference image planes:
- $H = \text{TargetBunZ} \times \frac{h_{px}}{\Delta Y_{px}}$
- $W = H \times \frac{w_{px}}{h_{px}}$
- $Z_{center} = H \times \left(0.5 - \frac{Y_{sole}}{h_{px}}\right)$

| Reference Asset | Native Resolution | Measured Sole $Y$ | Measured Bun $Y$ | Pixel Span ($\Delta Y$) | Blender Width ($W$) | Blender Height ($H$) | Center $Z$ | Ground Sole $Z$ | Bun Apex $Z$ |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Front** (`v4_t00.00`) | $1280 \times 720$ | $15.0\text{px}$ | $675.0\text{px}$ | $660.0\text{px}$ ($91.67\%$) | $3.2388\text{m}$ | $1.8218\text{m}$ | $0.8730\text{m}$ | **$0.0000\text{m}$** | **$1.6700\text{m}$** |
| **Side** (`v4_t02.50`) | $1280 \times 720$ | $10.0\text{px}$ | $683.0\text{px}$ | $673.0\text{px}$ ($93.47\%$) | $3.1762\text{m}$ | $1.7866\text{m}$ | $0.8685\text{m}$ | **$0.0000\text{m}$** | **$1.6700\text{m}$** |
| **Back** (`v4_t04.50`) | $1280 \times 720$ | $17.0\text{px}$ | $690.0\text{px}$ | $673.0\text{px}$ ($93.47\%$) | $3.1762\text{m}$ | $1.7866\text{m}$ | $0.8511\text{m}$ | **$0.0000\text{m}$** | **$1.6700\text{m}$** |

## Camera Configurations
- **Orthographic Cameras (1:1 with reference planes):**
  - `Cam_Ortho_Front`: $(0.0, -3.0, 0.85)$, `ortho_scale = 1.90m`
  - `Cam_Ortho_Side`: $(3.0, 0.0, 0.85)$, `ortho_scale = 1.90m`
  - `Cam_Ortho_Back`: $(0.0, 3.0, 0.85)$, `ortho_scale = 1.90m`
  - `Cam_Ortho_Face_Front`: $(0.0, -1.5, 1.45)$, `ortho_scale = 0.45m`
  - `Cam_Ortho_Face_Side`: $(1.5, 0.0, 1.45)$, `ortho_scale = 0.45m`
- **Perspective Inspection Cameras:**
  - `Cam_Persp_Front`: $(0.0, -2.5, 1.05)$, lens $50\text{mm}$
  - `Cam_Persp_ThreeQuarter`: $(1.8, -2.0, 1.35)$, lens $50\text{mm}$
  - `Cam_Persp_Full_Body`: $(0.0, -3.5, 0.95)$, lens $40\text{mm}$

## Studio AREA Lighting
- `Light_Key`: $(1.6, -1.8, 2.2)$, $150\text{W}$, size $1.0\text{m}$, color $(1.0, 0.96, 0.92)$
- `Light_Fill`: $(-1.8, -1.5, 1.8)$, $75\text{W}$, size $1.5\text{m}$, color $(0.92, 0.95, 1.0)$
- `Light_Rim`: $(0.0, 1.8, 2.4)$, $120\text{W}$, size $0.8\text{m}$, color $(0.98, 0.95, 1.0)$
- `Light_Ground_Bounce`: $(-0.5, -1.2, 0.2)$, $30\text{W}$, size $1.2\text{m}$, color $(0.90, 0.90, 0.96)$
- All studio lights track `Studio_Light_Target` at $(0.0, 0.0, 1.10\text{m})$.

## Verification Previews (`calibration/previews/`)
- `calibration_preview_front_ortho.png`
- `calibration_preview_side_ortho.png`
- `calibration_preview_back_ortho.png`
- `calibration_preview_face_front_ortho.png`
- `calibration_preview_three_quarter_persp.png`
