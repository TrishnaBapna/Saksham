#!/usr/bin/env python3
"""
scripts/blender_setup_asha.py
SAKSHAM NEURO-CARE — STAGE B.2.2: RENDERABLE REFERENCE PLANE REMEDIATION & VISUAL VERIFICATION

This script sets up a mathematically calibrated reference workspace for Asha 3D in Blender:
1. Configures metric scene units (scale 1.0, length unit METERS).
2. Sets up calibrated Orthographic Reference Image Planes and Empties:
   - Front Plane: docs/reference-package/frames/v4_t00.00_full_front.png (Sole at Z=0.0m, Bun at Z=1.67m)
   - Side Profile Plane: docs/reference-package/frames/v4_t02.50_full_side_L.png (Sole at Z=0.0m, Bun at Z=1.67m)
   - Back Plane: docs/reference-package/frames/v4_t04.50_full_back.png (Sole at Z=0.0m, Bun at Z=1.67m)
   - Face Front Plane: docs/reference-package/frames/v5_t00.00_face_front.png (Head centered at Z=1.45m)
   - Face Profile Plane: docs/reference-package/frames/v5_t04.00_head_side_back.png (Head centered at Z=1.45m)
   - Remediated: Mesh plane vertices are directly constructed in their proper vertical planes
     (X-Z for front/back; Y-Z for side) with zero erroneous cross-axis rotation, ensuring
     reference textures are fully visible in Cycles renders and match Viewport Empties 1:1.
3. Configures 5 Orthographic Inspection Cameras:
   - Cam_Ortho_Front (Numpad 1 view)
   - Cam_Ortho_Side (Numpad 3 view)
   - Cam_Ortho_Back (Ctrl+Numpad 1 view)
   - Cam_Ortho_Face_Front (Numpad 1 close-up)
   - Cam_Ortho_Face_Side (Numpad 3 close-up)
4. Configures 3 Perspective Inspection Cameras:
   - Cam_Persp_Front
   - Cam_Persp_ThreeQuarter (hero turnaround view)
   - Cam_Persp_Full_Body
5. Configures 4 controllable Studio AREA Lights with TRACK_TO constraint (Key, Fill, Rim, Ground Bounce).
6. Creates 3D Cross Datum Guides with 8mm bevel depth and OpenImageDenoise:
   - Green ground datum at Z=0.000m (sneaker sole contact)
   - Cyan crown datum at Z=1.600m (skull crown level)
   - Magenta bun datum at Z=1.670m (bun apex peak)
7. Saves the calibrated scene to calibration/asha_calibration_scene.blend without modifying any existing project asset.
8. STAGE BOUNDARY: Strictly reference planes, cameras and lighting; zero sculpting or mesh modification.
"""

import os
import sys
import math

try:
    import bpy
    import bmesh
    IN_BLENDER = True
except ImportError:
    IN_BLENDER = False


def setup_blender_workspace(render_previews=False):
    if not IN_BLENDER:
        print("[INFO] Not running inside Blender. Execute via:")
        print("       blender --background --python scripts/blender_setup_asha.py")
        return

    print("=" * 72)
    print("SAKSHAM NEURO-CARE — ASHA 3D REFERENCE CALIBRATION (STAGE B.2.2)")
    print("=" * 72)

    # 1. Scene Unit Setup
    scene = bpy.context.scene
    scene.unit_settings.system = 'METRIC'
    scene.unit_settings.length_unit = 'METERS'
    scene.unit_settings.scale_length = 1.0

    # 2. Clear default startup objects if present
    for name in ["Cube", "Light", "Camera"]:
        if name in bpy.data.objects:
            bpy.data.objects.remove(bpy.data.objects[name], do_unlink=True)

    # Resolve paths
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ref_dir = os.path.join(repo_root, "docs", "reference-package")
    frames_dir = os.path.join(ref_dir, "frames")
    calib_dir = os.path.join(repo_root, "calibration")
    previews_dir = os.path.join(calib_dir, "previews")
    os.makedirs(previews_dir, exist_ok=True)

    img_paths = {
        "front": os.path.join(frames_dir, "v4_t00.00_full_front.png"),
        "side": os.path.join(frames_dir, "v4_t02.50_full_side_L.png"),
        "back": os.path.join(frames_dir, "v4_t04.50_full_back.png"),
        "face_front": os.path.join(frames_dir, "v5_t00.00_face_front.png"),
        "face_side": os.path.join(frames_dir, "v5_t04.00_head_side_back.png"),
    }

    # Verify reference files exist
    for k, p in img_paths.items():
        if not os.path.exists(p):
            raise FileNotFoundError(f"Missing required reference image: {p}")

    # Create dedicated Collections
    col_ref_empties = bpy.data.collections.new("Reference_Empties")
    col_ref_planes = bpy.data.collections.new("Reference_Planes")
    col_cameras = bpy.data.collections.new("Cameras")
    col_lighting = bpy.data.collections.new("Studio_Lighting")
    col_datum = bpy.data.collections.new("Datum_Guides")

    scene.collection.children.link(col_ref_empties)
    scene.collection.children.link(col_ref_planes)
    scene.collection.children.link(col_cameras)
    scene.collection.children.link(col_lighting)
    scene.collection.children.link(col_datum)

    # -------------------------------------------------------------------------
    # 2. Calibrate Reference Planes & Empties
    # Mathematical calibration ensures soles contact Z=0.0m and bun contacts Z=1.67m
    # -------------------------------------------------------------------------
    TARGET_BUN_Z = 1.67 # Reference provisional bun peak (meters)

    # Full body plane calibration specifications
    plane_specs = {
        "front": {
            "path": img_paths["front"],
            "name": "REF_Full_Front",
            "w_px": 1280, "h_px": 720,
            "sole_y": 15.0, "bun_y": 675.0,
            "orientation": "XZ_FRONT",
            "x_offset": 0.0,
            "y_offset": 0.35, # behind character when looking from front (Y=-3)
            "empty_rot": (math.pi / 2, 0.0, 0.0),
        },
        "side": {
            "path": img_paths["side"],
            "name": "REF_Full_Side",
            "w_px": 1280, "h_px": 720,
            "sole_y": 10.0, "bun_y": 683.0,
            "orientation": "YZ_SIDE",
            "x_offset": -0.35, # behind character when looking from side (X=+3)
            "y_offset": 0.0,
            "empty_rot": (math.pi / 2, 0.0, math.pi / 2),
        },
        "back": {
            "path": img_paths["back"],
            "name": "REF_Full_Back",
            "w_px": 1280, "h_px": 720,
            "sole_y": 17.0, "bun_y": 690.0,
            "orientation": "XZ_BACK",
            "x_offset": 0.0,
            "y_offset": -0.35, # behind character when looking from rear (Y=+3)
            "empty_rot": (math.pi / 2, 0.0, math.pi),
        },
    }

    for key, spec in plane_specs.items():
        delta_y = spec["bun_y"] - spec["sole_y"]
        H = TARGET_BUN_Z * (spec["h_px"] / delta_y)
        W = H * (spec["w_px"] / spec["h_px"])
        Z_center = H * (0.5 - (spec["sole_y"] / spec["h_px"]))

        # Verify exact contact points
        z_sole_calc = Z_center - (H / 2.0) + H * (spec["sole_y"] / spec["h_px"])
        z_bun_calc = Z_center - (H / 2.0) + H * (spec["bun_y"] / spec["h_px"])
        print(f"[{spec['name']}] W={W:.4f}m, H={H:.4f}m, CenterZ={Z_center:.4f}m -> Sole={z_sole_calc:.4f}m, Bun={z_bun_calc:.4f}m")

        img = bpy.data.images.load(spec["path"])

        # A. Create Viewport Image Empty (for native Sculpt Mode)
        empty = bpy.data.objects.new(spec["name"] + "_Empty", None)
        empty.empty_display_type = 'IMAGE'
        empty.data = img
        empty.empty_display_size = W
        empty.color[3] = 0.50
        empty.show_empty_image_orthographic = True
        empty.show_empty_image_perspective = True
        empty.location = (spec["x_offset"], spec["y_offset"], Z_center)
        empty.rotation_euler = spec["empty_rot"]
        col_ref_empties.objects.link(empty)

        # B. Create Textured Mesh Plane (directly constructed in vertical plane)
        mesh = bpy.data.meshes.new(spec["name"] + "_Mesh")
        plane_obj = bpy.data.objects.new(spec["name"] + "_Plane", mesh)
        bm = bmesh.new()

        if spec["orientation"] == "XZ_FRONT":
            # Facing -Y towards front camera at Y=-3.0
            v0 = bm.verts.new((-W / 2, 0.0, -H / 2)) # bottom-left
            v1 = bm.verts.new(( W / 2, 0.0, -H / 2)) # bottom-right
            v2 = bm.verts.new(( W / 2, 0.0,  H / 2)) # top-right
            v3 = bm.verts.new((-W / 2, 0.0,  H / 2)) # top-left
        elif spec["orientation"] == "XZ_BACK":
            # Facing +Y towards rear camera at Y=+3.0
            v0 = bm.verts.new(( W / 2, 0.0, -H / 2)) # bottom-left in camera view
            v1 = bm.verts.new((-W / 2, 0.0, -H / 2)) # bottom-right
            v2 = bm.verts.new((-W / 2, 0.0,  H / 2)) # top-right
            v3 = bm.verts.new(( W / 2, 0.0,  H / 2)) # top-left
        elif spec["orientation"] == "YZ_SIDE":
            # Facing +X towards side camera at X=+3.0
            # Camera looks along -X; local right in camera view is world -Y, left is world +Y
            v0 = bm.verts.new((0.0,  W / 2, -H / 2)) # bottom-left in camera view
            v1 = bm.verts.new((0.0, -W / 2, -H / 2)) # bottom-right
            v2 = bm.verts.new((0.0, -W / 2,  H / 2)) # top-right
            v3 = bm.verts.new((0.0,  W / 2,  H / 2)) # top-left

        face = bm.faces.new([v0, v1, v2, v3])
        uv_layer = bm.loops.layers.uv.new()
        face.loops[0][uv_layer].uv = (0.0, 0.0)
        face.loops[1][uv_layer].uv = (1.0, 0.0)
        face.loops[2][uv_layer].uv = (1.0, 1.0)
        face.loops[3][uv_layer].uv = (0.0, 1.0)
        bm.to_mesh(mesh)
        bm.free()

        # Direct placement with ZERO extra rotation needed
        plane_obj.location = (spec["x_offset"], spec["y_offset"], Z_center)
        plane_obj.rotation_euler = (0.0, 0.0, 0.0)

        # Unshaded Emission Shader for Cycles
        mat = bpy.data.materials.new(name=f"Mat_{spec['name']}")
        mat.use_nodes = True
        nodes = mat.node_tree.nodes
        nodes.clear()
        tex_node = nodes.new('ShaderNodeTexImage')
        tex_node.image = img
        emit_node = nodes.new('ShaderNodeEmission')
        out_node = nodes.new('ShaderNodeOutputMaterial')
        mat.node_tree.links.new(tex_node.outputs['Color'], emit_node.inputs['Color'])
        mat.node_tree.links.new(emit_node.outputs['Emission'], out_node.inputs['Surface'])
        plane_obj.data.materials.append(mat)
        col_ref_planes.objects.link(plane_obj)

    # Face close-up reference planes and empties (anchored at head Z=1.45m)
    face_h = 0.65
    face_w = face_h * (1280.0 / 720.0) # 1.1555m

    # Face Front
    img_face_f = bpy.data.images.load(img_paths["face_front"])
    empty_face_f = bpy.data.objects.new("REF_Face_Front_Empty", None)
    empty_face_f.empty_display_type = 'IMAGE'
    empty_face_f.data = img_face_f
    empty_face_f.empty_display_size = face_w
    empty_face_f.color[3] = 0.50
    empty_face_f.location = (0.0, 0.20, 1.45)
    empty_face_f.rotation_euler = (math.pi / 2, 0.0, 0.0)
    col_ref_empties.objects.link(empty_face_f)

    mesh_face_f = bpy.data.meshes.new("REF_Face_Front_Mesh")
    plane_face_f = bpy.data.objects.new("REF_Face_Front_Plane", mesh_face_f)
    bm_ff = bmesh.new()
    ff_v0 = bm_ff.verts.new((-face_w / 2, 0.0, -face_h / 2))
    ff_v1 = bm_ff.verts.new(( face_w / 2, 0.0, -face_h / 2))
    ff_v2 = bm_ff.verts.new(( face_w / 2, 0.0,  face_h / 2))
    ff_v3 = bm_ff.verts.new((-face_w / 2, 0.0,  face_h / 2))
    face_ff = bm_ff.faces.new([ff_v0, ff_v1, ff_v2, ff_v3])
    uv_ff = bm_ff.loops.layers.uv.new()
    face_ff.loops[0][uv_ff].uv = (0.0, 0.0)
    face_ff.loops[1][uv_ff].uv = (1.0, 0.0)
    face_ff.loops[2][uv_ff].uv = (1.0, 1.0)
    face_ff.loops[3][uv_ff].uv = (0.0, 1.0)
    bm_ff.to_mesh(mesh_face_f)
    bm_ff.free()
    plane_face_f.location = (0.0, 0.20, 1.45)
    plane_face_f.rotation_euler = (0.0, 0.0, 0.0)

    mat_ff = bpy.data.materials.new("Mat_Face_Front")
    mat_ff.use_nodes = True
    mat_ff.node_tree.nodes.clear()
    t_ff = mat_ff.node_tree.nodes.new('ShaderNodeTexImage')
    t_ff.image = img_face_f
    e_ff = mat_ff.node_tree.nodes.new('ShaderNodeEmission')
    o_ff = mat_ff.node_tree.nodes.new('ShaderNodeOutputMaterial')
    mat_ff.node_tree.links.new(t_ff.outputs['Color'], e_ff.inputs['Color'])
    mat_ff.node_tree.links.new(e_ff.outputs['Emission'], o_ff.inputs['Surface'])
    plane_face_f.data.materials.append(mat_ff)
    col_ref_planes.objects.link(plane_face_f)

    # Face Side
    img_face_s = bpy.data.images.load(img_paths["face_side"])
    empty_face_s = bpy.data.objects.new("REF_Face_Side_Empty", None)
    empty_face_s.empty_display_type = 'IMAGE'
    empty_face_s.data = img_face_s
    empty_face_s.empty_display_size = face_w
    empty_face_s.color[3] = 0.50
    empty_face_s.location = (-0.20, 0.0, 1.45)
    empty_face_s.rotation_euler = (math.pi / 2, 0.0, math.pi / 2)
    col_ref_empties.objects.link(empty_face_s)

    mesh_face_s = bpy.data.meshes.new("REF_Face_Side_Mesh")
    plane_face_s = bpy.data.objects.new("REF_Face_Side_Plane", mesh_face_s)
    bm_fs = bmesh.new()
    fs_v0 = bm_fs.verts.new((0.0,  face_w / 2, -face_h / 2))
    fs_v1 = bm_fs.verts.new((0.0, -face_w / 2, -face_h / 2))
    fs_v2 = bm_fs.verts.new((0.0, -face_w / 2,  face_h / 2))
    fs_v3 = bm_fs.verts.new((0.0,  face_w / 2,  face_h / 2))
    face_fs = bm_fs.faces.new([fs_v0, fs_v1, fs_v2, fs_v3])
    uv_fs = bm_fs.loops.layers.uv.new()
    face_fs.loops[0][uv_fs].uv = (0.0, 0.0)
    face_fs.loops[1][uv_fs].uv = (1.0, 0.0)
    face_fs.loops[2][uv_fs].uv = (1.0, 1.0)
    face_fs.loops[3][uv_fs].uv = (0.0, 1.0)
    bm_fs.to_mesh(mesh_face_s)
    bm_fs.free()
    plane_face_s.location = (-0.20, 0.0, 1.45)
    plane_face_s.rotation_euler = (0.0, 0.0, 0.0)

    mat_fs = bpy.data.materials.new("Mat_Face_Side")
    mat_fs.use_nodes = True
    mat_fs.node_tree.nodes.clear()
    t_fs = mat_fs.node_tree.nodes.new('ShaderNodeTexImage')
    t_fs.image = img_face_s
    e_fs = mat_fs.node_tree.nodes.new('ShaderNodeEmission')
    o_fs = mat_fs.node_tree.nodes.new('ShaderNodeOutputMaterial')
    mat_fs.node_tree.links.new(t_fs.outputs['Color'], e_fs.inputs['Color'])
    mat_fs.node_tree.links.new(e_fs.outputs['Emission'], o_fs.inputs['Surface'])
    plane_face_s.data.materials.append(mat_fs)
    col_ref_planes.objects.link(plane_face_s)

    # -------------------------------------------------------------------------
    # 3. 3D Cross Datum Guides (8mm Bevel, visible from Front, Side & Rear)
    # -------------------------------------------------------------------------
    def add_cross_datum(name, z_val, color_rgba, span=2.4, bevel_r=0.008):
        curve_data = bpy.data.curves.new(name, type='CURVE')
        curve_data.dimensions = '3D'
        curve_data.bevel_depth = bevel_r # 8mm radius (16mm visible rod)

        # Spline X (visible in Front & Rear camera views)
        sx = curve_data.splines.new('POLY')
        sx.points.add(1)
        sx.points[0].co = (-span / 2, 0.0, z_val, 1.0)
        sx.points[1].co = ( span / 2, 0.0, z_val, 1.0)

        # Spline Y (visible in Side camera view)
        sy = curve_data.splines.new('POLY')
        sy.points.add(1)
        sy.points[0].co = (0.0, -span / 2, z_val, 1.0)
        sy.points[1].co = (0.0,  span / 2, z_val, 1.0)

        curve_obj = bpy.data.objects.new(name + "_Obj", curve_data)

        mat_d = bpy.data.materials.new(f"Mat_{name}")
        mat_d.use_nodes = True
        mat_d.node_tree.nodes.clear()
        emit = mat_d.node_tree.nodes.new('ShaderNodeEmission')
        emit.inputs['Color'].default_value = color_rgba
        emit.inputs['Strength'].default_value = 2.0
        out = mat_d.node_tree.nodes.new('ShaderNodeOutputMaterial')
        mat_d.node_tree.links.new(emit.outputs['Emission'], out.inputs['Surface'])
        curve_obj.data.materials.append(mat_d)
        col_datum.objects.link(curve_obj)
        return curve_obj

    # Preserved exact datum levels
    add_cross_datum("Datum_Ground_Z0", 0.000, (0.0, 1.0, 0.2, 1.0), span=2.6, bevel_r=0.008)  # Bright Green ground baseline
    add_cross_datum("Datum_Crown_Z160", 1.600, (0.2, 0.8, 1.0, 1.0), span=2.0, bevel_r=0.008) # Cyan skull crown baseline
    add_cross_datum("Datum_Bun_Z167", 1.670, (1.0, 0.1, 0.7, 1.0), span=2.0, bevel_r=0.008)   # Magenta bun apex baseline

    # -------------------------------------------------------------------------
    # 4. Configured Inspection Cameras
    # -------------------------------------------------------------------------
    cameras = {}

    def add_cam(name, cam_type, loc, rot_euler, ortho_scale=1.90, focal_mm=50.0):
        cam_data = bpy.data.cameras.new(name)
        cam_data.type = cam_type
        if cam_type == 'ORTHO':
            cam_data.sensor_fit = 'VERTICAL'
            cam_data.ortho_scale = ortho_scale
        else:
            cam_data.lens = focal_mm
        cam_obj = bpy.data.objects.new(name, cam_data)
        cam_obj.location = loc
        cam_obj.rotation_euler = rot_euler
        col_cameras.objects.link(cam_obj)
        cameras[name] = cam_obj
        return cam_obj

    # Orthographic cameras (1:1 aligned with reference planes)
    add_cam("Cam_Ortho_Front", 'ORTHO', (0.0, -3.0, 0.85), (math.pi / 2, 0.0, 0.0), ortho_scale=1.90)
    add_cam("Cam_Ortho_Side", 'ORTHO', (3.0, 0.0, 0.85), (math.pi / 2, 0.0, math.pi / 2), ortho_scale=1.90)
    add_cam("Cam_Ortho_Back", 'ORTHO', (0.0, 3.0, 0.85), (math.pi / 2, 0.0, math.pi), ortho_scale=1.90)
    add_cam("Cam_Ortho_Face_Front", 'ORTHO', (0.0, -1.5, 1.45), (math.pi / 2, 0.0, 0.0), ortho_scale=0.45)
    add_cam("Cam_Ortho_Face_Side", 'ORTHO', (1.5, 0.0, 1.45), (math.pi / 2, 0.0, math.pi / 2), ortho_scale=0.45)

    # Perspective inspection cameras
    add_cam("Cam_Persp_Front", 'PERSP', (0.0, -2.5, 1.05), (math.pi / 2, 0.0, 0.0), focal_mm=50.0)
    add_cam("Cam_Persp_ThreeQuarter", 'PERSP', (1.8, -2.0, 1.35), (1.42, 0.0, 0.72), focal_mm=50.0)
    add_cam("Cam_Persp_Full_Body", 'PERSP', (0.0, -3.5, 0.95), (math.pi / 2, 0.0, 0.0), focal_mm=40.0)

    # Set default camera
    scene.camera = cameras["Cam_Ortho_Front"]

    # -------------------------------------------------------------------------
    # 5. Controllable Studio AREA Lighting (with TRACK_TO constraints)
    # -------------------------------------------------------------------------
    target_empty = bpy.data.objects.new("Studio_Light_Target", None)
    target_empty.location = (0.0, 0.0, 1.10)
    col_lighting.objects.link(target_empty)

    def add_studio_area_light(name, loc, energy, size, color):
        light_data = bpy.data.lights.new(name=name, type='AREA')
        light_data.energy = energy
        light_data.size = size
        light_data.color = color
        light_obj = bpy.data.objects.new(name, light_data)
        light_obj.location = loc
        con = light_obj.constraints.new(type='TRACK_TO')
        con.target = target_empty
        con.track_axis = 'TRACK_NEGATIVE_Z'
        con.up_axis = 'UP_Y'
        col_lighting.objects.link(light_obj)
        return light_obj

    add_studio_area_light("Light_Key", (1.6, -1.8, 2.2), energy=150.0, size=1.0, color=(1.0, 0.96, 0.92))
    add_studio_area_light("Light_Fill", (-1.8, -1.5, 1.8), energy=75.0, size=1.5, color=(0.92, 0.95, 1.0))
    add_studio_area_light("Light_Rim", (0.0, 1.8, 2.4), energy=120.0, size=0.8, color=(0.98, 0.95, 1.0))
    add_studio_area_light("Light_Ground_Bounce", (-0.5, -1.2, 0.2), energy=30.0, size=1.2, color=(0.90, 0.90, 0.96))

    # -------------------------------------------------------------------------
    # 6. Save Calibrated Scene to Isolated File
    # -------------------------------------------------------------------------
    calib_blend_path = os.path.join(calib_dir, "asha_calibration_scene.blend")
    bpy.ops.wm.save_as_mainfile(filepath=calib_blend_path)
    print(f"\n[SUCCESS] Calibrated scene saved to: {calib_blend_path}")

    # -------------------------------------------------------------------------
    # 7. Render Previews (Cycles CPU + OpenImageDenoise in Sandbox)
    # -------------------------------------------------------------------------
    if render_previews:
        scene.render.engine = 'CYCLES'
        scene.cycles.device = 'CPU'
        scene.cycles.samples = 16
        scene.cycles.use_denoising = True
        scene.render.resolution_x = 960
        scene.render.resolution_y = 540
        scene.render.resolution_percentage = 100

        preview_cams = [
            ("Cam_Ortho_Front", "calibration_preview_front_ortho.png"),
            ("Cam_Ortho_Side", "calibration_preview_side_ortho.png"),
            ("Cam_Ortho_Back", "calibration_preview_back_ortho.png"),
            ("Cam_Ortho_Face_Front", "calibration_preview_face_front_ortho.png"),
            ("Cam_Persp_ThreeQuarter", "calibration_preview_three_quarter_persp.png"),
        ]

        # For rendering specific previews, temporarily isolate appropriate plane to prevent occlusion
        for cam_name, filename in preview_cams:
            scene.camera = cameras[cam_name]

            # In Ortho Front: hide back and face planes so front is pure
            # In Ortho Side: hide front, back and face so side is pure
            # In Ortho Back: hide front and side so back is pure
            # In Face Front: hide full front so face close-up is pure
            # In 3/4 perspective: show all planes to demonstrate spatial orientation!
            for p_name in ["REF_Full_Front_Plane", "REF_Full_Side_Plane", "REF_Full_Back_Plane", "REF_Face_Front_Plane", "REF_Face_Side_Plane"]:
                p_obj = bpy.data.objects.get(p_name)
                if p_obj:
                    if cam_name == "Cam_Ortho_Front":
                        p_obj.hide_render = (p_name != "REF_Full_Front_Plane")
                    elif cam_name == "Cam_Ortho_Side":
                        p_obj.hide_render = (p_name != "REF_Full_Side_Plane")
                    elif cam_name == "Cam_Ortho_Back":
                        p_obj.hide_render = (p_name != "REF_Full_Back_Plane")
                    elif cam_name == "Cam_Ortho_Face_Front":
                        p_obj.hide_render = (p_name != "REF_Face_Front_Plane")
                    elif cam_name == "Cam_Persp_ThreeQuarter":
                        p_obj.hide_render = False

            out_file = os.path.join(previews_dir, filename)
            scene.render.filepath = out_file
            print(f" -> Rendering preview from {cam_name} to {out_file}...")
            bpy.ops.render.render(write_still=True)
            print(f"    Done: {out_file}")

        # Reset all hide_render to False for saved scene
        for p_name in ["REF_Full_Front_Plane", "REF_Full_Side_Plane", "REF_Full_Back_Plane", "REF_Face_Front_Plane", "REF_Face_Side_Plane"]:
            p_obj = bpy.data.objects.get(p_name)
            if p_obj:
                p_obj.hide_render = False

        bpy.ops.wm.save_as_mainfile(filepath=calib_blend_path)

    print("=" * 72)
    print("STAGE B.2.2 REFERENCE CALIBRATION REMEDIATION COMPLETE — READY FOR REVIEW")
    print("=" * 72)


if __name__ == "__main__":
    do_previews = "--render-previews" in sys.argv
    setup_blender_workspace(render_previews=do_previews)
