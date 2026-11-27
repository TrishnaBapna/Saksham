import { CompletionStatus, GameRunMetrics } from '../../../types/index.js';

export interface RunMetricsInput {
  correctAnswers: number;
  incorrectAnswers: number;
  hintsUsed?: number;
  reactionTimesMs?: number[];
  completionStatus?: CompletionStatus;
}

/**
 * Normalizes gameplay counters from any cognitive game runner into an
 * objective, non-punitive GameRunMetrics payload for adaptive evaluation
 * and authorized Caregiver / Doctor analytics.
 */
export function buildGameRunMetrics(input: RunMetricsInput): GameRunMetrics {
  const correctAnswers = Math.max(0, input.correctAnswers);
  const incorrectAnswers = Math.max(0, input.incorrectAnswers);
  const hintsUsed = Math.max(0, input.hintsUsed || 0);
  const attempts = Math.max(1, correctAnswers + incorrectAnswers);
  const accuracy = Number(Math.max(0, Math.min(1, correctAnswers / attempts)).toFixed(3));
  const status: CompletionStatus = input.completionStatus || 'completed';

  const score =
    status === 'completed'
      ? Math.max(40, Math.min(100, Math.round(accuracy * 100 - Math.min(12, hintsUsed * 3))))
      : Math.round(accuracy * 100);

  const reactionTimeMs =
    input.reactionTimesMs && input.reactionTimesMs.length > 0
      ? Math.round(
          input.reactionTimesMs.reduce((sum, val) => sum + val, 0) /
            input.reactionTimesMs.length
        )
      : undefined;

  return {
    correctAnswers,
    incorrectAnswers,
    attempts,
    mistakesCount: incorrectAnswers,
    hintsUsed,
    accuracy,
    score,
    reactionTimeMs,
    completionStatus: status,
  };
}
