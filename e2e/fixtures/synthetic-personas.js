/**
 * Saksham 3.0 Synthetic Test Personas
 * Strictly synthetic, isolated test profiles. No real patient data.
 */

export const SYNTHETIC_PERSONAS = {
  kalyani: {
    uid: 'synthetic_senior_kalyani_001',
    role: 'patient',
    displayName: 'Kalyani',
    dob: '1958-05-15', // Age ~68 (Senior Tier)
    condition: 'parkinsons',
    companionCharacter: 'miko',
    companionDemeanor: 'gentle',
    theme: 'calm-earth',
    fontSize: 'large',
    tremorDamping: true,
    highContrast: false,
    quietHours: { enabled: true, start: '22:00', end: '07:00' },
    snoozeDuration: 5,
    tasks: [
      { id: 'syn-task-1', title: 'Morning Levodopa Medication', time: '08:30 AM', category: 'medication', done: false, type: 'medication' },
      { id: 'syn-task-2', title: 'Buttoning Shirt & Morning Dressing', time: '09:00 AM', category: 'routine', done: false, type: 'routine' },
      { id: 'syn-task-3', title: 'Mind Clinic Memory Puzzle', time: '10:30 AM', category: 'cognitive', done: false, type: 'cognitive' },
      { id: 'syn-task-4', title: 'Gentle Garden Stroll & Hydration', time: '11:30 AM', category: 'movement', done: false, type: 'movement' }
    ]
  },

  aarav: {
    uid: 'synthetic_adult_aarav_002',
    role: 'patient',
    displayName: 'Aarav',
    dob: '1992-04-10', // Age ~34 (Adult Tier)
    condition: 'other',
    companionCharacter: 'priya',
    companionDemeanor: 'encouraging',
    theme: 'calm-ocean',
    fontSize: 'standard',
    tremorDamping: false,
    highContrast: false,
    quietHours: { enabled: true, start: '23:00', end: '06:30' },
    snoozeDuration: 10,
    tasks: [
      { id: 'syn-task-aarav-1', title: 'Deep Breathing & Focus', time: '08:00 AM', category: 'routine', done: false, type: 'routine' },
      { id: 'syn-task-aarav-2', title: 'Hydration Target (500ml)', time: '09:30 AM', category: 'routine', done: false, type: 'routine' },
      { id: 'syn-task-aarav-3', title: 'Focus Sprint Routine', time: '11:00 AM', category: 'routine', done: false, type: 'routine' }
    ]
  },

  sunita: {
    uid: 'synthetic_caregiver_sunita_003',
    role: 'caregiver',
    displayName: 'Sunita Sharma',
    patientWorkspaceUid: 'synthetic_senior_kalyani_001',
    assignedPatientName: 'Kalyani',
    pin: '1234',
    geofenceRadiusMeters: 500
  },

  drVerma: {
    uid: 'synthetic_doctor_verma_004',
    role: 'doctor',
    displayName: 'Dr. Rajesh Verma, MD',
    specialty: 'Neurology & Movement Disorders',
    licenseNumber: 'SYNTH-DOC-987654',
    pin: '1234'
  }
};
