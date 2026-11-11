# Saksham Neuro-Care — Milestone 7.5.1.2
# Blender Character Setup & Armature Inspection Script
# Run in Blender via: blender --python asha_blender_setup.py

import bpy
import os

print("--- Initializing Remodeled Asha 3D Character Rig in Blender ---")

bpy.ops.wm.read_factory_settings(use_empty=True)

current_dir = os.path.dirname(os.path.abspath(__file__))
glb_path = os.path.join(current_dir, "asha.glb")

if os.path.exists(glb_path):
    print(f"Importing Remodeled Asha runtime model: {glb_path}")
    bpy.ops.import_scene.gltf(filepath=glb_path)
    
    armature = None
    mesh_obj = None
    for obj in bpy.context.scene.objects:
        if obj.type == 'ARMATURE':
            armature = obj
        elif obj.type == 'MESH':
            mesh_obj = obj

    if armature:
        print(f"Humanoid Armature found: {armature.name} ({len(armature.data.bones)} bones)")
        armature.show_in_front = True
        
    if mesh_obj:
        print(f"Asha Mesh found: {mesh_obj.name}")
        poly_count = len(mesh_obj.data.polygons)
        vert_count = len(mesh_obj.data.vertices)
        print(f"Geometry: {poly_count} polygons, {vert_count} vertices")
        
        if mesh_obj.data.shape_keys:
            key_blocks = mesh_obj.data.shape_keys.key_blocks
            print(f"Shape Keys / Morph Targets: {len(key_blocks)} targets")
            for kb in key_blocks:
                print(f"  - {kb.name}")

    light_data = bpy.data.lights.new(name="KeyLight", type='SUN')
    light_data.energy = 3.5
    light_obj = bpy.data.objects.new(name="KeyLight", object_data=light_data)
    bpy.context.collection.objects.link(light_obj)
    light_obj.location = (2.0, -3.0, 3.5)
    light_obj.rotation_euler = (0.7, 0.2, 0.5)

    fill_data = bpy.data.lights.new(name="FillLight", type='POINT')
    fill_data.energy = 50.0
    fill_obj = bpy.data.objects.new(name="FillLight", object_data=fill_data)
    bpy.context.collection.objects.link(fill_obj)
    fill_obj.location = (-2.0, -2.0, 2.0)

    blend_path = os.path.join(current_dir, "asha_character.blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    print(f"Successfully saved editable Blender project: {blend_path}")
else:
    print(f"Error: glb file not found at {glb_path}")
