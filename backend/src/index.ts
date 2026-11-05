import express from 'express';
import cors from 'cors';
import aiRouter from './routes/ai.js';
import routinesRouter from './routes/routines.js';
import rolesRouter from './routes/roles.js';
import { errorHandler } from './middleware/errorHandler.js';

export const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

// System health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'saksham-backend',
    version: '0.1.0',
    timestamp: new Date().toISOString()
  });
});

// Mounted API routes
app.use('/api/ai', aiRouter);
app.use('/api/routines', routinesRouter);
app.use('/api/roles', rolesRouter);

// Global error handler
app.use(errorHandler);

// Standalone server for local development & testing
const PORT = process.env.PORT || 5001;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Saksham Backend service running on port ${PORT}`);
  });
}
