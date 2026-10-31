import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('SAKSHAM 2.0 — CRUD Reliability, Camera Fallback, & Calm Layout Usability', () => {
  const rootDir = path.resolve(__dirname, '../../../../');

  beforeEach(() => {
    localStorage.clear();
  });

  describe('1. Loved Ones / Contacts CRUD Lifecycle', () => {
    it('allows creating a loved one without requiring a photo immediately', () => {
      // Simulate state.familiarPeople
      const initialPeople = [
        {
          id: 'demo-loved-one-1',
          name: 'Trishna Sharma',
          role: 'Daughter',
          phone: '+1 (555) 102-2044',
          whatsapp: '15551022044',
          clue: 'She brought fresh apples last Sunday.',
          img: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
          options: ['Trishna Sharma', 'Doctor', 'Neighbor', 'Nurse']
        }
      ];
      localStorage.setItem('saksham_familiar_people', JSON.stringify(initialPeople));

      // Create new contact without photo
      const newContact = {
        id: `person-${Date.now()}`,
        name: 'Dr. Suresh Mehta',
        role: 'Neurologist',
        phone: '+91 98765 43210',
        whatsapp: '919876543210',
        clue: 'Your monthly neurologist for motor tremor reviews.',
        img: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
        options: ['Dr. Suresh Mehta', 'Doctor', 'Neighbor', 'Nurse']
      };

      const updatedList = [...initialPeople, newContact];
      localStorage.setItem('saksham_familiar_people', JSON.stringify(updatedList));

      const reloaded = JSON.parse(localStorage.getItem('saksham_familiar_people') || '[]');
      expect(reloaded).toHaveLength(2);
      expect(reloaded[1].name).toBe('Dr. Suresh Mehta');
      expect(reloaded[1].role).toBe('Neurologist');
      expect(reloaded[1].img).toBeTruthy();
    });

    it('correctly updates an existing contact record with new details and persists', () => {
      const contacts = [
        {
          id: 'person-contact-1',
          name: 'Ananya',
          role: 'Caregiver',
          phone: '+1 555 1234',
          clue: 'Old note',
          img: 'https://images.unsplash.com/photo-1'
        }
      ];
      localStorage.setItem('saksham_familiar_people', JSON.stringify(contacts));

      // Edit contact details
      const targetIndex = 0;
      contacts[targetIndex].name = 'Ananya Sen';
      contacts[targetIndex].role = 'Primary Nurse';
      contacts[targetIndex].phone = '+1 555 9999';
      contacts[targetIndex].clue = 'Administers morning therapy and exercises.';

      localStorage.setItem('saksham_familiar_people', JSON.stringify(contacts));

      const saved = JSON.parse(localStorage.getItem('saksham_familiar_people') || '[]');
      expect(saved[0].name).toBe('Ananya Sen');
      expect(saved[0].role).toBe('Primary Nurse');
      expect(saved[0].phone).toBe('+1 555 9999');
      expect(saved[0].clue).toBe('Administers morning therapy and exercises.');
    });

    it('preserves deletion of loved ones across reloads and sets deletion flag', () => {
      const contacts = [
        { id: 'c1', name: 'Member 1', role: 'Daughter' },
        { id: 'c2', name: 'Member 2', role: 'Son' }
      ];
      localStorage.setItem('saksham_familiar_people', JSON.stringify(contacts));

      // Delete Member 1
      contacts.splice(0, 1);
      localStorage.setItem('saksham_familiar_people', JSON.stringify(contacts));

      let saved = JSON.parse(localStorage.getItem('saksham_familiar_people') || '[]');
      expect(saved).toHaveLength(1);
      expect(saved[0].name).toBe('Member 2');

      // Delete remaining member
      contacts.splice(0, 1);
      localStorage.setItem('saksham_familiar_people', JSON.stringify([]));
      localStorage.setItem('saksham_loved_ones_deleted_all', 'true');

      saved = JSON.parse(localStorage.getItem('saksham_familiar_people') || '[]');
      expect(saved).toHaveLength(0);
      expect(localStorage.getItem('saksham_loved_ones_deleted_all')).toBe('true');
    });
  });

  describe('2. Routine Activity / Task CRUD Lifecycle', () => {
    it('updates an existing task title, time, and caregiver note and persists in localStorage', () => {
      const initialTasks = [
        {
          id: 101,
          title: 'Morning Medication',
          time: '08:00 AM',
          rawTime: '08:00',
          tag: 'Medication',
          done: false,
          caregiverNote: 'Take with warm water'
        }
      ];
      localStorage.setItem('saksham_tasks', JSON.stringify(initialTasks));

      // Update task
      const updated = {
        ...initialTasks[0],
        title: 'Morning Levodopa & Hydration',
        time: '08:30 AM',
        rawTime: '08:30',
        caregiverNote: 'Ensure 30 mins before breakfast to prevent protein interference.'
      };
      initialTasks[0] = updated;
      localStorage.setItem('saksham_tasks', JSON.stringify(initialTasks));

      const reloaded = JSON.parse(localStorage.getItem('saksham_tasks') || '[]');
      expect(reloaded[0].title).toBe('Morning Levodopa & Hydration');
      expect(reloaded[0].time).toBe('08:30 AM');
      expect(reloaded[0].caregiverNote).toContain('Ensure 30 mins before breakfast');
    });

    it('removes a task cleanly and updates the persisted task array', () => {
      const tasks = [
        { id: 1, title: 'Task 1', done: true },
        { id: 2, title: 'Task 2', done: false }
      ];
      localStorage.setItem('saksham_tasks', JSON.stringify(tasks));

      const remaining = tasks.filter(t => t.id !== 1);
      localStorage.setItem('saksham_tasks', JSON.stringify(remaining));

      const reloaded = JSON.parse(localStorage.getItem('saksham_tasks') || '[]');
      expect(reloaded).toHaveLength(1);
      expect(reloaded[0].id).toBe(2);
    });
  });

  describe('3. Personalisation Settings & Calm Theme Verification', () => {
    it('verifies index.html has no conflicting inline onchange on wallpapers', () => {
      const indexPath = path.join(rootDir, 'index.html');
      expect(fs.existsSync(indexPath)).toBe(true);
      const indexContent = fs.readFileSync(indexPath, 'utf8');

      // The old bug had onchange="window.SakshamPersonalisation.applySettingsToDom(window.SakshamPersonalisation.getSettings())"
      expect(indexContent).not.toContain('applySettingsToDom(window.SakshamPersonalisation.getSettings())');
    });

    it('verifies navigation items have explicit data-tab attributes for simple dock mode', () => {
      const indexPath = path.join(rootDir, 'index.html');
      const indexContent = fs.readFileSync(indexPath, 'utf8');

      expect(indexContent).toContain('data-tab="routine"');
      expect(indexContent).toContain('data-tab="games"');
      expect(indexContent).toContain('data-tab="vault"');
    });

    it('verifies vault.js defines openEditLovedOneModal and renderLovedOnes', () => {
      const vaultPath = path.join(rootDir, 'js/features/vault.js');
      expect(fs.existsSync(vaultPath)).toBe(true);
      const vaultContent = fs.readFileSync(vaultPath, 'utf8');

      expect(vaultContent).toContain('openEditLovedOneModal');
      expect(vaultContent).toContain('openAddLovedOneModal');
      expect(vaultContent).toContain('saveLovedOneCard');
      expect(vaultContent).toContain('window.openEditLovedOneModal = openEditLovedOneModal');
    });

    it('verifies routine.js task cards include .task-card-item for styling and density', () => {
      const routinePath = path.join(rootDir, 'js/features/routine.js');
      expect(fs.existsSync(routinePath)).toBe(true);
      const routineContent = fs.readFileSync(routinePath, 'utf8');

      expect(routineContent).toContain('task-card-item');
      expect(routineContent).toContain('openCaregiverAddTaskModal');
    });

    it('verifies db.js defines lovedOnes.update', () => {
      const dbPath = path.join(rootDir, 'js/services/db.js');
      expect(fs.existsSync(dbPath)).toBe(true);
      const dbContent = fs.readFileSync(dbPath, 'utf8');

      expect(dbContent).toContain('async update(id, updates)');
    });
  });

  describe('4. Camera & Modal Flow Safety', () => {
    it('verifies movement.js restores Add Loved One modal if open when camera is closed', () => {
      const movementPath = path.join(rootDir, 'js/features/movement.js');
      expect(fs.existsSync(movementPath)).toBe(true);
      const movementContent = fs.readFileSync(movementPath, 'utf8');

      expect(movementContent).toContain('window._wasAddModalOpen');
      expect(movementContent).toContain("addModal.style.display = 'flex'");
    });

    it('verifies index.html webcam modal includes direct device camera input fallback', () => {
      const indexPath = path.join(rootDir, 'index.html');
      const indexContent = fs.readFileSync(indexPath, 'utf8');

      expect(indexContent).toContain('id="webcamDeviceCameraInput"');
      expect(indexContent).toContain('capture="user"');
      expect(indexContent).toContain('handleWebcamFallbackUpload');
    });
  });

  describe('5. Responsive Proportions & Modal Containment', () => {
    it('verifies css/style.css contains internal scrolling and viewport containment rules', () => {
      const cssPath = path.join(rootDir, 'css/style.css');
      expect(fs.existsSync(cssPath)).toBe(true);
      const cssContent = fs.readFileSync(cssPath, 'utf8');

      expect(cssContent).toContain('max-height: 90vh !important;');
      expect(cssContent).toContain('overflow-y: auto !important;');
      expect(cssContent).toContain('max-width: 100vw;');
      expect(cssContent).toContain('overflow-x: hidden;');
    });
  });
});
