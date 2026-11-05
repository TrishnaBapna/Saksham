import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth.js';

const router = Router();

// Demo routines for initial prototype phase
const DEMO_ROUTINES = [
  {
    routineId: 'routine-001',
    patientId: 'patient-demo',
    title: 'Morning Hydration & Gentle Arm Stretches',
    scheduledTime: '11:00 AM',
    category: 'exercise',
    streakCount: 4,
    enableAssistedRecall: true,
    recallCues: {
      hint1: 'Think about what keeps your body feeling fresh and flexible in the late morning.',
      hint2: 'A tall glass of warm lemon water and three shoulder rolls.',
      hint3: 'Drink one glass of water from the kitchen counter and stretch both arms upward for 30 seconds.'
    },
    isCompleted: false
  },
  {
    routineId: 'routine-002',
    patientId: 'patient-demo',
    title: 'Afternoon Memory Album Walk',
    scheduledTime: '02:30 PM',
    category: 'activity',
    streakCount: 6,
    enableAssistedRecall: true,
    recallCues: {
      hint1: 'Looking at pictures of smiling faces from your trip to Shimla.',
      hint2: 'Open the Loved Ones tab and look at Ananya and Aarav.',
      hint3: 'Spend 5 minutes looking at your daughter Ananya\'s audio message.'
    },
    isCompleted: false
  }
];

router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    data: DEMO_ROUTINES
  });
});

export default router;
