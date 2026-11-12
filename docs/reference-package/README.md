# Asha 3D Canonical Reference Package

This directory contains the complete reference assets extracted from Google Flow / Veo videos and original design sheets for Saksham Neuro-Care's 3D companion, Asha.

## Directory Structure
- `sheets/`: 5 high-resolution master composite sheets:
  - `sheet_A_turntable_full_body.png` (7-panel 360° full body turntable)
  - `sheet_B_face_turn_and_head.png` (7-panel head rotation and anatomical sheet)
  - `sheet_C_expressions_and_mouth_shapes.png` (12-panel expression and viseme matrix)
  - `sheet_D_body_movement_and_gestures.png` (6-panel natural companion gestures)
  - `v5_tEND_head_sheet_with_anatomy.png` (anatomical facial écorché, skull, and muscle reference)
- `frames/`: 32 individual uncompressed frames at full native $1280 \times 720$ resolution.
- `static-photos/`: Original canonical design reference photographs:
  - `asha_3d_turnaround_reference.jpg`
  - `asha_3d_design_reference.jpg`
  - `aira_30_expressions_reference.jpg`
  - `asha_model_sheet_turnaround.jpg`
- `manifest.json`: Machine-readable frame catalog linking frames to original video titles and timestamps.
- `REFERENCE_INVENTORY.md`: Comprehensive reference inventory and Blender modeling audit.

## How to Use in Blender
1. Add `frames/v4_t00.00_full_front.png` as Front Background Image Plane (`Numpad 1`).
2. Add `frames/v4_t02.50_full_side_L.png` as Side Background Image Plane (`Numpad 3`).
3. Add `frames/v4_t04.50_full_back.png` as Back Background Image Plane (`Ctrl + Numpad 1`).
4. Use `v5_tEND_head_sheet_with_anatomy.png` and `sheet_B_face_turn_and_head.png` in Image Editor window for facial sculpting and quad retopology.
5. Use `sheet_C_expressions_and_mouth_shapes.png` when sculpting Shape Keys (Blend Shapes) for visemes and expressions.
