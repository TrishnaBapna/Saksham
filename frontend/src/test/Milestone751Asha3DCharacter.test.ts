/**
 * SAKSHAM NEURO-CARE — MILESTONE 7.5.1
 * Unit & Integration Test Suite for Asha 3D Character Model, Humanoid Rig & Expression Validation
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ALL_ASHA_EXPRESSIONS, ASHA_EXPRESSIONS_REGISTRY } from '../features/ai-companion/config/characterExpressions';

describe('Milestone 7.5.1: Asha 3D Character Model, Humanoid Rig & Expression Validation', () => {
  const publicDir = path.resolve(__dirname, '../../public/assets/asha-3d');
  const glbPath = path.join(publicDir, 'asha.glb');
  const atlasPath = path.join(publicDir, 'asha_texture_atlas.png');
  const metadataPath = path.join(publicDir, 'asha_model_metadata.json');
  const blenderScriptPath = path.join(publicDir, 'asha_blender_setup.py');
  const harnessPath = path.resolve(__dirname, '../../public/asha-validation-harness.html');

  it('Part A: verifies runtime 3D asset deliverables and file integrity', () => {
    expect(fs.existsSync(glbPath), 'asha.glb must exist').toBe(true);
    expect(fs.existsSync(atlasPath), 'asha_texture_atlas.png must exist').toBe(true);
    expect(fs.existsSync(metadataPath), 'asha_model_metadata.json must exist').toBe(true);
    expect(fs.existsSync(blenderScriptPath), 'asha_blender_setup.py must exist').toBe(true);
    expect(fs.existsSync(harnessPath), 'asha-validation-harness.html must exist').toBe(true);

    const stats = fs.statSync(glbPath);
    const sizeMb = stats.size / (1024 * 1024);
    // Performance budget: <= 4.5 MB
    expect(sizeMb).toBeLessThanOrEqual(4.5);
    expect(sizeMb).toBeGreaterThan(0.5); // Genuine mesh payload
  });

  it('Part B: parses binary glTF 2.0 (.glb) header and chunks', () => {
    const data = fs.readFileSync(glbPath);
    expect(data.length).toBeGreaterThan(1000);

    // GLB 12-byte header
    const magic = data.toString('ascii', 0, 4);
    const version = data.readUInt32LE(4);
    const length = data.readUInt32LE(8);

    expect(magic).toBe('glTF');
    expect(version).toBe(2);
    expect(length).toBe(data.length);

    // Chunk 0: JSON
    const c0Len = data.readUInt32LE(12);
    const c0Type = data.toString('ascii', 16, 20);
    expect(c0Type).toBe('JSON');

    const jsonStr = data.toString('utf8', 20, 20 + c0Len);
    const gltf = JSON.parse(jsonStr);

    expect(gltf.asset).toBeDefined();
    expect(gltf.asset.version).toBe('2.0');
    expect(gltf.scene).toBe(0);
    expect(gltf.nodes.length).toBeGreaterThanOrEqual(22);
    expect(gltf.meshes.length).toBe(1);
    expect(gltf.skins.length).toBe(1);

    // Chunk 1: BIN
    const c1Start = 20 + c0Len;
    const c1Len = data.readUInt32LE(c1Start);
    const c1Type = data.toString('ascii', c1Start + 4, c1Start + 8);
    expect(c1Type.startsWith('BIN')).toBe(true);
    expect(c1Start + 8 + c1Len).toBeLessThanOrEqual(data.length);
  });

  it('Part C: validates 21 standard humanoid bones hierarchy in armature', () => {
    const data = fs.readFileSync(glbPath);
    const c0Len = data.readUInt32LE(12);
    const gltf = JSON.parse(data.toString('utf8', 20, 20 + c0Len));

    const expectedBones = [
      'Hips', 'Spine', 'Chest', 'Neck', 'Head',
      'LeftEye', 'RightEye',
      'LeftShoulder', 'RightShoulder',
      'LeftUpperArm', 'RightUpperArm',
      'LeftLowerArm', 'RightLowerArm',
      'LeftHand', 'RightHand',
      'LeftUpperLeg', 'RightUpperLeg',
      'LeftLowerLeg', 'RightLowerLeg',
      'LeftFoot', 'RightFoot'
    ];

    const skin = gltf.skins[0];
    expect(skin.joints.length).toBe(21);

    const boneNodes = skin.joints.map((jointIdx: number) => gltf.nodes[jointIdx]);
    const boneNames = boneNodes.map((n: any) => n.name);

    for (const expectedBone of expectedBones) {
      expect(boneNames, `Armature must contain bone ${expectedBone}`).toContain(expectedBone);
    }

    // Verify parent-child linkages
    const hipsNode = boneNodes.find((n: any) => n.name === 'Hips');
    const spineNode = boneNodes.find((n: any) => n.name === 'Spine');
    const chestNode = boneNodes.find((n: any) => n.name === 'Chest');
    const neckNode = boneNodes.find((n: any) => n.name === 'Neck');
    const headNode = boneNodes.find((n: any) => n.name === 'Head');

    expect(hipsNode.children).toBeDefined();
    expect(spineNode.children).toBeDefined();
    expect(chestNode.children).toBeDefined();
    expect(neckNode.children).toBeDefined();
    expect(headNode.children).toBeDefined();
  });

  it('Part D: validates skinning attributes and Inverse Bind Matrices', () => {
    const data = fs.readFileSync(glbPath);
    const c0Len = data.readUInt32LE(12);
    const gltf = JSON.parse(data.toString('utf8', 20, 20 + c0Len));

    const prim = gltf.meshes[0].primitives[0];
    expect(prim.attributes.POSITION).toBeDefined();
    expect(prim.attributes.NORMAL).toBeDefined();
    expect(prim.attributes.TEXCOORD_0).toBeDefined();
    expect(prim.attributes.JOINTS_0).toBeDefined();
    expect(prim.attributes.WEIGHTS_0).toBeDefined();

    const skin = gltf.skins[0];
    const ibmAccIdx = skin.inverseBindMatrices;
    const ibmAcc = gltf.accessors[ibmAccIdx];

    expect(ibmAcc.type).toBe('MAT4');
    expect(ibmAcc.count).toBe(21);
    expect(ibmAcc.componentType).toBe(5126); // FLOAT
  });

  it('Part E: validates five speech visemes and facial morph targets', () => {
    const data = fs.readFileSync(glbPath);
    const c0Len = data.readUInt32LE(12);
    const gltf = JSON.parse(data.toString('utf8', 20, 20 + c0Len));

    const prim = gltf.meshes[0].primitives[0];
    const targetNames = gltf.meshes[0].extras.targetNames;

    expect(targetNames).toBeDefined();
    expect(prim.targets.length).toBe(targetNames.length);

    // Verify mandatory 5 vowel visemes
    const mandatoryVisemes = ['viseme_aa', 'viseme_ih', 'viseme_ou', 'viseme_ee', 'viseme_oh'];
    for (const v of mandatoryVisemes) {
      expect(targetNames, `Model must contain viseme ${v}`).toContain(v);
    }

    // Verify expressive morph targets
    const expressiveMorphs = ['jawOpen', 'mouthSmile', 'mouthFrown', 'browInnerUp', 'blinkLeft', 'blinkRight', 'cheekSquintLeft', 'cheekSquintRight'];
    for (const m of expressiveMorphs) {
      expect(targetNames, `Model must contain morph target ${m}`).toContain(m);
    }
  });

  it('Part F: validates complete 30-expression matrix mapping readiness', () => {
    expect(ALL_ASHA_EXPRESSIONS.length).toBe(30);

    // Every expression in the 30-expression registry must have valid metadata
    for (const exprId of ALL_ASHA_EXPRESSIONS) {
      const meta = ASHA_EXPRESSIONS_REGISTRY[exprId];
      expect(meta).toBeDefined();
      expect(meta.id).toBe(exprId);
      expect(meta.category).toBeDefined();
      expect(meta.priority).toBeGreaterThanOrEqual(1);
    }
  });

  it('Part G: validates geometry and texture asset performance budget', () => {
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));

    // Check triangle budget
    expect(metadata.mesh.triangles).toBeLessThanOrEqual(22000);
    expect(metadata.mesh.budget_compliance).toBe(true);

    // Check file size budget
    expect(metadata.file_size.megabytes).toBeLessThanOrEqual(4.5);
    expect(metadata.file_size.budget_compliance).toBe(true);

    // Check texture resolution
    expect(metadata.textures.atlas_resolution).toBe('2048x2048');
  });

  it('Part H: validates isolated model validation harness completeness', () => {
    const htmlContent = fs.readFileSync(harnessPath, 'utf8');

    // Harness must load the actual GLB asset
    expect(htmlContent).toContain('/assets/asha-3d/asha.glb');

    // Harness must provide camera presets
    expect(htmlContent).toContain('setCameraPreset');
    expect(htmlContent).toContain('front');
    expect(htmlContent).toContain('side');
    expect(htmlContent).toContain('face');

    // Harness must include all 30 expressions
    for (const exprId of ALL_ASHA_EXPRESSIONS) {
      expect(htmlContent).toContain(exprId);
    }

    // Harness must include 5 vowel visemes
    expect(htmlContent).toContain('viseme_aa');
    expect(htmlContent).toContain('viseme_ih');
    expect(htmlContent).toContain('viseme_ou');
    expect(htmlContent).toContain('viseme_ee');
    expect(htmlContent).toContain('viseme_oh');

    // Harness must contain bone armature tree
    expect(htmlContent).toContain('Hips');
    expect(htmlContent).toContain('Spine');
    expect(htmlContent).toContain('Chest');
    expect(htmlContent).toContain('Head');
  });
});
