# SAKSHAM NEURO-CARE — ASHA 3D BLENDER CALIBRATION (STAGE B.2.2)

This directory contains the remediated, calibrated Blender workspace, datum guides, and verification preview renders for Asha 3D.

## Calibration Scene
- **File:** `calibration/asha_calibration_scene.blend`
- **Blender Target:** Blender 5.3.0+ (Apple Silicon ARM64, macOS)
- **Setup Script:** `scripts/blender_setup_asha.py`
- **Engine / Denoising:** Cycles CPU with OpenImageDenoise (OIDN)

## Stage B.2.2 Geometry Remediation Summary
- **Defect Identified (Stage B.2.1):** Mesh planes had been generated in vertical $(X, 0, Z)$ and subsequently rotated by $90^\circ$ around $X$, resulting in flat horizontal tabletop planes that rendered edge-on as blank grey world background space.
- **Remediation Applied (Stage B.2.2):**
  - Mesh planes are directly constructed in their proper vertical planes:
    - `REF_Full_Front_Plane` & `REF_Full_Back_Plane`: vertical $X-Z$ plane (zero cross-axis rotation).
    - `REF_Full_Side_Plane`: vertical $Y-Z$ plane (zero cross-axis rotation).
    - `REF_Face_Front_Plane` & `REF_Face_Side_Plane`: close-up facial texture planes at $Z = 1.450\text{m}$.
  - Mesh planes and Viewport Empties overlap with identical dimensions and world positions.
  - 3D Cross Datum Guides ($X$ and $Y$ rods) with $8\text{mm}$ bevel radius ($16\text{mm}$ visible rod) and OpenImageDenoise ensure crisp, anti-aliased datum lines across Front, Side, and Rear views.

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
- **Orthographic Cameras (1:1 with reference planes, $1920 \times 1080$, sensor fit `VERTICAL`):**
  - `Cam_Ortho_Front`: $(0.0, -3.0, 0.85\text{m})$, `ortho_scale = 1.90m`, visible $Z \in [-0.10\text{m}, 1.80\text{m}]$
  - `Cam_Ortho_Side`: $(3.0, 0.0, 0.85\text{m})$, `ortho_scale = 1.90m`, visible $Z \in [-0.10\text{m}, 1.80\text{m}]$
  - `Cam_Ortho_Back`: $(0.0, 3.0, 0.85\text{m})$, `ortho_scale = 1.90m`, visible $Z \in [-0.10\text{m}, 1.80\text{m}]$
  - `Cam_Ortho_Face_Front`: $(0.0, -1.5, 1.45\text{m})$, `ortho_scale = 0.45m`, visible $Z \in [1.225\text{m}, 1.675\text{m}]$
  - `Cam_Ortho_Face_Side`: $(1.5, 0.0, 1.45\text{m})$, `ortho_scale = 0.45m`, visible $Z \in [1.225\text{m}, 1.675\text{m}]$
- **Perspective Inspection Cameras:**
  - `Cam_Persp_Front`: $(0.0, -2.5, 1.05\text{m})$, lens $50\text{mm}$
  - `Cam_Persp_ThreeQuarter`: $(1.8, -2.0, 1.35\text{m})$, lens $50\text{mm}$
  - `Cam_Persp_Full_Body`: $(0.0, -3.5, 0.95\text{m})$, lens $40\text{mm}$

## Studio AREA Lighting
- `Light_Key`: $(1.6, -1.8, 2.2\text{m})$, $150\text{W}$, size $1.0\text{m}$, color $(1.0, 0.96, 0.92)$
- `Light_Fill`: $(-1.8, -1.5, 1.8\text{m})$, $75\text{W}$, size $1.5\text{m}$, color $(0.92, 0.95, 1.0)$
- `Light_Rim`: $(0.0, 1.8, 2.4\text{m})$, $120\text{W}$, size $0.8\text{m}$, color $(0.98, 0.95, 1.0)$
- `Light_Ground_Bounce`: $(-0.5, -1.2, 0.2\text{m})$, $30\text{W}$, size $1.2\text{m}$, color $(0.90, 0.90, 0.96)$
- All studio lights track `Studio_Light_Target` at $(0.0, 0.0, 1.10\text{m})$.

## Verification Previews (`calibration/previews/`)
1. `calibration_preview_front_ortho.png`: Front full-body view showing shoe soles touching green datum line ($Z = 0.000\text{m}$) and bun touching magenta datum line ($Z = 1.670\text{m}$).
2. `calibration_preview_side_ortho.png`: Left side profile view showing shoe soles touching green datum line ($Z = 0.000\text{m}$) and bun touching magenta datum line ($Z = 1.670\text{m}$).
3. `calibration_preview_back_ortho.png`: Rear full-body view showing cargo pants, hoodie back, and datum alignment.
4. `calibration_preview_face_front_ortho.png`: Close-up portrait showing facial features, eyes, nose, mouth, bangs, and hair clips.
5. `calibration_preview_three_quarter_persp.png`: Perspective overview demonstrating the upright vertical orientation of the reference planes and datum intersections.
