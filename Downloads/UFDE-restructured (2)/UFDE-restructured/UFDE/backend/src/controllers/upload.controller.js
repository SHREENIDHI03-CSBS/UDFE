const { runPipelineFromFiles } = require('../services/pipeline');
const Ingestion = require('../models/Ingestion');
const { ok, fail } = require('../utils/response');

/**
 * POST /api/upload
 * multipart/form-data fields: af (JSON file), ff (CSV file), ph (JSON file)
 * At least one file must be supplied.
 */
function uploadBatch(req, res) {
  const files = req.files || {};
  const afFile = files.af?.[0];
  const ffFile = files.ff?.[0];
  const phFile = files.ph?.[0];

  if (!afFile && !ffFile && !phFile) {
    return fail(res, 400, 'VALIDATION_ERROR', 'At least one of af, ff, ph files must be uploaded.');
  }

  try {
    const { processed, rejected } = runPipelineFromFiles(
      {
        afPath: afFile?.path,
        ffPath: ffFile?.path,
        phPath: phFile?.path,
      },
      { actor: req.user?.email || 'system' }
    );

    if (afFile) Ingestion.record({ fileName: afFile.originalname, fileType: 'AF', recordCount: processed.length + rejected.length, uploadedBy: req.user?.email });
    if (ffFile) Ingestion.record({ fileName: ffFile.originalname, fileType: 'FF', recordCount: processed.length + rejected.length, uploadedBy: req.user?.email });
    if (phFile) Ingestion.record({ fileName: phFile.originalname, fileType: 'PH', recordCount: processed.length + rejected.length, uploadedBy: req.user?.email });

    return ok(res, {
      processedCount: processed.length,
      rejectedCount: rejected.length,
      processed: processed.map((p) => ({
        transactionId: p.transactionId,
        riskScore: p.consolidatedScore,
        riskBand: p.band.key,
        strGenerated: p.strGenerated,
      })),
      rejected,
    });
  } catch (err) {
    return fail(res, 400, 'INGESTION_ERROR', `Failed to process uploaded files: ${err.message}`);
  }
}

module.exports = { uploadBatch };
