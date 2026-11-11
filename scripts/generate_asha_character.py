#!/usr/bin/env python3
"""
scripts/generate_asha_character.py
SAKSHAM NEURO-CARE — STAGE 7.5.1.3: ASHA FACIAL RECONSTRUCTION & 3D ASSET GENERATOR

This script generates:
1. frontend/public/assets/asha-3d/asha_texture_atlas.png (2048x2048 high-res PBR atlas)
2. frontend/public/assets/asha-3d/asha.glb (valid glTF 2.0 binary asset)
3. frontend/public/assets/asha-3d/asha_model_metadata.json

Major Stage 7.5.1.3 Facial Reconstructions:
- Rebuilt stylized humanoid head anatomy matching Asha reference images.
- Unified, high-fidelity anime face:
  * Large expressive almond anime eyes (warm amber/chocolate iris, radiant starburst rays, deep black pupil, dual crisp specular highlights, bold upper eyeliner, double eyelid crease).
  * Naturally arched dark espresso eyebrows positioned directly above the eyes.
  * Cute dainty button nose with soft warm peach shadow underneath and tip highlight (zero black nostril dots).
  * Radiant smile with Cupid's bow upper lip, clean curved white teeth row, warm rose oral cavity, full lower lip with gloss highlight, soft dimple corners.
  * Broad airbrushed peachy-coral cheek blush.
- Voluminous wavy bob hairstyle anchored to the skull, with 5 front bangs/fringe ribbon strands, side locks, high messy bun on the crown, blossom flower pin, and two lilac hair barrettes.
- Calibrated 18 blendshapes (5 speech vowel visemes + 13 facial expressions).
- Preserved 21 humanoid skeletal bones, skinning weights, and inverse bind matrices.
- Performance budget compliant: <= 22,000 triangles, <= 4.5 MB file size.
"""

import os
import sys
import json
import math
import struct
import zlib


def generate_texture_atlas():
    """
    Generates a 2048x2048 PNG texture atlas.
    glTF 2.0 convention: V=0.0 is top (row 0), V=1.0 is bottom (row 2048).
    """
    size = 2048
    half = 1024
    buf = bytearray(size * size * 4)

    def set_pixel(x, y, r, g, b, a=255):
        if 0 <= x < size and 0 <= y < size:
            idx = (y * size + x) * 4
            sa = a / 255.0
            da = buf[idx+3] / 255.0
            out_a = sa + da * (1.0 - sa)
            if out_a > 0.0:
                buf[idx] = int((r * sa + buf[idx] * da * (1.0 - sa)) / out_a)
                buf[idx+1] = int((g * sa + buf[idx+1] * da * (1.0 - sa)) / out_a)
                buf[idx+2] = int((b * sa + buf[idx+2] * da * (1.0 - sa)) / out_a)
                buf[idx+3] = int(out_a * 255)

    def fill_rect(x0, y0, x1, y1, r, g, b, a=255):
        for y in range(max(0, y0), min(size, y1)):
            row = (y * size + max(0, x0)) * 4
            for x in range(max(0, x0), min(size, x1)):
                buf[row] = r
                buf[row+1] = g
                buf[row+2] = b
                buf[row+3] = a
                row += 4

    def draw_radial_glow(cx, cy, rx, ry, r, g, b, max_alpha=0.5, power=1.5):
        min_x = max(0, int(cx - rx))
        max_x = min(size - 1, int(cx + rx))
        min_y = max(0, int(cy - ry))
        max_y = min(size - 1, int(cy + ry))
        for y in range(min_y, max_y + 1):
            dy = (y - cy) / ry
            for x in range(min_x, max_x + 1):
                dx = (x - cx) / rx
                d2 = dx*dx + dy*dy
                if d2 < 1.0:
                    dist = math.sqrt(d2)
                    alpha = ((1.0 - dist) ** power) * max_alpha * 255
                    set_pixel(x, y, r, g, b, int(alpha))

    # =============================================================
    # 1. TOP-LEFT QUADRANT (0..1024, 0..1024): RECONSTRUCTED ANIME FACE
    # =============================================================
    # Base radiant ivory-peach skin (#FCE4D6 / #FBE2D5)
    fill_rect(0, 0, half, half, 252, 226, 214)

    # Ambient skin warmth gradient
    for y in range(half):
        for x in range(half):
            dx = (x - 512) / 512.0
            dy = (y - 512) / 512.0
            dist = math.hypot(dx, dy)
            if dist < 1.0:
                warmth = (1.0 - dist) * 0.12
                idx = (y * size + x) * 4
                buf[idx] = min(255, int(252 + 3 * warmth))
                buf[idx+1] = max(0, int(226 - 8 * warmth))
                buf[idx+2] = max(0, int(214 - 14 * warmth))

    # A. Broad Peachy-Coral Apple Cheeks Blush
    draw_radial_glow(325, 550, 180, 130, 251, 113, 133, max_alpha=0.45, power=1.5)
    draw_radial_glow(699, 550, 180, 130, 251, 113, 133, max_alpha=0.45, power=1.5)
    draw_radial_glow(512, 530, 120, 50, 251, 125, 140, max_alpha=0.20, power=1.8)

    # B. Large Expressive Anime Eyes
    def draw_anime_eye(cx, cy, is_left=True):
        rx_sclera = 120
        ry_sclera = 92
        tilt = 0.06 if is_left else -0.06

        # 1. Sclera (Eyeball white)
        for y in range(int(cy - ry_sclera - 10), int(cy + ry_sclera + 10)):
            for x in range(int(cx - rx_sclera - 10), int(cx + rx_sclera + 10)):
                dx = (x - cx) * math.cos(tilt) - (y - cy) * math.sin(tilt)
                dy = (x - cx) * math.sin(tilt) + (y - cy) * math.cos(tilt)
                arch_factor = 1.0 + 0.35 * (dy / ry_sclera) if dy < 0 else 1.0 - 0.18 * (dy / ry_sclera)
                d = (dx / rx_sclera)**2 + (dy / (ry_sclera * arch_factor))**2
                if d <= 1.0:
                    edge = min(1.0, (1.0 - d) * 5.0)
                    shadow_t = max(0.0, min(1.0, (-dy / ry_sclera)))
                    sr = int(246 * (1.0 - shadow_t * 0.12))
                    sg = int(248 * (1.0 - shadow_t * 0.14))
                    sb = int(252 * (1.0 - shadow_t * 0.08))
                    set_pixel(x, y, sr, sg, sb, int(edge * 255))

        # 2. Large, Warm Expressive Iris (occupies 78% of eye height)
        rx_iris = 82
        ry_iris = 90
        iris_cx = cx + (4 if is_left else -4)
        iris_cy = cy + 2

        for y in range(int(iris_cy - ry_iris - 5), int(iris_cy + ry_iris + 5)):
            for x in range(int(iris_cx - rx_iris - 5), int(iris_cx + rx_iris + 5)):
                dx = (x - iris_cx) / rx_iris
                dy = (y - iris_cy) / ry_iris
                d2 = dx*dx + dy*dy
                if d2 <= 1.0:
                    dist = math.sqrt(d2)
                    edge_a = min(1.0, (1.0 - dist) * 6.0)
                    if dist > 0.84:
                        ir, ig, ib = 28, 18, 14
                    else:
                        vert = (dy + 1.0) / 2.0
                        angle = math.atan2(dy, dx)
                        burst = math.sin(angle * 14.0) * 0.07 + math.cos(angle * 7.0) * 0.04
                        blend = max(0.0, min(1.0, vert + burst))
                        if blend < 0.45:
                            f = blend / 0.45
                            ir = int(48 * (1 - f) + 175 * f)
                            ig = int(24 * (1 - f) + 80 * f)
                            ib = int(12 * (1 - f) + 12 * f)
                        else:
                            f = (blend - 0.45) / 0.55
                            ir = int(175 * (1 - f) + 250 * f)
                            ig = int(80 * (1 - f) + 170 * f)
                            ib = int(12 * (1 - f) + 36 * f)
                    set_pixel(x, y, ir, ig, ib, int(edge_a * 255))

        # 3. Deep Velvet Black Pupil
        rx_pupil = 26
        ry_pupil = 38
        for y in range(int(iris_cy - ry_pupil - 2), int(iris_cy + ry_pupil + 2)):
            for x in range(int(iris_cx - rx_pupil - 2), int(iris_cx + rx_pupil + 2)):
                d = ((x - iris_cx) / rx_pupil)**2 + ((y - iris_cy) / ry_pupil)**2
                if d <= 1.0:
                    edge_a = min(1.0, (1.0 - math.sqrt(d)) * 5.0)
                    set_pixel(x, y, 14, 10, 8, int(edge_a * 255))

        # 4. Brilliant Multi-Layered Specular Highlights
        hl1_cx = iris_cx - 26
        hl1_cy = iris_cy - 28
        r_hl1 = 20
        for y in range(int(hl1_cy - r_hl1 - 2), int(hl1_cy + r_hl1 + 2)):
            for x in range(int(hl1_cx - r_hl1 - 2), int(hl1_cx + r_hl1 + 2)):
                d = math.hypot(x - hl1_cx, y - hl1_cy)
                if d <= r_hl1:
                    a = min(1.0, (1.0 - d / r_hl1) * 3.5)
                    set_pixel(x, y, 255, 255, 255, int(a * 255))

        hl2_cx = iris_cx + 24
        hl2_cy = iris_cy + 26
        for y in range(int(hl2_cy - 14), int(hl2_cy + 14)):
            for x in range(int(hl2_cx - 16), int(hl2_cx + 16)):
                d = ((x - hl2_cx) / 13.0)**2 + ((y - hl2_cy) / 9.0)**2
                if d <= 1.0:
                    a = min(1.0, (1.0 - math.sqrt(d)) * 2.2) * 0.88
                    set_pixel(x, y, 245, 248, 255, int(a * 255))

        hl3_cx = iris_cx - 14
        hl3_cy = iris_cy + 34
        for y in range(int(hl3_cy - 7), int(hl3_cy + 7)):
            for x in range(int(hl3_cx - 7), int(hl3_cx + 7)):
                d = math.hypot(x - hl3_cx, y - hl3_cy)
                if d <= 5.5:
                    a = min(1.0, (1.0 - d / 5.5) * 2.5) * 0.90
                    set_pixel(x, y, 255, 255, 255, int(a * 255))

        # 5. Bold, Sweeping Anime Upper Eyelash / Eyeliner
        pts = 140
        sign = 1.0 if is_left else -1.0
        for i in range(pts):
            t = i / float(pts - 1)
            lx = cx - sign * rx_sclera * 0.96 + sign * 1.92 * rx_sclera * t
            arch = math.sin(t * math.pi) * (ry_sclera * 0.92)
            ly = cy - arch - 2
            thick = 5.0 + 14.0 * math.sin(t ** 0.80 * math.pi)
            if t > 0.84:
                wing = (t - 0.84) / 0.16
                ly -= wing * 14.0
                lx += sign * wing * 16.0
                thick = max(2.5, thick * (1.0 - wing * 0.45))
            for dy in range(int(-thick), int(thick + 1)):
                for dx in range(int(-thick), int(thick + 1)):
                    d = math.hypot(dx, dy)
                    if d <= thick:
                        a = min(1.0, (1.0 - d / thick) * 2.8)
                        set_pixel(int(lx + dx), int(ly + dy), 22, 16, 14, int(a * 255))

        # 6. Double Eyelid Crease
        for i in range(90):
            t = i / 89.0
            lx = cx - sign * rx_sclera * 0.72 + sign * 1.44 * rx_sclera * t
            arch = math.sin(t * math.pi) * (ry_sclera * 0.82)
            ly = cy - arch - 26
            for dy in range(-2, 3):
                for dx in range(-2, 3):
                    d = math.hypot(dx, dy)
                    if d <= 2.2:
                        a = (1.0 - d / 2.2) * 0.50 * math.sin(t * math.pi)
                        set_pixel(int(lx + dx), int(ly + dy), 130, 80, 70, int(a * 255))

        # 7. Soft Lower Eyelash Outline
        for i in range(80):
            t = i / 79.0
            lx = cx - sign * rx_sclera * 0.78 + sign * 1.56 * rx_sclera * t
            curve = math.sin(t * math.pi) * (ry_sclera * 0.72)
            ly = cy + curve
            alpha_t = math.sin(t * math.pi) * (0.65 if t > 0.35 else 0.25)
            for dy in range(-2, 3):
                d = abs(dy)
                if d <= 2:
                    a = (1.0 - d / 2.0) * alpha_t
                    set_pixel(int(lx), int(ly + dy), 40, 26, 22, int(a * 255))

    draw_anime_eye(335, 455, is_left=False)
    draw_anime_eye(689, 455, is_left=True)

    # C. Naturally Arched Dark Espresso Eyebrows
    def draw_eyebrow(cx, cy, is_left=True):
        pts = 100
        sign = 1.0 if is_left else -1.0
        span_x = 95
        for i in range(pts):
            t = i / float(pts - 1)
            lx = cx - sign * span_x + sign * 2.0 * span_x * t
            arch = math.sin(t ** 0.85 * math.pi) * 20.0
            ly = cy - arch
            thick = (1.0 - t * 0.70) * 9.0
            for dy in range(int(-thick), int(thick + 1)):
                for dx in range(int(-thick), int(thick + 1)):
                    d = math.hypot(dx / 1.1, dy)
                    if d <= thick:
                        a = min(1.0, (1.0 - d / thick) * 2.2) * 0.95
                        set_pixel(int(lx + dx), int(ly + dy), 38, 26, 22, int(a * 255))

    draw_eyebrow(335, 345, is_left=False)
    draw_eyebrow(689, 345, is_left=True)

    # D. Cute Stylized Button Nose (NO BLACK NOSTRILS)
    # Under-nose soft peach shadow
    draw_radial_glow(512, 586, 28, 12, 215, 120, 110, max_alpha=0.50, power=1.8)
    draw_radial_glow(512, 590, 14, 6, 185, 90, 80, max_alpha=0.35, power=2.0)
    # Nose tip soft warmth
    draw_radial_glow(512, 578, 20, 16, 250, 155, 145, max_alpha=0.32, power=1.6)
    # Specular highlight on button tip
    draw_radial_glow(512, 576, 7, 5, 255, 250, 245, max_alpha=0.60, power=1.4)

    # E. Radiant Smile with Clean Teeth & Cupid's Bow
    def draw_radiant_smile(cx, cy):
        w_mouth = 76
        h_open = 22

        # 1. Warm Rose Oral Cavity Interior
        for dy in range(-h_open, h_open + 6):
            for dx in range(-w_mouth, w_mouth + 1):
                d = (dx / w_mouth)**2 + (dy / (h_open if dy > 0 else h_open * 0.7))**2
                if d <= 1.0:
                    edge_a = min(1.0, (1.0 - math.sqrt(d)) * 5.0)
                    vert = (dy + h_open) / (2.0 * h_open)
                    cr = int(140 * (1 - vert) + 195 * vert)
                    cg = int(30 * (1 - vert) + 60 * vert)
                    cb = int(50 * (1 - vert) + 80 * vert)
                    set_pixel(cx + dx, cy + dy, cr, cg, cb, int(edge_a * 255))

        # 2. Pristine White Upper Teeth Row with natural dental curve & subtle separators
        for ty in range(cy - 14, cy + 3):
            for tx in range(cx - 50, cx + 51):
                dist_x = abs(tx - cx)
                arch_teeth = (dist_x / 50.0)**2 * 3.5
                if ty >= (cy - 14 + arch_teeth):
                    edge_a = min(1.0, (50 - dist_x) / 4.0)
                    sep = 1.0
                    for sep_x in [cx - 36, cx - 24, cx - 12, cx, cx + 12, cx + 24, cx + 36]:
                        if abs(tx - sep_x) < 1.2:
                            sep = 0.92
                    tr = int(255 * sep)
                    tg = int(253 * sep)
                    tb = int(255 * sep)
                    set_pixel(tx, ty, tr, tg, tb, int(edge_a * 255))

        # 3. Upper Lip with Cupid's Bow
        for i in range(120):
            t = i / 119.0
            lx = cx - w_mouth * 0.96 + 1.92 * w_mouth * t
            norm_x = (lx - cx) / w_mouth
            cupid = math.cos(norm_x * math.pi * 0.5) * 7.0 - math.sin(abs(norm_x) * math.pi) * 2.8
            ly = cy - 14 - cupid
            thick = max(1.5, (1.0 - abs(norm_x)) * 6.5)
            for dy in range(int(-thick), int(thick + 1)):
                for dx in range(-2, 3):
                    d = math.hypot(dx, dy)
                    if d <= thick:
                        a = (1.0 - d / thick) * 0.92 * (1.0 - abs(norm_x) * 0.35)
                        set_pixel(int(lx + dx), int(ly + dy), 235, 95, 110, int(a * 255))

        # 4. Plump Lower Lip
        for i in range(120):
            t = i / 119.0
            lx = cx - w_mouth * 0.94 + 1.88 * w_mouth * t
            norm_x = (lx - cx) / w_mouth
            curve = (1.0 - norm_x**2) * 14.0
            ly = cy + 8 + curve
            thick = max(2.0, (1.0 - abs(norm_x)) * 10.5)
            for dy in range(int(-thick), int(thick + 1)):
                for dx in range(-2, 3):
                    d = math.hypot(dx, dy)
                    if d <= thick:
                        a = (1.0 - d / thick) * 0.90 * (1.0 - abs(norm_x) * 0.30)
                        set_pixel(int(lx + dx), int(ly + dy), 242, 115, 130, int(a * 255))

        # Gloss highlight
        draw_radial_glow(cx, cy + 18, 22, 5, 255, 225, 235, max_alpha=0.70, power=1.4)

        # Smile Corners
        for sign in [-1.0, 1.0]:
            corner_x = cx + sign * (w_mouth * 0.96)
            corner_y = cy - 5
            draw_radial_glow(corner_x, corner_y, 7, 7, 175, 75, 85, max_alpha=0.75, power=1.5)

    draw_radiant_smile(512, 725)

    # F. Soft Chin Contour
    draw_radial_glow(512, 860, 60, 25, 215, 145, 135, max_alpha=0.20, power=1.8)

    # =============================================================
    # 2. TOP-RIGHT QUADRANT (1024..2048, 0..1024): HAIR & ACCESSORIES
    # =============================================================
    fill_rect(half, 0, size, half, 30, 24, 22) # Deep dark chocolate hair base

    # Wavy hair strand striations
    for y in range(half):
        row_y = y
        wave = math.sin(row_y * 0.08) * 12.0
        for x in range(half, size):
            idx = (row_y * size + x) * 4
            norm_x = (x - half) / float(half)
            # Anime angel ring specular sheen across crown (y around 380..520)
            sheen = max(0.0, 1.0 - abs(y - 450) / 110.0) * 0.38
            strand = math.sin((x + wave) * 0.15) * 8.0
            r = min(255, int(30 + strand + sheen * 80))
            g = min(255, int(24 + strand * 0.8 + sheen * 60))
            b = min(255, int(22 + strand * 0.7 + sheen * 50))
            buf[idx] = r
            buf[idx+1] = g
            buf[idx+2] = b

    # A. Two Parallel Lilac/Purple Barrettes (px=1200..1400, py=700..850)
    for bi in range(2):
        by = 730 + bi * 65
        for bx in range(1220, 1420):
            for dy in range(-12, 13):
                px, py = bx, by + dy
                idx = (py * size + px) * 4
                # Lilac enamel purple (#A855F7) with metallic sheen
                shine = max(0.0, 1.0 - abs(dy) / 12.0) * 45
                buf[idx] = min(255, int(168 + shine))
                buf[idx+1] = min(255, int(85 + shine))
                buf[idx+2] = min(255, int(247))

    # B. Blossom Flower Pin (px=1700, py=780)
    flower_cx, flower_cy = 1700, 780
    for p in range(5):
        ang = p / 5.0 * 2.0 * math.pi
        px_c = flower_cx + math.cos(ang) * 55
        py_c = flower_cy + math.sin(ang) * 55
        for dy in range(-45, 46):
            for dx in range(-45, 46):
                if dx*dx + dy*dy <= 45*45:
                    d = math.hypot(dx, dy)
                    blend = (1.0 - d / 45.0)
                    px = int(px_c + dx)
                    py = int(py_c + dy)
                    if 0 <= px < size and 0 <= py < size:
                        idx = (py * size + px) * 4
                        # Soft pink petal
                        buf[idx] = min(255, int(244 * blend + 233 * (1 - blend)))
                        buf[idx+1] = min(255, int(114 * blend + 213 * (1 - blend)))
                        buf[idx+2] = min(255, int(182 * blend + 255 * (1 - blend)))

    # Blossom golden pistil center
    for dy in range(-20, 21):
        for dx in range(-20, 21):
            if dx*dx + dy*dy <= 400:
                px = flower_cx + dx
                py = flower_cy + dy
                idx = (py * size + px) * 4
                buf[idx] = 252
                buf[idx+1] = 211
                buf[idx+2] = 77

    # =============================================================
    # 3. BOTTOM-LEFT QUADRANT (0..1024, 1024..2048): CROPPED LAVENDER HOODIE
    # =============================================================
    fill_rect(0, half, half, size, 155, 114, 207) # Lavender #9B72CF

    # Subtle fabric texture & kangaroo pocket shading
    for y in range(half, size):
        for x in range(half):
            idx = (y * size + x) * 4
            twill = (x + y) % 4
            tex_var = twill * 2
            buf[idx] = min(255, max(0, buf[idx] + tex_var))
            buf[idx+1] = min(255, max(0, buf[idx+1] + tex_var))
            buf[idx+2] = min(255, max(0, buf[idx+2] + tex_var))

    # White Front Zipper Line (x=508..516, y=1024..1750)
    for y in range(half, half + 720):
        for x in range(508, 517):
            idx = (y * size + x) * 4
            buf[idx] = 245
            buf[idx+1] = 245
            buf[idx+2] = 250

    # White Inner T-shirt triangle collar (x=460..564, y=1024..1140)
    for y in range(half, half + 116):
        span = int((1.0 - (y - half) / 116.0) * 52)
        for x in range(512 - span, 512 + span):
            idx = (y * size + x) * 4
            buf[idx] = 250
            buf[idx+1] = 250
            buf[idx+2] = 252

    # Lanyard Strap (Deep Purple #7C3AED) & Flower ID Badge (x=480..544, y=1240..1360)
    for y in range(half + 220, half + 340):
        for x in range(482, 542):
            idx = (y * size + x) * 4
            buf[idx] = 168
            buf[idx+1] = 85
            buf[idx+2] = 247

    # White blossom icon on badge
    badge_cx, badge_cy = 512, half + 280
    for p in range(5):
        ang = p / 5.0 * 2.0 * math.pi
        px_c = int(badge_cx + math.cos(ang) * 14)
        py_c = int(badge_cy + math.sin(ang) * 14)
        for dy in range(-7, 8):
            for dx in range(-7, 8):
                if dx*dx + dy*dy <= 49:
                    idx = ((py_c + dy) * size + (px_c + dx)) * 4
                    buf[idx] = 255
                    buf[idx+1] = 255
                    buf[idx+2] = 255

    # =============================================================
    # 4. BOTTOM-RIGHT QUADRANT (1024..2048, 1024..2048): PANTS & SNEAKERS
    # =============================================================
    fill_rect(half, half, size, size, 51, 65, 85) # Slate Charcoal #334155

    # Sneakers Region (y=1600..2048, x=1024..2048)
    for y in range(half + 580, size):
        for x in range(half, size):
            idx = (y * size + x) * 4
            # Crisp white sole with lavender accent upper
            if y > size - 120:
                buf[idx] = 248
                buf[idx+1] = 248
                buf[idx+2] = 252
            else:
                buf[idx] = 168
                buf[idx+1] = 85
                buf[idx+2] = 247

    # Encode to PNG
    raw_rows = bytearray()
    row_stride = size * 4
    for y in range(size):
        raw_rows.append(0)
        start = y * row_stride
        raw_rows.extend(buf[start : start + row_stride])

    def png_chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)

    return (
        b'\x89PNG\r\n\x1a\n' +
        png_chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)) +
        png_chunk(b'IDAT', zlib.compress(bytes(raw_rows), 6)) +
        png_chunk(b'IEND', b'')
    )


class MeshBuilder:
    def __init__(self):
        self.positions = []
        self.normals = []
        self.uvs = []
        self.joints = []
        self.weights = []
        self.indices = []
        self.morph_target_names = [
            "viseme_aa", "viseme_ih", "viseme_ou", "viseme_ee", "viseme_oh",
            "jawOpen", "mouthSmile", "mouthFrown", "browInnerUp",
            "browDownLeft", "browDownRight", "browOuterUpLeft", "browOuterUpRight",
            "blinkLeft", "blinkRight", "cheekSquintLeft", "cheekSquintRight",
            "surprised_mouth"
        ]
        self.morph_deltas = {name: [] for name in self.morph_target_names}

    def add_vertex(self, pos, norm, uv, joint, weight, morphs=None):
        idx = len(self.positions)
        self.positions.append(pos)
        self.normals.append(norm)
        self.uvs.append(uv)
        self.joints.append(joint)
        self.weights.append(weight)
        if morphs is None:
            morphs = {}
        for name in self.morph_target_names:
            self.morph_deltas[name].append(morphs.get(name, (0.0, 0.0, 0.0)))
        return idx

    def add_triangle(self, i0, i1, i2):
        self.indices.extend([i0, i1, i2])

    def add_quad(self, i0, i1, i2, i3):
        self.indices.extend([i0, i1, i2, i0, i2, i3])


def generate_asha_model():
    b = MeshBuilder()

    # =============================================================
    # 1. ANATOMICALLY SCULPTED HEAD & COHERENT FACIAL PROFILE
    # =============================================================
    # Head Center: (0.0, 1.44, 0.0), rx=0.080, ry=0.100, rz=0.085
    lat_steps = 38
    lon_steps = 44
    head_v_offset = len(b.positions)

    for i in range(lat_steps + 1):
        v = i / lat_steps
        phi = v * math.pi
        y_val = 1.44 + 0.100 * math.cos(phi)
        r_slice = 0.080 * math.sin(phi)

        for j in range(lon_steps):
            u = j / lon_steps
            theta = u * 2.0 * math.pi
            
            cos_theta = math.cos(theta)
            sin_theta = math.sin(theta)

            x_val = r_slice * sin_theta
            z_val = r_slice * cos_theta

            is_forward_face = (cos_theta > 0.0)

            if is_forward_face:
                abs_x = abs(x_val)

                # A. Sculpted Orbital Sockets (Deepened Eye Recesses)
                # Centers at (|x|=0.034, y=1.455), radius ~0.024
                if 1.432 <= y_val <= 1.478 and 0.012 <= abs_x <= 0.056:
                    eye_socket_dist = math.hypot(abs_x - 0.034, y_val - 1.455)
                    if eye_socket_dist < 0.022:
                        socket_indent = (1.0 - eye_socket_dist / 0.022) * 0.010
                        z_val -= socket_indent

                # B. Rounded Button Nose with Smooth Bridge & Under-Nose Curve
                # Bridge from y=1.458 down to tip at y=1.425
                if 1.410 <= y_val <= 1.465 and abs_x < 0.018:
                    span_f = (1.0 - abs_x / 0.018)
                    tip_dist = math.hypot(abs_x / 0.011, (y_val - 1.425) / 0.015)
                    tip_protrude = max(0.0, 1.0 - tip_dist) * 0.018
                    bridge_protrude = span_f * 0.009 * max(0.0, min(1.0, (y_val - 1.415) / 0.040))
                    z_val += (bridge_protrude + tip_protrude)

                # C. Philtrum Groove (Indent between nose base and upper lip)
                if 1.400 <= y_val <= 1.416 and abs_x < 0.007:
                    philtrum_depth = (1.0 - abs_x / 0.007) * 0.0025
                    z_val -= philtrum_depth

                # D. Sculpted Full Lips with Cupid's Bow
                if 1.368 <= y_val <= 1.402 and abs_x < 0.030:
                    lip_w = abs_x / 0.030
                    if y_val >= 1.385:
                        cupid_dip = 1.0 - 0.30 * math.exp(-((abs_x - 0.007) ** 2) / 0.00004)
                        lip_proj = (1.0 - lip_w) * 0.012 * cupid_dip
                    else:
                        lip_proj = (1.0 - lip_w) * 0.011
                    z_val += lip_proj

                # E. Apple Cheeks Prominence
                if 1.408 <= y_val <= 1.448 and 0.022 <= abs_x <= 0.062:
                    cheek_d = math.hypot(abs_x - 0.038, y_val - 1.428)
                    if cheek_d < 0.026:
                        cheek_bump = (1.0 - cheek_d / 0.026) * 0.007
                        z_val += cheek_bump

                # F. Tapered Youthful Chin & Defined Jawline
                if y_val <= 1.364:
                    jaw_taper = (1.364 - y_val) / 0.040
                    x_val *= (1.0 - jaw_taper * 0.18)
                    if abs_x < 0.022:
                        chin_pad = (1.0 - abs_x / 0.022) * jaw_taper * 0.008
                        z_val += chin_pad

            # Compute Normal
            nx = sin_theta * math.sin(phi)
            ny = math.cos(phi)
            nz = cos_theta * math.sin(phi)
            n_len = math.hypot(nx, math.hypot(ny, nz)) or 1.0
            nx, ny, nz = nx / n_len, ny / n_len, nz / n_len

            # Synchronized glTF 2.0 UV coordinates (Top-Left Quadrant)
            # Center of face in UV: (0.25, 0.25)
            uv_u = 0.25 + 0.22 * (x_val / 0.080)
            uv_v = 0.25 - 0.22 * ((y_val - 1.440) / 0.100)
            uv_u = max(0.01, min(0.49, uv_u))
            uv_v = max(0.01, min(0.49, uv_v))

            # Skin joint: Head (4), Neck (3)
            if y_val < 1.36:
                neck_f = max(0.0, min(1.0, (1.36 - y_val) / 0.04))
                joint = (4, 3, 0, 0)
                weight = (1.0 - neck_f, neck_f, 0.0, 0.0)
            else:
                joint = (4, 0, 0, 0)
                weight = (1.0, 0.0, 0.0, 0.0)

            # Morph Target Calibration
            morphs = {}
            is_mouth = (is_forward_face and 1.365 <= y_val <= 1.405 and abs(x_val) < 0.036)
            is_brow = (is_forward_face and 1.472 <= y_val <= 1.514 and abs(x_val) < 0.052)
            is_cheek_l = (is_forward_face and 1.410 <= y_val <= 1.442 and 0.020 <= x_val <= 0.058)
            is_cheek_r = (is_forward_face and 1.410 <= y_val <= 1.442 and -0.058 <= x_val <= -0.020)
            is_eye_l = (is_forward_face and 1.442 <= y_val <= 1.474 and 0.016 <= x_val <= 0.052)
            is_eye_r = (is_forward_face and 1.442 <= y_val <= 1.474 and -0.052 <= x_val <= -0.016)

            if is_mouth:
                drop_f = max(0.0, 1.0 - abs(x_val) / 0.034) * (1.0 if y_val < 1.385 else 0.40)
                widen_sign = 1.0 if x_val > 0 else -1.0
                corner_f = max(0.0, (abs(x_val) - 0.010) / 0.024) if abs(x_val) > 0.010 else 0.0

                morphs["viseme_aa"] = (0.0, -0.032 * drop_f, 0.005 * drop_f)
                morphs["viseme_ih"] = (0.014 * widen_sign, -0.005 * drop_f, 0.0)
                puck = max(0.0, 1.0 - math.hypot(x_val, y_val - 1.385) / 0.028)
                morphs["viseme_ou"] = (-0.009 * widen_sign * puck, -0.009 * puck, 0.016 * puck)
                morphs["viseme_ee"] = (0.018 * widen_sign, 0.004, 0.002)
                morphs["viseme_oh"] = (0.0, -0.022 * drop_f, 0.011 * drop_f)

                morphs["jawOpen"] = (0.0, -0.035 * drop_f, 0.004 * drop_f)
                morphs["mouthSmile"] = (0.012 * widen_sign * corner_f, 0.016 * corner_f, 0.003)
                morphs["mouthFrown"] = (-0.005 * widen_sign * corner_f, -0.014 * corner_f, 0.0)
                morphs["surprised_mouth"] = (0.0, -0.026 * drop_f, 0.014 * drop_f)

            if is_brow:
                inner_f = max(0.0, 1.0 - abs(x_val) / 0.024)
                outer_f = max(0.0, (abs(x_val) - 0.016) / 0.034)
                morphs["browInnerUp"] = (0.0, 0.016 * inner_f, 0.003 * inner_f)
                if x_val > 0:
                    morphs["browDownLeft"] = (-0.003, -0.012, 0.002)
                    morphs["browOuterUpLeft"] = (0.0, 0.014 * outer_f, 0.003 * outer_f)
                else:
                    morphs["browDownRight"] = (0.003, -0.012, 0.002)
                    morphs["browOuterUpRight"] = (0.0, 0.014 * outer_f, 0.003 * outer_f)

            if is_cheek_l:
                morphs["cheekSquintLeft"] = (0.003, 0.009, 0.002)
            if is_cheek_r:
                morphs["cheekSquintRight"] = (-0.003, 0.009, 0.002)

            if is_eye_l and y_val >= 1.458:
                blink_f = (y_val - 1.458) / 0.016
                morphs["blinkLeft"] = (0.0, -0.022 * blink_f, 0.002 * blink_f)

            if is_eye_r and y_val >= 1.458:
                blink_f = (y_val - 1.458) / 0.016
                morphs["blinkRight"] = (0.0, -0.022 * blink_f, 0.002 * blink_f)

            b.add_vertex((x_val, y_val, z_val), (nx, ny, nz), (uv_u, uv_v), joint, weight, morphs)

    for i in range(lat_steps):
        for j in range(lon_steps):
            j_next = (j + 1) % lon_steps
            i0 = head_v_offset + i * lon_steps + j
            i1 = head_v_offset + i * lon_steps + j_next
            i2 = head_v_offset + (i + 1) * lon_steps + j_next
            i3 = head_v_offset + (i + 1) * lon_steps + j
            b.add_quad(i0, i1, i2, i3)

    # Stylized Human Ears on cranium sides
    def add_ear(side_sign):
        ear_offset = len(b.positions)
        ear_cx = side_sign * 0.076
        e_pts = 10
        for ei in range(e_pts + 1):
            et = ei / e_pts
            eang = et * math.pi
            ey = 1.440 + 0.022 * math.cos(eang)
            ez = -0.006 + 0.014 * math.sin(eang)
            ex = ear_cx + side_sign * 0.012 * math.sin(eang)
            b.add_vertex((ex, ey, ez), (side_sign * 0.9, 0.0, 0.3), (0.25, 0.45), (4, 0, 0, 0), (1.0, 0.0, 0.0, 0.0))
            b.add_vertex((ear_cx, ey, ez), (side_sign * 0.9, 0.0, 0.3), (0.25, 0.45), (4, 0, 0, 0), (1.0, 0.0, 0.0, 0.0))

        for ei in range(e_pts):
            i0 = ear_offset + ei * 2
            i1 = ear_offset + ei * 2 + 1
            i2 = ear_offset + (ei + 1) * 2 + 1
            i3 = ear_offset + (ei + 1) * 2
            if side_sign > 0:
                b.add_quad(i0, i1, i2, i3)
            else:
                b.add_quad(i0, i3, i2, i1)

    add_ear(1.0)
    add_ear(-1.0)

    # =============================================================
    # 2. VOLUMINOUS WAVY HAIR BOB, BANGS, MESSY BUN & CLIPS
    # =============================================================
    hair_v_offset = len(b.positions)
    h_lat, h_lon = 22, 32
    
    def get_hairline_phi(theta):
        cos_t = math.cos(theta)
        if cos_t <= 0.0:
            return math.pi * 0.66
        else:
            return math.pi * (0.62 - 0.32 * cos_t)

    for hi in range(h_lat + 1):
        v = hi / h_lat
        for hj in range(h_lon):
            u = hj / h_lon
            theta = u * 2.0 * math.pi
            
            phi = v * get_hairline_phi(theta)
            wave_ridge = 0.007 * math.sin(theta * 6.0 + phi * 3.0)
            r_hair = 0.094 + wave_ridge
            hx = r_hair * math.sin(phi) * math.sin(theta)
            hy = 1.450 + r_hair * 1.08 * math.cos(phi)
            hz = r_hair * math.sin(phi) * math.cos(theta) - 0.006

            nx = math.sin(phi) * math.sin(theta)
            ny = math.cos(phi)
            nz = math.sin(phi) * math.cos(theta)

            uv_u = 0.52 + 0.44 * u
            uv_v = 0.02 + 0.44 * v
            b.add_vertex((hx, hy, hz), (nx, ny, nz), (uv_u, uv_v), (4, 0, 0, 0), (1.0, 0.0, 0.0, 0.0))

    for hi in range(h_lat):
        for hj in range(h_lon):
            hj_next = (hj + 1) % h_lon
            b.add_quad(hair_v_offset + hi * h_lon + hj,
                       hair_v_offset + hi * h_lon + hj_next,
                       hair_v_offset + (hi + 1) * h_lon + hj_next,
                       hair_v_offset + (hi + 1) * h_lon + hj)

    # 3D Front Bangs Ribbon Strands (curving naturally along forehead skull)
    def add_hair_bang_strand(start_x, start_y, end_x, end_y, width=0.014):
        bang_offset = len(b.positions)
        steps = 8
        for si in range(steps + 1):
            st = si / steps
            curr_x = start_x + (end_x - start_x) * st + 0.003 * math.sin(st * math.pi)
            curr_y = start_y + (end_y - start_y) * st
            # Hug skull contour closely
            r_head = 0.080
            dy_head = curr_y - 1.44
            under_sqrt = max(0.001, r_head**2 - curr_x**2 - dy_head**2)
            curr_z = math.sqrt(under_sqrt) + 0.0035 + 0.0015 * math.sin(st * math.pi)

            w_cur = width * (1.0 - st * 0.60)
            b.add_vertex((curr_x - w_cur * 0.5, curr_y, curr_z), (0.0, 0.2, 0.95), (0.65, 0.12), (4, 0, 0, 0), (1.0, 0.0, 0.0, 0.0))
            b.add_vertex((curr_x + w_cur * 0.5, curr_y, curr_z), (0.0, 0.2, 0.95), (0.75, 0.12), (4, 0, 0, 0), (1.0, 0.0, 0.0, 0.0))

        for si in range(steps):
            b.add_quad(bang_offset + si * 2,
                       bang_offset + si * 2 + 1,
                       bang_offset + (si + 1) * 2 + 1,
                       bang_offset + (si + 1) * 2)

    # 5 Front Bangs curving across the forehead
    add_hair_bang_strand(-0.010, 1.515, -0.024, 1.488, 0.016) # Center-left
    add_hair_bang_strand(0.012, 1.515, 0.026, 1.486, 0.016)  # Center-right
    add_hair_bang_strand(-0.036, 1.505, -0.050, 1.472, 0.018) # Outer left
    add_hair_bang_strand(0.038, 1.503, 0.052, 1.470, 0.018)  # Outer right
    add_hair_bang_strand(0.002, 1.518, 0.005, 1.492, 0.012)  # Center flick

    # High Messy Bun (Anchored firmly directly on the skull crown)
    def add_bun_knot(cx, cy, cz, rx_b, ry_b, rz_b, rot_offset):
        bun_offset = len(b.positions)
        b_lat, b_lon = 14, 20
        for bi in range(b_lat + 1):
            bv = bi / b_lat
            phi = bv * math.pi
            for bj in range(b_lon):
                bu = bj / b_lon
                theta = bu * 2.0 * math.pi + rot_offset
                flute = 0.008 * math.sin(theta * 5.0 + phi * 4.0)
                bx = cx + (rx_b + flute) * math.sin(phi) * math.sin(theta)
                by = cy + (ry_b + flute) * math.cos(phi)
                bz = cz + (rz_b + flute) * math.sin(phi) * math.cos(theta)

                nx = math.sin(phi) * math.sin(theta)
                ny = math.cos(phi)
                nz = math.sin(phi) * math.cos(theta)
                b.add_vertex((bx, by, bz), (nx, ny, nz), (0.60 + 0.2 * bu, 0.15 + 0.2 * bv), (4, 0, 0, 0), (1.0, 0.0, 0.0, 0.0))

        for bi in range(b_lat):
            for bj in range(b_lon):
                bj_next = (bj + 1) % b_lon
                b.add_quad(bun_offset + bi * b_lon + bj,
                           bun_offset + bi * b_lon + bj_next,
                           bun_offset + (bi + 1) * b_lon + bj_next,
                           bun_offset + (bi + 1) * b_lon + bj)

    # Core Bun firmly rooted at y=1.55m on the crown
    add_bun_knot(0.0, 1.55, -0.025, 0.052, 0.045, 0.048, 0.0)
    add_bun_knot(0.008, 1.59, -0.030, 0.036, 0.032, 0.034, 1.2)
    add_bun_knot(-0.010, 1.54, -0.055, 0.032, 0.030, 0.028, 2.4)

    # Voluminous Side Hair Locks (Wavy Bob Silhouette framing jawline)
    for side in [1.0, -1.0]:
        lock_offset = len(b.positions)
        l_steps = 14
        l_lon = 8
        for li in range(l_steps + 1):
            lt = li / l_steps
            lx = side * (0.078 + 0.008 * math.sin(lt * 3.14))
            ly = 1.45 - lt * 0.12
            lz = 0.015 - lt * 0.025
            for lj in range(l_lon):
                lu = lj / l_lon
                lang = lu * 2.0 * math.pi
                lw = 0.018 * (1.0 - lt * 0.4)
                vx = lx + lw * math.sin(lang)
                vy = ly + lw * 0.5 * math.cos(lang)
                vz = lz + lw * math.cos(lang)
                b.add_vertex((vx, vy, vz), (side * 0.8, 0.0, 0.6), (0.65 + 0.1 * lu, 0.05 + 0.16 * lt), (4, 0, 0, 0), (1.0, 0.0, 0.0, 0.0))

        for li in range(l_steps):
            for lj in range(l_lon):
                lj_next = (lj + 1) % l_lon
                b.add_quad(lock_offset + li * l_lon + lj,
                           lock_offset + li * l_lon + lj_next,
                           lock_offset + (li + 1) * l_lon + lj_next,
                           lock_offset + (li + 1) * l_lon + lj)

    # Two Parallel Lilac Hair Clips on Right Side
    clip_offset = len(b.positions)
    for ci in range(2):
        c_y = 1.488 + ci * 0.014
        for cj in range(12):
            ct = cj / 11.0
            cx_c = 0.072 + ct * 0.018
            cy_c = c_y - ct * 0.006
            cz_c = 0.035 - ct * 0.028
            b.add_vertex((cx_c, cy_c, cz_c), (0.8, 0.2, 0.5), (0.62, 0.38), (4, 0, 0, 0), (1.0, 0.0, 0.0, 0.0))
            b.add_vertex((cx_c, cy_c + 0.007, cz_c), (0.8, 0.2, 0.5), (0.66, 0.38), (4, 0, 0, 0), (1.0, 0.0, 0.0, 0.0))

    for ci in range(2):
        base_c = clip_offset + ci * 24
        for cj in range(11):
            i0 = base_c + cj * 2
            i1 = base_c + cj * 2 + 1
            i2 = base_c + (cj + 1) * 2 + 1
            i3 = base_c + (cj + 1) * 2
            b.add_quad(i0, i1, i2, i3)

    # Blossom Flower Pin (Left side bun base)
    flower_offset = len(b.positions)
    for p_idx in range(5):
        p_ang = p_idx / 5.0 * 2.0 * math.pi
        px_c = -0.050 + 0.020 * math.cos(p_ang)
        py_c = 1.55 + 0.020 * math.sin(p_ang)
        pz_c = -0.025
        b.add_vertex((px_c, py_c, pz_c), (-0.5, 0.3, 0.8), (0.82, 0.38), (4, 0, 0, 0), (1.0, 0.0, 0.0, 0.0))
        b.add_vertex((px_c * 1.05, py_c * 1.05, pz_c + 0.006), (-0.5, 0.3, 0.8), (0.85, 0.38), (4, 0, 0, 0), (1.0, 0.0, 0.0, 0.0))

    center_f = b.add_vertex((-0.050, 1.55, -0.020), (-0.5, 0.3, 0.8), (0.83, 0.40), (4, 0, 0, 0), (1.0, 0.0, 0.0, 0.0))
    for p_idx in range(5):
        p_next = (p_idx + 1) % 5
        b.add_triangle(center_f, flower_offset + p_idx * 2, flower_offset + p_next * 2)

    # =============================================================
    # 3. NECK, UPPER TORSO & OVERSIZED CROPPED HOODIE
    # =============================================================
    neck_offset = len(b.positions)
    n_lat, n_lon = 6, 20
    for ni in range(n_lat + 1):
        nv = ni / n_lat
        ny_val = 1.34 - nv * 0.06
        nr = 0.038 + 0.006 * nv
        for nj in range(n_lon):
            nu = nj / n_lon
            nang = nu * 2.0 * math.pi
            nx_val = nr * math.sin(nang)
            nz_val = nr * math.cos(nang)
            b.add_vertex((nx_val, ny_val, nz_val), (math.sin(nang), 0.0, math.cos(nang)), (0.25, 0.40), (3, 0, 0, 0), (1.0, 0.0, 0.0, 0.0))

    for ni in range(n_lat):
        for nj in range(n_lon):
            nj_next = (nj + 1) % n_lon
            b.add_quad(neck_offset + ni * n_lon + nj,
                       neck_offset + ni * n_lon + nj_next,
                       neck_offset + (ni + 1) * n_lon + nj_next,
                       neck_offset + (ni + 1) * n_lon + nj)

    hoodie_offset = len(b.positions)
    h_body_lat, h_body_lon = 18, 28
    for hi in range(h_body_lat + 1):
        hv = hi / h_body_lat
        hy_val = 1.28 - hv * 0.42
        
        chest_bulge = 0.012 * math.exp(-((hy_val - 1.15) ** 2) / 0.015)
        crop_waist = 0.008 if hy_val < 0.94 else 0.0
        hr_x = (0.138 - 0.022 * hv + chest_bulge - crop_waist)
        hr_z = (0.095 - 0.015 * hv + chest_bulge - crop_waist)

        for hj in range(h_body_lon):
            hu = hj / h_body_lon
            hang = hu * 2.0 * math.pi
            
            pouch = 0.014 if (hy_val < 0.98 and math.cos(hang) > 0.45) else 0.0
            hx_val = hr_x * math.sin(hang)
            hz_val = (hr_z + pouch) * math.cos(hang)

            if hy_val > 1.15:
                blend = (hy_val - 1.15) / 0.13
                joint = (2, 1, 0, 0)
                weight = (blend, 1.0 - blend, 0.0, 0.0)
            elif hy_val > 0.98:
                blend = (hy_val - 0.98) / 0.17
                joint = (1, 0, 0, 0)
                weight = (blend, 1.0 - blend, 0.0, 0.0)
            else:
                joint = (0, 1, 0, 0)
                weight = (1.0, 0.0, 0.0, 0.0)

            nx = math.sin(hang)
            ny = 0.1
            nz = math.cos(hang)

            uv_u = 0.05 + 0.40 * hu
            uv_v = 0.55 + 0.40 * hv
            b.add_vertex((hx_val, hy_val, hz_val), (nx, ny, nz), (uv_u, uv_v), joint, weight)

    for hi in range(h_body_lat):
        for hj in range(h_body_lon):
            hj_next = (hj + 1) % h_body_lon
            b.add_quad(hoodie_offset + hi * h_body_lon + hj,
                       hoodie_offset + hi * h_body_lon + hj_next,
                       hoodie_offset + (hi + 1) * h_body_lon + hj_next,
                       hoodie_offset + (hi + 1) * h_body_lon + hj)

    # Hoodie Collar & Draped Hood at Back
    hood_rim_offset = len(b.positions)
    rim_pts = 24
    for ri in range(rim_pts + 1):
        rt = ri / rim_pts
        rang = rt * 2.0 * math.pi
        rx_val = (0.088 + 0.020 * math.cos(rang)) * math.sin(rang)
        ry_val = 1.28 + 0.025 * math.sin(rang)
        rz_val = (0.065 + 0.035 * (1.0 - math.cos(rang))) * math.cos(rang)
        b.add_vertex((rx_val, ry_val, rz_val), (0.0, 0.8, -0.6), (0.25, 0.65), (2, 0, 0, 0), (1.0, 0.0, 0.0, 0.0))
        b.add_vertex((rx_val * 1.12, ry_val - 0.020, rz_val * 1.15), (0.0, 0.8, -0.6), (0.25, 0.70), (2, 0, 0, 0), (1.0, 0.0, 0.0, 0.0))

    for ri in range(rim_pts):
        b.add_quad(hood_rim_offset + ri * 2,
                   hood_rim_offset + ri * 2 + 1,
                   hood_rim_offset + (ri + 1) * 2 + 1,
                   hood_rim_offset + (ri + 1) * 2)

    # Hanging White Drawstrings
    for side in [1.0, -1.0]:
        cord_offset = len(b.positions)
        c_pts = 10
        for ci in range(c_pts + 1):
            ct = ci / c_pts
            cx_val = side * 0.032 + 0.004 * math.sin(ct * 3.14)
            cy_val = 1.26 - ct * 0.16
            cz_val = 0.098 + 0.003 * math.sin(ct * 6.28)
            b.add_vertex((cx_val - 0.003, cy_val, cz_val), (0.0, 0.0, 1.0), (0.25, 0.52), (2, 0, 0, 0), (1.0, 0.0, 0.0, 0.0))
            b.add_vertex((cx_val + 0.003, cy_val, cz_val), (0.0, 0.0, 1.0), (0.25, 0.52), (2, 0, 0, 0), (1.0, 0.0, 0.0, 0.0))

        for ci in range(c_pts):
            b.add_quad(cord_offset + ci * 2,
                       cord_offset + ci * 2 + 1,
                       cord_offset + (ci + 1) * 2 + 1,
                       cord_offset + (ci + 1) * 2)

    # Lanyard with Flower ID Badge
    badge_mesh_offset = len(b.positions)
    b.add_vertex((-0.024, 1.08, 0.108), (0.0, 0.0, 1.0), (0.24, 0.62), (2, 0, 0, 0), (1.0, 0.0, 0.0, 0.0))
    b.add_vertex((0.024, 1.08, 0.108), (0.0, 0.0, 1.0), (0.26, 0.62), (2, 0, 0, 0), (1.0, 0.0, 0.0, 0.0))
    b.add_vertex((0.024, 1.02, 0.108), (0.0, 0.0, 1.0), (0.26, 0.66), (2, 0, 0, 0), (1.0, 0.0, 0.0, 0.0))
    b.add_vertex((-0.024, 1.02, 0.108), (0.0, 0.0, 1.0), (0.24, 0.66), (2, 0, 0, 0), (1.0, 0.0, 0.0, 0.0))
    b.add_quad(badge_mesh_offset, badge_mesh_offset + 1, badge_mesh_offset + 2, badge_mesh_offset + 3)

    # =============================================================
    # 4. ARMS & SLEEVES
    # =============================================================
    def add_arm(side, sh_j, up_j, lo_j, hand_j):
        arm_offset = len(b.positions)
        a_steps = 18
        a_lon = 14
        for ai in range(a_steps + 1):
            at = ai / a_steps
            ay_val = 1.25 - at * 0.52
            ax_val = side * (0.16 + at * 0.08)
            az_val = 0.01 - at * 0.02

            # Voluminous oversized hoodie sleeve
            sleeve_r = 0.048 - at * 0.012 if at < 0.85 else 0.028 # Cuff at 0.85

            if at < 0.45:
                blend = at / 0.45
                joint = (sh_j, up_j, 0, 0)
                weight = (1.0 - blend, blend, 0.0, 0.0)
            elif at < 0.85:
                blend = (at - 0.45) / 0.40
                joint = (up_j, lo_j, 0, 0)
                weight = (1.0 - blend, blend, 0.0, 0.0)
            else:
                joint = (lo_j, hand_j, 0, 0)
                weight = (0.3, 0.7, 0.0, 0.0)

            for aj in range(a_lon):
                au = aj / a_lon
                aang = au * 2.0 * math.pi
                px = ax_val + sleeve_r * math.cos(aang)
                py = ay_val
                pz = az_val + sleeve_r * math.sin(aang)
                b.add_vertex((px, py, pz), (math.cos(aang), 0.0, math.sin(aang)), (0.15 + 0.2 * au, 0.65 + 0.2 * at), joint, weight)

        for ai in range(a_steps):
            for aj in range(a_lon):
                aj_next = (aj + 1) % a_lon
                i0 = arm_offset + ai * a_lon + aj
                i1 = arm_offset + ai * a_lon + aj_next
                i2 = arm_offset + (ai + 1) * a_lon + aj_next
                i3 = arm_offset + (ai + 1) * a_lon + aj
                if side > 0:
                    b.add_quad(i0, i1, i2, i3)
                else:
                    b.add_quad(i0, i3, i2, i1)

        # Stylized Hands & Fingers
        hand_offset = len(b.positions)
        hand_lat, hand_lon = 8, 12
        for hi in range(hand_lat + 1):
            ht = hi / hand_lat
            hy = 0.72 - ht * 0.09
            hx = side * (0.24 + ht * 0.01)
            hr = 0.022 * (1.0 - ht * 0.45)
            for hj in range(hand_lon):
                hu = hj / hand_lon
                hang = hu * 2.0 * math.pi
                px = hx + hr * math.cos(hang)
                py = hy
                pz = -0.01 + hr * 0.7 * math.sin(hang)
                b.add_vertex((px, py, pz), (math.cos(hang), 0.0, math.sin(hang)), (0.25, 0.45), (hand_j, 0, 0, 0), (1.0, 0.0, 0.0, 0.0))

        for hi in range(hand_lat):
            for hj in range(hand_lon):
                hj_next = (hj + 1) % hand_lon
                i0 = hand_offset + hi * hand_lon + hj
                i1 = hand_offset + hi * hand_lon + hj_next
                i2 = hand_offset + (hi + 1) * hand_lon + hj_next
                i3 = hand_offset + (hi + 1) * hand_lon + hj
                if side > 0:
                    b.add_quad(i0, i1, i2, i3)
                else:
                    b.add_quad(i0, i3, i2, i1)

    add_arm(1.0, 7, 9, 11, 13)   # Left Arm
    add_arm(-1.0, 8, 10, 12, 14) # Right Arm

    # =============================================================
    # 5. RELAXED CARGO TROUSERS (LEGS)
    # =============================================================
    def add_leg(side, up_j, lo_j, foot_j):
        leg_offset = len(b.positions)
        l_steps = 22
        l_lon = 16
        for li in range(l_steps + 1):
            lt = li / l_steps
            ly_val = 0.86 - lt * 0.72
            lx_val = side * (0.082 + lt * 0.015)
            lz_val = 0.0

            # Relaxed loose cargo pant silhouette with slight knee bagginess
            knee_bag = 0.012 * math.exp(-((lt - 0.48) ** 2) / 0.02)
            lr = 0.068 + knee_bag - lt * 0.012

            if lt < 0.48:
                blend = lt / 0.48
                joint = (up_j, lo_j, 0, 0)
                weight = (1.0 - blend, blend, 0.0, 0.0)
            elif lt < 0.90:
                blend = (lt - 0.48) / 0.42
                joint = (lo_j, foot_j, 0, 0)
                weight = (1.0 - blend, blend, 0.0, 0.0)
            else:
                joint = (foot_j, 0, 0, 0)
                weight = (1.0, 0.0, 0.0, 0.0)

            for lj in range(l_lon):
                lu = lj / l_lon
                lang = lu * 2.0 * math.pi
                px = lx_val + lr * math.cos(lang)
                py = ly_val
                pz = lz_val + lr * math.sin(lang)
                b.add_vertex((px, py, pz), (math.cos(lang), 0.0, math.sin(lang)), (0.65 + 0.2 * lu, 0.60 + 0.2 * lt), joint, weight)

        for li in range(l_steps):
            for lj in range(l_lon):
                lj_next = (lj + 1) % l_lon
                i0 = leg_offset + li * l_lon + lj
                i1 = leg_offset + li * l_lon + lj_next
                i2 = leg_offset + (li + 1) * l_lon + lj_next
                i3 = leg_offset + (li + 1) * l_lon + lj
                if side > 0:
                    b.add_quad(i0, i1, i2, i3)
                else:
                    b.add_quad(i0, i3, i2, i1)

        # Cargo Pocket Flaps (Lateral thigh)
        pocket_offset = len(b.positions)
        pk_x = side * (lx_val + lr + 0.005)
        pk_y = 0.58
        b.add_vertex((pk_x, pk_y, -0.035), (side, 0.0, 0.0), (0.75, 0.65), (up_j, 0, 0, 0), (1.0, 0.0, 0.0, 0.0))
        b.add_vertex((pk_x, pk_y, 0.035), (side, 0.0, 0.0), (0.80, 0.65), (up_j, 0, 0, 0), (1.0, 0.0, 0.0, 0.0))
        b.add_vertex((pk_x, pk_y - 0.08, 0.035), (side, 0.0, 0.0), (0.80, 0.70), (up_j, 0, 0, 0), (1.0, 0.0, 0.0, 0.0))
        b.add_vertex((pk_x, pk_y - 0.08, -0.035), (side, 0.0, 0.0), (0.75, 0.70), (up_j, 0, 0, 0), (1.0, 0.0, 0.0, 0.0))
        b.add_quad(pocket_offset, pocket_offset + 1, pocket_offset + 2, pocket_offset + 3)

    add_leg(1.0, 15, 17, 19)   # Left Leg
    add_leg(-1.0, 16, 18, 20)  # Right Leg

    # =============================================================
    # 6. SNEAKERS & SOCKS
    # =============================================================
    def add_sneaker(side, foot_j):
        snk_offset = len(b.positions)
        snk_lat, snk_lon = 10, 16
        for si in range(snk_lat + 1):
            st = si / snk_lat
            sy = 0.14 - st * 0.14
            for sj in range(snk_lon):
                su = sj / snk_lon
                sang = su * 2.0 * math.pi
                # Elongated shoe profile: wider at sole, toe protruding forward
                toe_proj = 0.035 * max(0.0, math.cos(sang)) if st > 0.4 else 0.0
                sr_x = 0.046 * (1.0 - st * 0.15)
                sr_z = 0.075 * (1.0 - st * 0.10) + toe_proj

                px = side * 0.095 + sr_x * math.sin(sang)
                py = sy
                pz = 0.02 + sr_z * math.cos(sang)

                uv_v = 0.85 if st < 0.7 else 0.95
                b.add_vertex((px, py, pz), (math.sin(sang), 0.2, math.cos(sang)), (0.75 + 0.15 * su, uv_v), (foot_j, 0, 0, 0), (1.0, 0.0, 0.0, 0.0))

        for si in range(snk_lat):
            for sj in range(snk_lon):
                sj_next = (sj + 1) % snk_lon
                i0 = snk_offset + si * snk_lon + sj
                i1 = snk_offset + si * snk_lon + sj_next
                i2 = snk_offset + (si + 1) * snk_lon + sj_next
                i3 = snk_offset + (si + 1) * snk_lon + sj
                if side > 0:
                    b.add_quad(i0, i1, i2, i3)
                else:
                    b.add_quad(i0, i3, i2, i1)

    add_sneaker(1.0, 19)   # Left Foot
    add_sneaker(-1.0, 20)  # Right Foot

    return b


def create_gltf_binary(builder, texture_png_bytes):
    """
    Constructs a valid glTF 2.0 binary (.glb) asset containing:
    - 1 mesh primitive with attributes POSITION, NORMAL, TEXCOORD_0, JOINTS_0, WEIGHTS_0
    - 18 morph targets for facial blendshapes & visemes
    - 21 humanoid skeletal bones with hierarchy & Inverse Bind Matrices
    - 1 PBR material with diffuse baseColorTexture
    """
    bone_defs = [
        {"name": "Hips", "pos": (0.0, 0.88, 0.0), "parent": None},
        {"name": "Spine", "pos": (0.0, 1.05, 0.0), "parent": 0},
        {"name": "Chest", "pos": (0.0, 1.24, 0.0), "parent": 1},
        {"name": "Neck", "pos": (0.0, 1.35, 0.0), "parent": 2},
        {"name": "Head", "pos": (0.0, 1.44, 0.0), "parent": 3},
        {"name": "LeftEye", "pos": (0.034, 1.455, 0.065), "parent": 4},
        {"name": "RightEye", "pos": (-0.034, 1.455, 0.065), "parent": 4},
        {"name": "LeftShoulder", "pos": (0.08, 1.26, 0.0), "parent": 2},
        {"name": "RightShoulder", "pos": (-0.08, 1.26, 0.0), "parent": 2},
        {"name": "LeftUpperArm", "pos": (0.16, 1.22, 0.0), "parent": 7},
        {"name": "RightUpperArm", "pos": (-0.16, 1.22, 0.0), "parent": 8},
        {"name": "LeftLowerArm", "pos": (0.22, 0.98, 0.0), "parent": 9},
        {"name": "RightLowerArm", "pos": (-0.22, 0.98, 0.0), "parent": 10},
        {"name": "LeftHand", "pos": (0.25, 0.72, 0.0), "parent": 11},
        {"name": "RightHand", "pos": (-0.25, 0.72, 0.0), "parent": 12},
        {"name": "LeftUpperLeg", "pos": (0.085, 0.84, 0.0), "parent": 0},
        {"name": "RightUpperLeg", "pos": (-0.085, 0.84, 0.0), "parent": 0},
        {"name": "LeftLowerLeg", "pos": (0.092, 0.48, 0.0), "parent": 15},
        {"name": "RightLowerLeg", "pos": (-0.092, 0.48, 0.0), "parent": 16},
        {"name": "LeftFoot", "pos": (0.095, 0.14, 0.0), "parent": 17},
        {"name": "RightFoot", "pos": (-0.095, 0.14, 0.0), "parent": 18},
    ]

    children_map = {i: [] for i in range(len(bone_defs))}
    for i, b_def in enumerate(bone_defs):
        if b_def["parent"] is not None:
            children_map[b_def["parent"]].append(i)

    local_transforms = []
    for i, b_def in enumerate(bone_defs):
        p_idx = b_def["parent"]
        if p_idx is None:
            loc = b_def["pos"]
        else:
            p_pos = bone_defs[p_idx]["pos"]
            loc = (b_def["pos"][0] - p_pos[0], b_def["pos"][1] - p_pos[1], b_def["pos"][2] - p_pos[2])
        local_transforms.append(loc)

    bin_data = bytearray()

    def pack_data(fmt, values):
        nonlocal bin_data
        offset = len(bin_data)
        packed = struct.pack(fmt, *values)
        bin_data.extend(packed)
        pad = (4 - (len(bin_data) % 4)) % 4
        bin_data.extend(b'\x00' * pad)
        return offset, len(packed)

    accessors = []
    buffer_views = []

    def add_accessor(component_type, count, data_type, min_val, max_val, byte_offset, byte_length):
        bv_idx = len(buffer_views)
        buffer_views.append({
            "buffer": 0,
            "byteOffset": byte_offset,
            "byteLength": byte_length
        })
        acc_idx = len(accessors)
        acc = {
            "bufferView": bv_idx,
            "byteOffset": 0,
            "componentType": component_type,
            "count": count,
            "type": data_type
        }
        if min_val is not None:
            acc["min"] = min_val
        if max_val is not None:
            acc["max"] = max_val
        accessors.append(acc)
        return acc_idx

    # 1. Indices
    idx_flat = builder.indices
    idx_off, idx_len = pack_data(f"<{len(idx_flat)}H", idx_flat)
    idx_acc = add_accessor(5123, len(idx_flat), "SCALAR", [min(idx_flat)], [max(idx_flat)], idx_off, idx_len)

    # 2. Positions
    num_verts = len(builder.positions)
    pos_flat = [coord for p in builder.positions for coord in p]
    min_pos = [min(p[c] for p in builder.positions) for c in range(3)]
    max_pos = [max(p[c] for p in builder.positions) for c in range(3)]
    pos_off, pos_len = pack_data(f"<{len(pos_flat)}f", pos_flat)
    pos_acc = add_accessor(5126, num_verts, "VEC3", min_pos, max_pos, pos_off, pos_len)

    # 3. Normals
    norm_flat = [coord for n in builder.normals for coord in n]
    norm_off, norm_len = pack_data(f"<{len(norm_flat)}f", norm_flat)
    norm_acc = add_accessor(5126, num_verts, "VEC3", None, None, norm_off, norm_len)

    # 4. UVs
    uv_flat = [coord for uv in builder.uvs for coord in uv]
    uv_off, uv_len = pack_data(f"<{len(uv_flat)}f", uv_flat)
    uv_acc = add_accessor(5126, num_verts, "VEC2", None, None, uv_off, uv_len)

    # 5. Joints
    joints_flat = [j for joint in builder.joints for j in joint]
    joints_off, joints_len = pack_data(f"<{len(joints_flat)}H", joints_flat)
    joints_acc = add_accessor(5123, num_verts, "VEC4", None, None, joints_off, joints_len)

    # 6. Weights
    weights_flat = [w for weight in builder.weights for w in weight]
    weights_off, weights_len = pack_data(f"<{len(weights_flat)}f", weights_flat)
    weights_acc = add_accessor(5126, num_verts, "VEC4", None, None, weights_off, weights_len)

    # 7. Morph Targets (POSITION deltas)
    morph_target_accessors = []
    for m_name in builder.morph_target_names:
        deltas = builder.morph_deltas[m_name]
        d_flat = [c for d in deltas for c in d]
        min_d = [min(d[c] for d in deltas) for c in range(3)]
        max_d = [max(d[c] for d in deltas) for c in range(3)]
        d_off, d_len = pack_data(f"<{len(d_flat)}f", d_flat)
        m_acc = add_accessor(5126, num_verts, "VEC3", min_d, max_d, d_off, d_len)
        morph_target_accessors.append({"POSITION": m_acc})

    # 8. Inverse Bind Matrices (21 x MAT4)
    ibm_matrices = []
    for b_def in bone_defs:
        bx, by, bz = b_def["pos"]
        ibm = [
            1.0, 0.0, 0.0, 0.0,
            0.0, 1.0, 0.0, 0.0,
            0.0, 0.0, 1.0, 0.0,
            -bx, -by, -bz, 1.0
        ]
        ibm_matrices.extend(ibm)

    ibm_off, ibm_len = pack_data(f"<{len(ibm_matrices)}f", ibm_matrices)
    ibm_acc = add_accessor(5126, 21, "MAT4", None, None, ibm_off, ibm_len)

    # 9. Embedded Texture PNG
    img_off = len(bin_data)
    bin_data.extend(texture_png_bytes)
    pad = (4 - (len(bin_data) % 4)) % 4
    bin_data.extend(b'\x00' * pad)
    img_bv = len(buffer_views)
    buffer_views.append({
        "buffer": 0,
        "byteOffset": img_off,
        "byteLength": len(texture_png_bytes)
    })

    # Nodes
    nodes = []
    for i, b_def in enumerate(bone_defs):
        loc = local_transforms[i]
        node = {
            "name": b_def["name"],
            "translation": [loc[0], loc[1], loc[2]]
        }
        if children_map[i]:
            node["children"] = children_map[i]
        nodes.append(node)

    # Node 21: Character Mesh Node
    mesh_node_idx = len(nodes)
    nodes.append({
        "name": "Asha_Mesh",
        "mesh": 0,
        "skin": 0
    })

    # Node 22: Root Node
    root_node_idx = len(nodes)
    nodes.append({
        "name": "Asha_Character_Root",
        "children": [0, mesh_node_idx]
    })

    gltf_json = {
        "asset": {
            "version": "2.0",
            "generator": "Saksham Neuro-Care Stage 7.5.1.3 Facial Reconstruction Generator"
        },
        "scene": 0,
        "scenes": [
            {
                "name": "Asha_Scene",
                "nodes": [root_node_idx]
            }
        ],
        "nodes": nodes,
        "meshes": [
            {
                "name": "Asha_Humanoid_Mesh",
                "primitives": [
                    {
                        "attributes": {
                            "POSITION": pos_acc,
                            "NORMAL": norm_acc,
                            "TEXCOORD_0": uv_acc,
                            "JOINTS_0": joints_acc,
                            "WEIGHTS_0": weights_acc
                        },
                        "indices": idx_acc,
                        "material": 0,
                        "targets": morph_target_accessors
                    }
                ],
                "weights": [0.0] * len(builder.morph_target_names),
                "extras": {
                    "targetNames": builder.morph_target_names
                }
            }
        ],
        "skins": [
            {
                "name": "Asha_Armature",
                "inverseBindMatrices": ibm_acc,
                "joints": list(range(21)),
                "skeleton": 0
            }
        ],
        "materials": [
            {
                "name": "Asha_PBR_Atlas_Material",
                "pbrMetallicRoughness": {
                    "baseColorTexture": {
                        "index": 0
                    },
                    "metallicFactor": 0.05,
                    "roughnessFactor": 0.75
                },
                "doubleSided": True
            }
        ],
        "textures": [
            {
                "sampler": 0,
                "source": 0
            }
        ],
        "images": [
            {
                "bufferView": img_bv,
                "mimeType": "image/png",
                "name": "Asha_Texture_Atlas"
            }
        ],
        "samplers": [
            {
                "magFilter": 9729,
                "minFilter": 9987,
                "wrapS": 10497,
                "wrapT": 10497
            }
        ],
        "accessors": accessors,
        "bufferViews": buffer_views,
        "buffers": [
            {
                "byteLength": len(bin_data)
            }
        ]
    }

    json_str = json.dumps(gltf_json, separators=(',', ':'))
    json_bytes = json_str.encode('utf-8')
    json_pad = (4 - (len(json_bytes) % 4)) % 4
    json_bytes += b' ' * json_pad

    total_len = 12 + 8 + len(json_bytes) + 8 + len(bin_data)

    glb = bytearray()
    glb.extend(struct.pack('<III', 0x46546C67, 2, total_len))
    glb.extend(struct.pack('<II', len(json_bytes), 0x4E4F534A))
    glb.extend(json_bytes)
    glb.extend(struct.pack('<II', len(bin_data), 0x004E4942))
    glb.extend(bin_data)

    return bytes(glb)


def main():
    print("=" * 72)
    print("SAKSHAM NEURO-CARE — STAGE 7.5.1.3: ASHA FACIAL RECONSTRUCTION")
    print("=" * 72)

    out_dir = "frontend/public/assets/asha-3d"
    os.makedirs(out_dir, exist_ok=True)

    # 1. Generate 2048x2048 high-res PBR texture atlas
    print("\n[Step 1/3] Generating 2048x2048 PBR texture atlas with reconstructed anime face...")
    atlas_png = generate_texture_atlas()
    atlas_path = os.path.join(out_dir, "asha_texture_atlas.png")
    with open(atlas_path, "wb") as f:
        f.write(atlas_png)
    atlas_size_kb = len(atlas_png) / 1024.0
    print(f" -> Saved {atlas_path} ({atlas_size_kb:.1f} KB)")

    # 2. Reconstruct 3D humanoid mesh
    print("\n[Step 2/3] Reconstructing 3D humanoid model and facial morphology...")
    builder = generate_asha_model()
    num_verts = len(builder.positions)
    num_tris = len(builder.indices) // 3
    print(f" -> Generated {num_verts:,} vertices, {num_tris:,} triangles")
    assert num_tris <= 22000, f"Triangle count {num_tris} exceeds budget of 22,000!"

    # 3. Assemble binary glTF 2.0 (.glb)
    print("\n[Step 3/3] Compiling binary glTF 2.0 (.glb) with 21 bones and 18 morph targets...")
    glb_data = create_gltf_binary(builder, atlas_png)
    glb_path = os.path.join(out_dir, "asha.glb")
    with open(glb_path, "wb") as f:
        f.write(glb_data)
    glb_size_mb = len(glb_data) / (1024.0 * 1024.0)
    print(f" -> Saved {glb_path} ({glb_size_mb:.2f} MB)")
    assert glb_size_mb <= 4.5, f"GLB size {glb_size_mb:.2f} MB exceeds budget of 4.5 MB!"

    # 4. Generate Metadata
    metadata = {
        "character_name": "Asha",
        "milestone": "7.5.1.3",
        "version": "3.1.0",
        "identity_directive": "Reconstructed polished stylized 3D anime companion matching approved reference images",
        "mesh": {
            "vertices": num_verts,
            "triangles": num_tris,
            "budget_compliance": True
        },
        "file_size": {
            "megabytes": round(glb_size_mb, 2),
            "budget_compliance": True
        },
        "textures": {
            "atlas_resolution": "2048x2048",
            "channels": "RGBA"
        },
        "armature": {
            "bones_count": 21,
            "standard": "Humanoid"
        },
        "morph_targets": {
            "count": len(builder.morph_target_names),
            "names": builder.morph_target_names
        }
    }
    meta_path = os.path.join(out_dir, "asha_model_metadata.json")
    with open(meta_path, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f" -> Saved {meta_path}")

    print("\n[SUCCESS] Stage 7.5.1.3 3D Asha asset generation complete.")


if __name__ == "__main__":
    main()
