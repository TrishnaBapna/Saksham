#!/usr/bin/env python3
"""
scripts/render_asha_prototype.py
SAKSHAM NEURO-CARE — STAGE 7.5.1.5: PROTOTYPE 3D EVIDENCE RENDERER

Renders exact photographic views directly from the isolated prototype:
frontend/public/assets/asha-prototype/asha_prototype_v1.glb

Deliverables required by Stage 7.5.1.5:
1. front_neutral.png  - Front neutral face close-up
2. front_smiling.png  - Front smiling face close-up (with morph target 'smile')
3. three_quarter.png  - Three-quarter face close-up (32° yaw)
4. side_profile.png   - Side-profile face close-up (82° yaw)
5. full_body_front.png- Full-body front view (head-to-toe)
6. full_body_side.png - Full-body side profile view
"""

import os
import sys
import json
import math
import struct
import zlib
import time


def load_glb(glb_path):
    with open(glb_path, 'rb') as f:
        magic, version, length = struct.unpack('<III', f.read(12))
        assert magic == 0x46546C67, "Invalid GLB"

        c0_len, c0_type = struct.unpack('<II', f.read(8))
        json_bytes = f.read(c0_len)
        gltf = json.loads(json_bytes.decode('utf-8'))

        c1_len, c1_type = struct.unpack('<II', f.read(8))
        bin_bytes = f.read(c1_len)

    def get_acc(idx):
        acc = gltf['accessors'][idx]
        bv = gltf['bufferViews'][acc['bufferView']]
        offset = bv.get('byteOffset', 0) + acc.get('byteOffset', 0)
        return bin_bytes[offset : offset + bv['byteLength']], acc

    prim = gltf['meshes'][0]['primitives'][0]

    # Indices
    idx_raw, idx_acc = get_acc(prim['indices'])
    indices = struct.unpack(f"<{idx_acc['count']}H", idx_raw[:idx_acc['count']*2])

    # Position
    pos_raw, pos_acc = get_acc(prim['attributes']['POSITION'])
    positions = [struct.unpack('<fff', pos_raw[i*12:i*12+12]) for i in range(pos_acc['count'])]

    # Normal
    norm_raw, norm_acc = get_acc(prim['attributes']['NORMAL'])
    normals = [struct.unpack('<fff', norm_raw[i*12:i*12+12]) for i in range(norm_acc['count'])]

    # UV
    uv_raw, uv_acc = get_acc(prim['attributes']['TEXCOORD_0'])
    uvs = [struct.unpack('<ff', uv_raw[i*8:i*8+8]) for i in range(uv_acc['count'])]

    # Morph targets
    target_names = gltf['meshes'][0].get('extras', {}).get('targetNames', [])
    morph_deltas = {}
    if 'targets' in prim:
        for t_idx, target in enumerate(prim['targets']):
            t_name = target_names[t_idx] if t_idx < len(target_names) else f"target_{t_idx}"
            t_raw, t_acc = get_acc(target['POSITION'])
            deltas = [struct.unpack('<fff', t_raw[i*12:i*12+12]) for i in range(t_acc['count'])]
            morph_deltas[t_name] = deltas

    # Image
    img_bv = gltf['bufferViews'][gltf['images'][0]['bufferView']]
    img_bytes = bin_bytes[img_bv['byteOffset'] : img_bv['byteOffset'] + img_bv['byteLength']]

    tex_w, tex_h, tex_rgba = parse_png_rgba(img_bytes)

    return {
        "positions": positions,
        "normals": normals,
        "uvs": uvs,
        "indices": indices,
        "morph_deltas": morph_deltas,
        "tex_w": tex_w,
        "tex_h": tex_h,
        "tex_rgba": tex_rgba
    }


def parse_png_rgba(png_bytes):
    assert png_bytes[:8] == b'\x89PNG\r\n\x1a\n', "Invalid PNG signature"
    offset = 8
    idat_chunks = []
    w, h = 0, 0
    while offset < len(png_bytes):
        c_len = struct.unpack('>I', png_bytes[offset:offset+4])[0]
        c_type = png_bytes[offset+4:offset+8]
        c_data = png_bytes[offset+8:offset+8+c_len]
        offset += 8 + c_len + 4
        if c_type == b'IHDR':
            w, h, bit_d, color_type = struct.unpack('>IIBB', c_data[:10])
            assert bit_d == 8 and color_type == 6, "Expected 8-bit RGBA PNG"
        elif c_type == b'IDAT':
            idat_chunks.append(c_data)
        elif c_type == b'IEND':
            break

    decomp = zlib.decompress(b''.join(idat_chunks))
    stride = w * 4
    rgba = bytearray(w * h * 4)
    decomp_offset = 0
    prev_row = bytearray(stride)

    for y in range(h):
        filter_type = decomp[decomp_offset]
        decomp_offset += 1
        curr_row = bytearray(decomp[decomp_offset : decomp_offset + stride])
        decomp_offset += stride

        if filter_type == 0:
            pass
        elif filter_type == 1:
            for i in range(4, stride):
                curr_row[i] = (curr_row[i] + curr_row[i - 4]) & 0xFF
        elif filter_type == 2:
            for i in range(stride):
                curr_row[i] = (curr_row[i] + prev_row[i]) & 0xFF
        elif filter_type == 3:
            for i in range(stride):
                left = curr_row[i - 4] if i >= 4 else 0
                up = prev_row[i]
                curr_row[i] = (curr_row[i] + ((left + up) >> 1)) & 0xFF
        elif filter_type == 4:
            for i in range(stride):
                a = curr_row[i - 4] if i >= 4 else 0
                b = prev_row[i]
                c = prev_row[i - 4] if i >= 4 else 0
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                curr_row[i] = (curr_row[i] + pr) & 0xFF

        out_start = y * stride
        rgba[out_start : out_start + stride] = curr_row
        prev_row = curr_row

    return w, h, rgba


def write_png(width, height, rgba_data, out_path):
    stride = width * 4
    raw_rows = bytearray()
    for y in range(height):
        raw_rows.append(0)
        raw_rows.extend(rgba_data[y * stride : (y + 1) * stride])

    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)

    png_data = (
        b'\x89PNG\r\n\x1a\n' +
        chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)) +
        chunk(b'IDAT', zlib.compress(bytes(raw_rows), 6)) +
        chunk(b'IEND', b'')
    )
    with open(out_path, 'wb') as f:
        f.write(png_data)


def render_view(model, width, height, cam_pos, cam_target, fov_deg=35.0, morph_weights=None):
    num_v = len(model["positions"])
    pos = [list(p) for p in model["positions"]]
    base_norm = model["normals"]

    # Apply Morph Targets
    if morph_weights:
        for m_name, weight in morph_weights.items():
            if m_name in model["morph_deltas"] and weight != 0.0:
                deltas = model["morph_deltas"][m_name]
                for i in range(num_v):
                    d = deltas[i]
                    pos[i][0] += d[0] * weight
                    pos[i][1] += d[1] * weight
                    pos[i][2] += d[2] * weight

    # Camera Basis Vectors
    fx = cam_pos[0] - cam_target[0]
    fy = cam_pos[1] - cam_target[1]
    fz = cam_pos[2] - cam_target[2]
    f_len = math.hypot(fx, math.hypot(fy, fz)) or 1.0
    fx, fy, fz = fx / f_len, fy / f_len, fz / f_len

    # Right vector = Up (0,1,0) x Forward
    rx = 1.0 * fz - 0.0 * fy
    ry = 0.0 * fx - 0.0 * fz
    rz = 0.0 * fy - 1.0 * fx
    r_len = math.hypot(rx, math.hypot(ry, rz)) or 1.0
    rx, ry, rz = rx / r_len, ry / r_len, rz / r_len

    # Up vector = Forward x Right
    ux = fy * rz - fz * ry
    uy = fz * rx - fx * rz
    uz = fx * ry - fy * rx

    fov_rad = math.radians(fov_deg)
    focal = 1.0 / math.tan(fov_rad / 2.0)
    aspect = width / height

    # Key / Fill Lights (studio 3-point lighting)
    l_key = (0.5, 0.8, 0.8)
    lk_len = math.hypot(l_key[0], math.hypot(l_key[1], l_key[2]))
    l_key = (l_key[0] / lk_len, l_key[1] / lk_len, l_key[2] / lk_len)

    l_fill = (-0.6, 0.3, 0.6)
    lf_len = math.hypot(l_fill[0], math.hypot(l_fill[1], l_fill[2]))
    l_fill = (l_fill[0] / lf_len, l_fill[1] / lf_len, l_fill[2] / lf_len)

    # Transform vertices to screen space
    scr = []
    for i in range(num_v):
        p = pos[i]
        dx = p[0] - cam_pos[0]
        dy = p[1] - cam_pos[1]
        dz = p[2] - cam_pos[2]

        vx = rx * dx + ry * dy + rz * dz
        vy = ux * dx + uy * dy + uz * dz
        vz = -(fx * dx + fy * dy + fz * dz)

        if vz > 0.05:
            px = (vx / vz) * (focal / aspect)
            py = (vy / vz) * focal
            sx = (px + 1.0) * 0.5 * width
            sy = (1.0 - py) * 0.5 * height
            sz = 1.0 / vz
            uv = model["uvs"][i]
            n = base_norm[i]
            scr.append((sx, sy, sz, uv[0], uv[1], n[0], n[1], n[2]))
        else:
            scr.append(None)

    zbuf = [0.0] * (width * height)
    # Neutral lavender studio gradient background matching Google Flow video
    fb = bytearray(width * height * 4)
    for y in range(height):
        grad = y / height
        bg_r = int(230 * (1 - grad) + 215 * grad)
        bg_g = int(220 * (1 - grad) + 205 * grad)
        bg_b = int(245 * (1 - grad) + 235 * grad)
        row_start = y * width * 4
        for x in range(width):
            idx = row_start + x * 4
            fb[idx] = bg_r
            fb[idx+1] = bg_g
            fb[idx+2] = bg_b
            fb[idx+3] = 255

    indices = model["indices"]
    tex_w = model["tex_w"]
    tex_h = model["tex_h"]
    tex_rgba = model["tex_rgba"]
    tex_stride = tex_w * 4

    num_tri = len(indices) // 3
    for ti in range(num_tri):
        i0 = indices[ti * 3]
        i1 = indices[ti * 3 + 1]
        i2 = indices[ti * 3 + 2]

        v0, v1, v2 = scr[i0], scr[i1], scr[i2]
        if v0 is None or v1 is None or v2 is None:
            continue

        x0, y0, z0, u0, v0_u, nx0, ny0, nz0 = v0
        x1, y1, z1, u1, v1_u, nx1, ny1, nz1 = v1
        x2, y2, z2, u2, v2_u, nx2, ny2, nz2 = v2

        area = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0)
        if area <= 0.001:
            continue # Backface culling

        inv_area = 1.0 / area
        min_x = max(0, int(min(x0, x1, x2)))
        max_x = min(width - 1, int(max(x0, x1, x2)) + 1)
        min_y = max(0, int(min(y0, y1, y2)))
        max_y = min(height - 1, int(max(y0, y1, y2)) + 1)

        # Average normal for lighting
        avg_nx = (nx0 + nx1 + nx2) / 3.0
        avg_ny = (ny0 + ny1 + ny2) / 3.0
        avg_nz = (nz0 + nz1 + nz2) / 3.0
        n_len = math.hypot(avg_nx, math.hypot(avg_ny, avg_nz))
        if n_len > 1e-6:
            avg_nx, avg_ny, avg_nz = avg_nx / n_len, avg_ny / n_len, avg_nz / n_len

        dot_k = max(0.0, avg_nx * l_key[0] + avg_ny * l_key[1] + avg_nz * l_key[2])
        dot_f = max(0.0, avg_nx * l_fill[0] + avg_ny * l_fill[1] + avg_nz * l_fill[2])
        # Ambient + Key + Fill
        light = 0.45 + 0.45 * dot_k + 0.20 * dot_f
        light = min(1.25, light)

        for py in range(min_y, max_y + 1):
            row_idx = py * width
            for px in range(min_x, max_x + 1):
                w0 = ((x1 - px) * (y2 - py) - (y1 - py) * (x2 - px)) * inv_area
                w1 = ((x2 - px) * (y0 - py) - (y2 - py) * (x0 - px)) * inv_area
                w2 = 1.0 - w0 - w1

                if w0 >= 0 and w1 >= 0 and w2 >= 0:
                    pz = w0 * z0 + w1 * z1 + w2 * z2
                    buf_idx = row_idx + px
                    if pz > zbuf[buf_idx]:
                        zbuf[buf_idx] = pz

                        # Perspective-correct UV interpolation
                        inv_z = pz
                        u = (w0 * u0 * z0 + w1 * u1 * z1 + w2 * u2 * z2) / inv_z
                        v = (w0 * v0_u * z0 + w1 * v1_u * z1 + w2 * v2_u * z2) / inv_z

                        tx = int(u * tex_w) % tex_w
                        ty = int(v * tex_h) % tex_h
                        t_idx = ty * tex_stride + tx * 4

                        tr = tex_rgba[t_idx]
                        tg = tex_rgba[t_idx+1]
                        tb = tex_rgba[t_idx+2]

                        pix_idx = buf_idx * 4
                        fb[pix_idx]   = min(255, int(tr * light))
                        fb[pix_idx+1] = min(255, int(tg * light))
                        fb[pix_idx+2] = min(255, int(tb * light))
                        fb[pix_idx+3] = 255

    return fb


def main():
    print("=" * 72)
    print("SAKSHAM NEURO-CARE — STAGE 7.5.1.5: PROTOTYPE 3D EVIDENCE RENDERING")
    print("=" * 72)

    glb_path = "frontend/public/assets/asha-prototype/asha_prototype_v1.glb"
    out_dir = "frontend/public/assets/asha-prototype/renders"
    os.makedirs(out_dir, exist_ok=True)

    print(f"Loading GLB: {glb_path}...")
    model = load_glb(glb_path)
    print(f"Loaded {len(model['positions']):,} vertices, {len(model['indices'])//3:,} triangles")

    # Render Specifications
    renders = [
        {
            "name": "front_neutral.png",
            "desc": "Front neutral face close-up (aligned eyes, button nose, Cupid's bow lips)",
            "width": 640, "height": 640,
            "cam_pos": (0.0, 1.45, 0.48),
            "cam_target": (0.0, 1.44, 0.06),
            "fov": 32.0,
            "morphs": {}
        },
        {
            "name": "front_smiling.png",
            "desc": "Front smiling face close-up (smile morph target, elevated cheeks, visible teeth)",
            "width": 640, "height": 640,
            "cam_pos": (0.0, 1.45, 0.48),
            "cam_target": (0.0, 1.44, 0.06),
            "fov": 32.0,
            "morphs": {"smile": 1.0}
        },
        {
            "name": "three_quarter.png",
            "desc": "Three-quarter face close-up (32° yaw showing button nose bridge and cheek curve)",
            "width": 640, "height": 640,
            "cam_pos": (0.24, 1.45, 0.42),
            "cam_target": (0.0, 1.44, 0.06),
            "fov": 32.0,
            "morphs": {}
        },
        {
            "name": "side_profile.png",
            "desc": "Side profile face close-up (82° yaw showing nasal bridge, lips, chin, bun & hood)",
            "width": 640, "height": 640,
            "cam_pos": (0.48, 1.44, 0.07),
            "cam_target": (0.0, 1.44, 0.05),
            "fov": 32.0,
            "morphs": {}
        },
        {
            "name": "full_body_front.png",
            "desc": "Full-body front view (head-to-toe with cropped hoodie, cargo pants and sneakers)",
            "width": 512, "height": 800,
            "cam_pos": (0.0, 0.85, 2.35),
            "cam_target": (0.0, 0.82, 0.0),
            "fov": 42.0,
            "morphs": {}
        },
        {
            "name": "full_body_side.png",
            "desc": "Full-body side profile view (side silhouette, hood cowl, thigh cargo pocket, sneakers)",
            "width": 512, "height": 800,
            "cam_pos": (2.35, 0.85, 0.0),
            "cam_target": (0.0, 0.82, 0.0),
            "fov": 42.0,
            "morphs": {}
        }
    ]

    print("\nRendering 6 Evidence Views from Prototype GLB:")
    for r in renders:
        t0 = time.time()
        fb = render_view(
            model, r["width"], r["height"],
            r["cam_pos"], r["cam_target"],
            fov_deg=r["fov"], morph_weights=r["morphs"]
        )
        out_file = os.path.join(out_dir, r["name"])
        write_png(r["width"], r["height"], fb, out_file)
        dt = time.time() - t0
        sz = os.path.getsize(out_file)
        print(f"  ✓ {r['name']}: {r['desc']} ({r['width']}x{r['height']}, {sz:,} bytes, {dt:.2f}s)")

    print(f"\nAll 6 prototype evidence views successfully saved to: {out_dir}")


if __name__ == "__main__":
    main()
