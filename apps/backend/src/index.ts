import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { adminRouter } from './routes/adminRoutes.js';
import { caregiverRouter } from './routes/caregiverRoutes.js';
import { doctorRouter } from './routes/doctorRoutes.js';
import { auditRouter } from './routes/auditRoutes.js';

dotenv.config();

export const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'saksham-backend',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Mounted Routes
app.use('/api/admin', adminRouter);
app.use('/api/caregiver', caregiverRouter);
app.use('/api/doctor', doctorRouter);
app.use('/api/audit', auditRouter);

// Start server if executed directly
if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`[Saksham Backend] Security & Administration server running on port ${port}`);
  });
}
