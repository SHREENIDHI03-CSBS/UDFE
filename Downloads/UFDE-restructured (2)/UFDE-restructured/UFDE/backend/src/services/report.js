const fs = require('fs');
const path = require('path');
const { PATHS } = require('../config/constants');
const { buildReportModel } = require('./strReportModel');
const { renderPdfBuffer } = require('./strPdfRenderer');
const { renderDocxBuffer } = require('./strDocxRenderer');
const logger = require('../utils/logger');

function ensureReportDir() {
  if (!fs.existsSync(PATHS.REPORTS)) fs.mkdirSync(PATHS.REPORTS, { recursive: true });
}

function modelPath(reportId) {
  return path.join(PATHS.REPORTS, `${reportId}.json`);
}

function pdfPath(reportId) {
  return path.join(PATHS.REPORTS, `${reportId}.pdf`);
}

function docxPath(reportId) {
  return path.join(PATHS.REPORTS, `${reportId}.docx`);
}

function readModel(reportId) {
  const p = modelPath(reportId);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

/**
 * Generates a draft Suspicious Transaction Report for a scored transaction.
 *
 * The canonical artifact is the report *model* (reports/<reportId>.json): it
 * captures every field of the bank's STR template, including the risk-assessment
 * weights taken from the admin's currently active scoring configuration at the
 * moment of generation. PDF and DOCX renditions are produced from that model -
 * the PDF is also written to disk in the background so archived filings keep a
 * byte-identical copy.
 *
 * Returns { reportId, filePath } where filePath is the canonical model file.
 */
function generateSTR(record, scored, options = {}) {
  ensureReportDir();
  const model = buildReportModel(record, scored, options);

  fs.writeFileSync(modelPath(model.reportId), JSON.stringify(model, null, 2), 'utf-8');

  // Archive a rendered PDF alongside the model. Rendering is asynchronous, so
  // it must not block the scoring pipeline; on-demand downloads never depend on
  // it (they re-render from the model if the file is not on disk yet).
  renderPdfBuffer(model)
    .then((buf) => fs.writeFileSync(pdfPath(model.reportId), buf))
    .catch((err) => logger.warn('STR PDF archival failed', { reportId: model.reportId, error: err.message }));

  return { reportId: model.reportId, filePath: modelPath(model.reportId), model };
}

/**
 * Produces a downloadable rendition of a previously generated STR.
 * format: 'pdf' (default) | 'docx'
 * Returns { buffer, fileName, contentType } or null when the report is unknown.
 */
async function renderSTR(reportId, format = 'pdf', overrides = {}) {
  const stored = readModel(reportId);
  if (!stored) return null;

  const hasOverrides = !!(overrides && overrides.signOff);
  const model = hasOverrides
    ? { ...stored, signOff: { ...stored.signOff, ...overrides.signOff } }
    : stored;

  if (format === 'docx') {
    const buffer = await renderDocxBuffer(model);
    if (!hasOverrides) fs.writeFileSync(docxPath(reportId), buffer);
    return {
      buffer,
      fileName: `${reportId}.docx`,
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
  }

  const cached = pdfPath(reportId);
  if (!hasOverrides && fs.existsSync(cached)) {
    return { buffer: fs.readFileSync(cached), fileName: `${reportId}.pdf`, contentType: 'application/pdf' };
  }

  const buffer = await renderPdfBuffer(model);
  if (!hasOverrides) fs.writeFileSync(cached, buffer);
  return { buffer, fileName: `${reportId}.pdf`, contentType: 'application/pdf' };
}

/**
 * Resolves the report id from whatever is stored in transactions.str_path
 * (historically an .html path, now a .json model path).
 */
function reportIdFromPath(storedPath) {
  if (!storedPath) return null;
  return path.basename(String(storedPath)).replace(/\.(json|pdf|docx|html)$/i, '');
}

module.exports = {
  generateSTR,
  renderSTR,
  readModel,
  reportIdFromPath,
  modelPath,
  pdfPath,
  docxPath,
};
