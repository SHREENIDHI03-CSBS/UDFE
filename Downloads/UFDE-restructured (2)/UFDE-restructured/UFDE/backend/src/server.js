require('dotenv').config();
const app = require('./app');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  logger.info(`UFDE server listening on http://localhost:${PORT}`);
  // eslint-disable-next-line no-console
  console.log(`\nUnified Fraud Detection Engine API running: http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log('React frontend: run `npm start` in ../frontend (http://localhost:3000)');
});
