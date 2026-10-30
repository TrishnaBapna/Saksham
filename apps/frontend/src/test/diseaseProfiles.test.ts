import { describe, it, expect } from 'vitest';
import {
  getAccessibleModulesForCondition,
  type CareCondition,
  type DiseaseModule,
} from '@/types/firestore';

describe('Phase 3: Disease-Adaptive Patient Navigation & Module Access', () => {
  describe('Parkinson\'s Disease Profile', () => {
    const modules = getAccessibleModulesForCondition('parkinsons');

    it('includes Mind Clinic, Movement, Speech, Articles, Calendar, and Safety (Routine/SafePath)', () => {
      expect(modules).toContain<DiseaseModule>('routine');
      expect(modules).toContain<DiseaseModule>('mindClinic');
      expect(modules).toContain<DiseaseModule>('movement');
      expect(modules).toContain<DiseaseModule>('speech');
      expect(modules).toContain<DiseaseModule>('articles');
      expect(modules).toContain<DiseaseModule>('calendar');
      expect(modules).toContain<DiseaseModule>('safepath');
    });

    it('strictly excludes Loved Ones & Care (Alzheimer\'s specific module)', () => {
      expect(modules).not.toContain<DiseaseModule>('lovedOnes');
    });
  });

  describe('Alzheimer\'s Disease Profile', () => {
    const modules = getAccessibleModulesForCondition('alzheimers');

    it('includes Mind Clinic, Loved Ones & Care, Articles, Calendar, and Safety (Routine/SafePath)', () => {
      expect(modules).toContain<DiseaseModule>('routine');
      expect(modules).toContain<DiseaseModule>('mindClinic');
      expect(modules).toContain<DiseaseModule>('lovedOnes');
      expect(modules).toContain<DiseaseModule>('articles');
      expect(modules).toContain<DiseaseModule>('calendar');
      expect(modules).toContain<DiseaseModule>('safepath');
    });

    it('strictly excludes Movement and Speech (Parkinson\'s motor modules)', () => {
      expect(modules).not.toContain<DiseaseModule>('movement');
      expect(modules).not.toContain<DiseaseModule>('speech');
    });
  });

  describe('Both Conditions (Parkinson\'s & Alzheimer\'s Dual Care)', () => {
    const modules = getAccessibleModulesForCondition('both');

    it('includes full therapeutic suite: Mind Clinic, Movement, Speech, Loved Ones, Articles, Calendar, Safety', () => {
      expect(modules).toContain<DiseaseModule>('routine');
      expect(modules).toContain<DiseaseModule>('mindClinic');
      expect(modules).toContain<DiseaseModule>('movement');
      expect(modules).toContain<DiseaseModule>('speech');
      expect(modules).toContain<DiseaseModule>('lovedOnes');
      expect(modules).toContain<DiseaseModule>('articles');
      expect(modules).toContain<DiseaseModule>('calendar');
      expect(modules).toContain<DiseaseModule>('safepath');
      expect(modules.length).toBe(8);
    });

    it('also recognizes parkinsons_alzheimers alias key', () => {
      const aliasModules = getAccessibleModulesForCondition('parkinsons_alzheimers');
      expect(aliasModules).toEqual(modules);
    });
  });

  describe('Unselected / Undiagnosed Initial State Fallback', () => {
    it('provides safe baseline modules when condition is undefined or other', () => {
      const undefModules = getAccessibleModulesForCondition(undefined);
      expect(undefModules).toContain<DiseaseModule>('routine');
      expect(undefModules).toContain<DiseaseModule>('mindClinic');
      expect(undefModules).toContain<DiseaseModule>('articles');
      expect(undefModules).toContain<DiseaseModule>('calendar');
      expect(undefModules).toContain<DiseaseModule>('safepath');

      // Does not expose specialized motor/memory modules before selection
      expect(undefModules).not.toContain<DiseaseModule>('movement');
      expect(undefModules).not.toContain<DiseaseModule>('speech');
      expect(undefModules).not.toContain<DiseaseModule>('lovedOnes');
    });
  });

  describe('Tab Access Enforcement Guard', () => {
    function enforceTabAccess(condition: CareCondition | undefined, requestedTab: DiseaseModule): DiseaseModule {
      const allowed = getAccessibleModulesForCondition(condition);
      return allowed.includes(requestedTab) ? requestedTab : 'routine';
    }

    it('prevents Alzheimer\'s patient from accessing Movement tab via state manipulation', () => {
      const resolved = enforceTabAccess('alzheimers', 'movement');
      expect(resolved).toBe('routine'); // Automatically reset to safe routine
    });

    it('prevents Parkinson\'s patient from accessing Loved Ones tab', () => {
      const resolved = enforceTabAccess('parkinsons', 'lovedOnes');
      expect(resolved).toBe('routine');
    });

    it('permits Parkinson\'s patient accessing Speech tab', () => {
      const resolved = enforceTabAccess('parkinsons', 'speech');
      expect(resolved).toBe('speech');
    });

    it('permits Both-condition patient accessing all modules', () => {
      expect(enforceTabAccess('both', 'movement')).toBe('movement');
      expect(enforceTabAccess('both', 'speech')).toBe('speech');
      expect(enforceTabAccess('both', 'lovedOnes')).toBe('lovedOnes');
      expect(enforceTabAccess('both', 'mindClinic')).toBe('mindClinic');
    });
  });
});
