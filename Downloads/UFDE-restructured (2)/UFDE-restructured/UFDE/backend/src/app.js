const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const { initDatabase } = require('./database/init');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const riskScoreRoutes = require('./routes/riskScore.routes');
const uploadRoutes = require('./routes/upload.routes');
const transactionRoutes = require('./routes/transaction.routes');
const scoringConfigRoutes = require('./routes/scoringConfig.routes');
const adminRoutes = require('./routes/admin.routes');
const actionsRoutes = require('./routes/actions.routes');
const exportRoutes = require('./routes/export.routes');

initDatabase();

const app = express();

// The frontend is a separate React app (default http://localhost:3000); allow
// it to call this API from its own origin.
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} is not allowed by CORS.`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// This service is a pure REST API - the UI lives in ../frontend.
// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'UFDE', time: new Date().toISOString() }));

// API routes
app.use('/api/auth', authRoutes);
app.use('/risk-score', riskScoreRoutes); // spec-mandated single endpoint
app.use('/api/risk-score', riskScoreRoutes); // same handler under the /api prefix
app.use('/api/upload', uploadRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/scoring-config', scoringConfigRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/actions', actionsRoutes);
app.use('/api/export', exportRoutes);

app.use(errorHandler);

module.exports = app;
