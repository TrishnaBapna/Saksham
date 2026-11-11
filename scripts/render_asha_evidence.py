#!/usr/bin/env python3
"""
scripts/render_asha_evidence.py
SAKSHAM NEURO-CARE — STAGE 7.5.1.3: 3D ASSET VISUAL EVIDENCE RENDERER

Renders exact 3D images directly from frontend/public/assets/asha-3d/asha.glb:
1. front_face_neutral.png
2. front_face_smile.png
3. front_face_listening.png
4. front_face_thinking.png
5. three_quarter_face.png
6. side_face.png
7. full_body_front.png
8. full_body_side.png
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
    
    # Parse PNG
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
    # Pure Python PNG decoder
    assert png_bytes[:8] == b'\x89PNG\r\n\x1a\n', "Invalid PNG signature"
    offset = 8
    idat_chunks = []
    w, h = 0, 0
    while offset < len(png_bytes):
        c_len = struct.unpack('>I', png_bytes[offset:offset+4])[0]
        c_type = png_bytes[offset+4:offset+8]
        c_data = png_bytes[offset+8:offset+8+c_len]
        offset += 8 + c_len + 4 # length + type + data + crc
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

        if filter_type == 0: # None
            pass
        elif filter_type == 1: # Sub
            for i in range(4, stride):
                curr_row[i] = (curr_row[i] + curr_row[i - 4]) & 0xFF
        elif filter_type == 2: # Up
            for i in range(stride):
                curr_row[i] = (curr_row[i] + prev_row[i]) & 0xFF
        elif filter_type == 3: # Average
            for i in range(stride):
                left = curr_row[i - 4] if i >= 4 else 0
                up = prev_row[i]
                curr_row[i] = (curr_row[i] + ((left + up) >> 1)) & 0xFF
        elif filter_type == 4: # Paeth
            for i in range(stride):
                a = curr_row[i - 4] if i >= 4 else 0
                b = prev_row[i]
                c = prev_row[i - 4] if i >= 4 else 0
                p = a + b - c
                pa = abs(p - a)
                pb = abs(p - b)
                pc = abs(p - c)
                if pa <= pb and pa <= pc:
                    pr = a
                elif pb <= pc:
                    pr = b
                else:
                    pr = c
                curr_row[i] = (curr_row[i] + pr) & 0xFF

        out_start = y * stride
        rgba[out_start : out_start + stride] = curr_row
        prev_row = curr_row

    return w, h, rgba


def render_scene(model, width, height, cam_pos, cam_target, fov_deg=45.0, morph_weights=None):
    if morph_weights is None:
        morph_weights = {}

    # Deform vertices by morph weights
    base_pos = model["positions"]
    base_norm = model["normals"]
    num_v = len(base_pos)
    
    pos = [list(p) for p in base_pos]
    for m_name, weight in morph_weights.items():
        if weight != 0.0 and m_name in model["morph_deltas"]:
            deltas = model["morph_deltas"][m_name]
            for i in range(num_v):
                d = deltas[i]
                pos[i][0] += d[0] * weight
                pos[i][1] += d[1] * weight
                pos[i][2] += d[2] * weight

    # Compute Camera LookAt Matrix
    # Forward vector (from target to camera = Z axis in view space)
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

    # Perspective parameters
    fov_rad = fov_deg * math.pi / 180.0
    focal = 1.0 / math.tan(fov_rad / 2.0)
    aspect = width / height

    # Key / Fill Lights in world space
    l_key = (0.5, 0.8, 0.8)
    lk_len = math.hypot(l_key[0], math.hypot(l_key[1], l_key[2]))
    l_key = (l_key[0] / lk_len, l_key[1] / lk_len, l_key[2] / lk_len)

    l_fill = (-0.6, 0.3, 0.6)
    lf_len = math.hypot(l_fill[0], math.hypot(l_fill[1], l_fill[2]))
    l_fill = (l_fill[0] / lf_len, l_fill[1] / lf_len, l_fill[2] / lf_len)

    # Transform vertices to Screen Space
    # Screen coords: sx, sy, sz (depth 1/z for Z-buffering), u, v, nx, ny, nz
    scr = []
    for i in range(num_v):
        p = pos[i]
        # World to View Translation
        dx = p[0] - cam_pos[0]
        dy = p[1] - cam_pos[1]
        dz = p[2] - cam_pos[2]

        vx = rx * dx + ry * dy + rz * dz
        vy = ux * dx + uy * dy + uz * dz
        vz = -(fx * dx + fy * dy + fz * dz) # In front of camera -> vz > 0

        if vz > 0.05:
            # Perspective projection
            px = (vx / vz) * (focal / aspect)
            py = (vy / vz) * focal
            sx = (px + 1.0) * 0.5 * width
            sy = (1.0 - py) * 0.5 * height # Screen Y down
            sz = 1.0 / vz
            uv = model["uvs"][i]
            n = base_norm[i]
            scr.append((sx, sy, sz, uv[0], uv[1], n[0], n[1], n[2]))
        else:
            scr.append(None)

    # Framebuffer & Z-buffer
    zbuf = [0.0] * (width * height)
    # Background: clean soft studio gradient
    fb = bytearray(width * height * 4)
    for y in range(height):
        grad = y / height
        bg_r = int(242 * (1 - grad) + 225 * grad)
        bg_g = int(244 * (1 - grad) + 230 * grad)
        bg_b = int(250 * (1 - grad) + 245 * grad)
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

    # Rasterize triangles
    num_tri = len(indices) // 3
    for ti in range(num_tri):
        i0 = indices[ti * 3]
        i1 = indices[ti * 3 + 1]
        i2 = indices[ti * 3 + 2]

        v0 = scr[i0]
        v1 = scr[i1]
        v2 = scr[i2]
        if v0 is None or v1 is None or v2 is None:
            continue

        x0, y0, z0, u0, v0_u, nx0, ny0, nz0 = v0
        x1, y1, z1, u1, v1_u, nx1, ny1, nz1 = v1
        x2, y2, z2, u2, v2_u, nx2, ny2, nz2 = v2

        # 2D cross product for backface culling & area
        area = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0)
        if area <= 0.0001:
            continue # Backface or degenerate

        # Bounding Box
        min_x = max(0, int(min(x0, x1, x2)))
        max_x = min(width - 1, int(max(x0, x1, x2)))
        min_y = max(0, int(min(y0, y1, y2)))
        max_y = min(height - 1, int(max(y0, y1, y2)))

        if min_x > max_x or min_y > max_y:
            continue

        inv_area = 1.0 / area

        # Triangle rasterization loop
        for y in range(min_y, max_y + 1):
            row_idx = y * width
            fb_row_idx = row_idx * 4
            for x in range(min_x, max_x + 1):
                # Barycentric coordinates
                w0 = ((x1 - x) * (y2 - y) - (y1 - y) * (x2 - x)) * inv_area
                w1 = ((x2 - x) * (y0 - y) - (y2 - y) * (x0 - x)) * inv_area
                w2 = 1.0 - w0 - w1

                if w0 >= 0.0 and w1 >= 0.0 and w2 >= 0.0:
                    pz = w0 * z0 + w1 * z1 + w2 * z2
                    buf_idx = row_idx + x
                    if pz > zbuf[buf_idx]:
                        zbuf[buf_idx] = pz

                        # Perspective-correct UV interpolation
                        u_tex = (w0 * u0 + w1 * u1 + w2 * u2)
                        v_tex = (w0 * v0_u + w1 * v1_u + w2 * v2_u)

                        # Sample texture
                        tx = int(u_tex * (tex_w - 1)) & (tex_w - 1)
                        ty = int(v_tex * (tex_h - 1)) & (tex_h - 1)
                        t_idx = ty * tex_stride + tx * 4
                        tr = tex_rgba[t_idx]
                        tg = tex_rgba[t_idx + 1]
                        tb = tex_rgba[t_idx + 2]

                        # Normal interpolation & Lighting
                        nx = w0 * nx0 + w1 * nx1 + w2 * nx2
                        ny = w0 * ny0 + w1 * ny1 + w2 * ny2
                        nz = w0 * nz0 + w1 * nz1 + w2 * nz2
                        n_len = math.hypot(nx, math.hypot(ny, nz)) or 1.0
                        nx, ny, nz = nx / n_len, ny / n_len, nz / n_len

                        diff_key = max(0.0, nx * l_key[0] + ny * l_key[1] + nz * l_key[2]) * 0.55
                        diff_fill = max(0.0, nx * l_fill[0] + ny * l_fill[1] + nz * l_fill[2]) * 0.28
                        ambient = 0.46

                        shade = min(1.10, diff_key + diff_fill + ambient)

                        out_pix = fb_row_idx + x * 4
                        fb[out_pix] = min(255, int(tr * shade))
                        fb[out_pix + 1] = min(255, int(tg * shade))
                        fb[out_pix + 2] = min(255, int(tb * shade))

    # Encode to PNG
    raw_rows = bytearray()
    row_stride = width * 4
    for y in range(height):
        raw_rows.append(0)
        start = y * row_stride
        raw_rows.extend(fb[start : start + row_stride])

    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)

    return (
        b'\x89PNG\r\n\x1a\n' +
        chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)) +
        chunk(b'IDAT', zlib.compress(bytes(raw_rows), 6)) +
        chunk(b'IEND', b'')
    )


def main():
    glb_path = "frontend/public/assets/asha-3d/asha.glb"
    out_dir = "frontend/public/assets/asha-3d/renders"
    os.makedirs(out_dir, exist_ok=True)

    print(f"Loading GLB: {glb_path}...")
    t0 = time.time()
    model = load_glb(glb_path)
    print(f"Loaded {len(model['positions']):,} vertices and {len(model['indices'])//3:,} triangles in {time.time()-t0:.2f}s")

    views = [
        # 1. Front-Facing Neutral Face Close-up
        {
            "name": "front_face_neutral.png",
            "desc": "Front-facing neutral face close-up (aligned eye, nose, mouth proportions)",
            "width": 640, "height": 640,
            "cam_pos": (0.0, 1.45, 0.46), "cam_target": (0.0, 1.45, 0.0), "fov": 32.0,
            "morphs": {"mouthSmile": 0.05}
        },
        # 2. Front-Facing Smile
        {
            "name": "front_face_smile.png",
            "desc": "Front-facing radiant smile (Duchenne smile with cheek elevation and visible white teeth)",
            "width": 640, "height": 640,
            "cam_pos": (0.0, 1.45, 0.46), "cam_target": (0.0, 1.45, 0.0), "fov": 32.0,
            "morphs": {"mouthSmile": 0.85, "cheekSquintLeft": 0.60, "cheekSquintRight": 0.60, "viseme_ih": 0.30}
        },
        # 3. Front-Facing Listening Expression
        {
            "name": "front_face_listening.png",
            "desc": "Front-facing listening expression (attentive warm gaze, gentle smile, raised brows)",
            "width": 640, "height": 640,
            "cam_pos": (0.0, 1.45, 0.46), "cam_target": (0.0, 1.45, 0.0), "fov": 32.0,
            "morphs": {"mouthSmile": 0.30, "browInnerUp": 0.25, "cheekSquintLeft": 0.20, "cheekSquintRight": 0.20}
        },
        # 4. Front-Facing Thinking Expression
        {
            "name": "front_face_thinking.png",
            "desc": "Front-facing thinking expression (subtle brow furrow, reflective thoughtful posture)",
            "width": 640, "height": 640,
            "cam_pos": (0.0, 1.45, 0.46), "cam_target": (0.0, 1.45, 0.0), "fov": 32.0,
            "morphs": {"browInnerUp": 0.40, "browDownLeft": 0.30, "mouthSmile": 0.10}
        },
        # 5. Three-Quarter Face View
        {
            "name": "three_quarter_face.png",
            "desc": "Three-quarter face view (35 deg yaw, button nose protrusion, cheek curve)",
            "width": 640, "height": 640,
            "cam_pos": (0.26, 1.45, 0.38), "cam_target": (0.0, 1.45, 0.0), "fov": 32.0,
            "morphs": {"mouthSmile": 0.20}
        },
        # 6. Side Face View
        {
            "name": "side_face.png",
            "desc": "Side face view (90 deg profile showing feminine nasal bridge, lips, and chin curve)",
            "width": 640, "height": 640,
            "cam_pos": (0.46, 1.45, 0.0), "cam_target": (0.0, 1.45, 0.0), "fov": 32.0,
            "morphs": {"mouthSmile": 0.10}
        },
        # 7. Full-Body Front View
        {
            "name": "full_body_front.png",
            "desc": "Full-body front view (Asha head-to-toe with cropped hoodie, cargo pants and sneakers)",
            "width": 512, "height": 800,
            "cam_pos": (0.0, 0.88, 2.45), "cam_target": (0.0, 0.88, 0.0), "fov": 42.0,
            "morphs": {"mouthSmile": 0.25}
        },
        # 8. Full-Body Side View
        {
            "name": "full_body_side.png",
            "desc": "Full-body side view (side silhouette, cowl hood, baggy cargo silhouette, sneakers)",
            "width": 512, "height": 800,
            "cam_pos": (2.45, 0.88, 0.0), "cam_target": (0.0, 0.88, 0.0), "fov": 42.0,
            "morphs": {"mouthSmile": 0.15}
        }
    ]

    print("\nRendering 8 Photographic Evidence Views from GLB:")
    for v in views:
        t_start = time.time()
        png_data = render_scene(
            model,
            v["width"],
            v["height"],
            v["cam_pos"],
            v["cam_target"],
            v["fov"],
            v["morphs"]
        )
        out_file = os.path.join(out_dir, v["name"])
        with open(out_file, "wb") as f:
            f.write(png_data)
        elapsed = time.time() - t_start
        print(f"  ✓ {v['name']}: {v['desc']} ({v['width']}x{v['height']}, {len(png_data):,} bytes, {elapsed:.2f}s)")

    print(f"\nAll 8 evidence views successfully rendered to: {out_dir}")


if __name__ == "__main__":
    main()
