import express from 'express';
import cors, { CorsOptions } from 'cors';
import aiRouter from './routes/ai.js';
import routinesRouter from './routes/routines.js';
import rolesRouter from './routes/roles.js';
import { errorHandler } from './middleware/errorHandler.js';

export const ALLOWED_ORIGINS: readonly string[] = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  'https://saksham-d3b71.web.app',
  'https://saksham-d3b71.firebaseapp.com'
];

export const getAllowedOrigins = (): string[] => {
  const envOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
    : [];
  return [...new Set([...ALLOWED_ORIGINS, ...envOrigins])];
};

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Requests without origin header (e.g. mobile native clients, server-side curl, health probes)
    if (!origin) {
      return callback(null, true);
    }

    const permitted = getAllowedOrigins();
    if (permitted.includes(origin)) {
      return callback(null, true);
    }

    // Fail closed: deny CORS access for unauthorized origins
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true,
  optionsSuccessStatus: 204
};

export const app = express();

app.use(cors(corsOptions));
// Handle preflight OPTIONS requests across all routes
app.options('*', cors(corsOptions));

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
if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  app.listen(PORT, () => {
    console.log(`Saksham Backend service running on port ${PORT}`);
  });
}
