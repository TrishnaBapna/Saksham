import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth.js';
import { processAIConversation, isActionWhitelisted } from '../services/aiService.js';

const router = Router();

router.post('/converse', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { transcript, language, currentScreen } = req.body;
    const patientId = req.user?.uid || 'anonymous';

    const result = await processAIConversation({
      patientId,
      transcript: String(transcript || ''),
      language: String(language || 'en'),
      currentScreen: currentScreen ? String(currentScreen) : undefined
    });

    // Sanitize any action returned
    if (result.suggestedAction && !isActionWhitelisted(result.suggestedAction.action)) {
      delete result.suggestedAction;
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'AI_PROCESSING_ERROR',
      message: (error as Error).message
    });
  }
});

export default router;
