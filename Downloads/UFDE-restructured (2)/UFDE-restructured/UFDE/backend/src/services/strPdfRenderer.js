const PDFDocument = require('pdfkit');

const GREEN = '#00915a';
const DARK = '#0a2e1f';
const GREY = '#6b7280';
const LINE = '#cfd8d2';

const BAND_COLORS = {
  VERY_LOW: '#4caf50',
  LOW: '#8bc34a',
  MEDIUM: '#ffc107',
  HIGH: '#ff9800',
  CRITICAL: '#e53935',
};

const MARGIN = 50;

function ensureSpace(doc, needed) {
  if (doc.y + needed > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
  }
}

function sectionTitle(doc, text) {
  ensureSpace(doc, 50);
  doc.moveDown(1);
  doc.font('Helvetica-Bold').fontSize(12).fillColor(DARK).text(text.toUpperCase(), { characterSpacing: 0.5 });
  const y = doc.y + 3;
  doc.moveTo(MARGIN, y).lineTo(doc.page.width - MARGIN, y).lineWidth(1).strokeColor(GREEN).stroke();
  doc.moveDown(0.8);
  doc.fillColor(DARK);
}

function rowHeight(doc, cells, widths, padding) {
  let max = 0;
  cells.forEach((cell, i) => {
    const h = doc.heightOfString(String(cell ?? ''), { width: widths[i] - padding * 2 });
    if (h > max) max = h;
  });
  return max + padding * 2;
}

/**
 * Draws a bordered table. `columns` is an array of { label, width, align }.
 */
function drawTable(doc, columns, rows, opts = {}) {
  const padding = 6;
  const widths = columns.map((c) => c.width);
  const tableWidth = widths.reduce((a, b) => a + b, 0);
  const startX = MARGIN;

  const drawRow = (cells, { bold = false, fill = null, color = DARK, isHeader = false } = {}) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
    const h = rowHeight(doc, cells, widths, padding);
    ensureSpace(doc, h);
    const y = doc.y;

    if (fill) {
      doc.rect(startX, y, tableWidth, h).fillColor(fill).fill();
    }

    doc.lineWidth(0.5).strokeColor(LINE);
    doc.rect(startX, y, tableWidth, h).stroke();

    let x = startX;
    cells.forEach((cell, i) => {
      if (i > 0) {
        doc.moveTo(x, y).lineTo(x, y + h).stroke();
      }
      doc
        .fillColor(color)
        .font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(9)
        .text(String(cell ?? ''), x + padding, y + padding, {
          width: widths[i] - padding * 2,
          align: (isHeader ? columns[i].headerAlign : columns[i].align) || 'left',
        });
      x += widths[i];
    });

    doc.y = y + h;
    doc.x = startX;
  };

  if (!opts.hideHeader) {
    drawRow(columns.map((c) => c.label), { bold: true, fill: '#eef4f0', isHeader: true });
  }
  rows.forEach((r) => drawRow(r.cells, { bold: !!r.bold, fill: r.fill || null }));
}

function fieldTable(doc, pairs) {
  const contentWidth = doc.page.width - MARGIN * 2;
  drawTable(
    doc,
    [
      { label: 'Field', width: contentWidth * 0.38 },
      { label: 'Value', width: contentWidth * 0.62 },
    ],
    pairs.map(([k, v]) => ({ cells: [k, v] })),
    { hideHeader: true }
  );
}

function renderHeaderBanner(doc, model) {
  doc.rect(0, 0, doc.page.width, 84).fillColor(DARK).fill();
  doc
    .fillColor('#ffffff')
    .font('Helvetica-Bold')
    .fontSize(17)
    .text('SUSPICIOUS TRANSACTION REPORT (STR)', MARGIN, 26, {
      width: doc.page.width - MARGIN * 2,
      align: 'left',
    });
  doc
    .fillColor('#9be7c4')
    .font('Helvetica')
    .fontSize(9)
    .text(`Report ID: ${model.reportId}`, MARGIN, 52, { width: doc.page.width - MARGIN * 2 });
  doc.fillColor(DARK);
  doc.x = MARGIN;
  doc.y = 108;
}

function renderConsolidatedScore(doc, model) {
  const contentWidth = doc.page.width - MARGIN * 2;
  const boxHeight = 62;
  ensureSpace(doc, boxHeight + 10);
  const y = doc.y;
  const color = BAND_COLORS[model.band.key] || GREEN;

  doc.rect(MARGIN, y, contentWidth, boxHeight).fillColor('#f4f7f5').fill();
  doc.rect(MARGIN, y, 6, boxHeight).fillColor(color).fill();

  doc
    .fillColor(GREY)
    .font('Helvetica')
    .fontSize(9)
    .text('CONSOLIDATED RISK SCORE', MARGIN + 20, y + 12);
  doc
    .fillColor(DARK)
    .font('Helvetica-Bold')
    .fontSize(26)
    .text(`${model.consolidatedScore} / 100`, MARGIN + 20, y + 26);
  doc
    .fillColor(color)
    .font('Helvetica-Bold')
    .fontSize(13)
    .text(`RISK BAND: ${String(model.band.label || '').toUpperCase()}`, MARGIN + 20, y + 32, {
      width: contentWidth - 40,
      align: 'right',
    });

  doc.fillColor(DARK);
  doc.x = MARGIN;
  doc.y = y + boxHeight + 4;
}

function renderBody(doc, model) {
  const contentWidth = doc.page.width - MARGIN * 2;

  renderHeaderBanner(doc, model);

  sectionTitle(doc, 'Report Header');
  fieldTable(doc, [
    ['Reporting Institution', model.header.reportingInstitution],
    ['Report ID', model.header.reportId],
    ['Date of Report', model.header.dateOfReport],
    ['Prepared By', model.header.preparedBy],
    ['Contact', model.header.contact],
  ]);

  sectionTitle(doc, 'Transaction Summary');
  const t = model.transactionSummary;
  fieldTable(doc, [
    ['Transaction ID', t.transactionId],
    ['Date / Time (UTC)', t.dateTimeUtc],
    ['Channel', t.channel],
    ['Amount', t.amount],
    ['Currency', t.currency],
    ['Geolocation', t.geolocation],
    ['Last Successful Login', t.lastSuccessfulLogin],
    ['Device Fingerprint', t.deviceFingerprint],
    ['Merchant', t.merchant],
    ['Merchant Category', t.merchantCategory],
    ['Beneficiary KYC Tier', t.beneficiaryKycTier],
    ['Fund-Flow Direction', t.fundFlowDirection],
  ]);

  sectionTitle(doc, 'Risk Assessment');
  const ra = model.riskAssessment;
  drawTable(
    doc,
    [
      { label: 'Component', width: contentWidth * 0.34 },
      { label: 'Sub-Score (0-100)', width: contentWidth * 0.18, align: 'right', headerAlign: 'right' },
      { label: 'Weight in Overall Score', width: contentWidth * 0.24, align: 'right', headerAlign: 'right' },
      { label: 'Weighted Contribution', width: contentWidth * 0.24, align: 'right', headerAlign: 'right' },
    ],
    [
      ...ra.rows.map((r) => ({
        cells: [r.component, r.subScore, r.weightLabel, r.weightedContribution],
      })),
      { cells: ['TOTAL', '', '', ra.total], bold: true, fill: '#eef4f0' },
    ]
  );
  doc
    .moveDown(0.4)
    .font('Helvetica')
    .fontSize(8)
    .fillColor(GREY)
    .text('Weights are read from the currently active scoring configuration at the time of generation.', MARGIN, doc.y, {
      width: contentWidth,
    });
  doc.fillColor(DARK);

  doc.moveDown(1);
  renderConsolidatedScore(doc, model);

  if (model.explanations.length) {
    sectionTitle(doc, 'Plain-Language Explanation');
    model.explanations.forEach((e) => {
      ensureSpace(doc, 24);
      doc.font('Helvetica').fontSize(9).fillColor(DARK).text(`\u2022  ${e}`, MARGIN, doc.y, { width: contentWidth });
      doc.moveDown(0.25);
    });
  }

  if (model.recommendedActions.length) {
    sectionTitle(doc, 'Recommended Actions');
    model.recommendedActions.forEach((a, i) => {
      ensureSpace(doc, 24);
      doc.font('Helvetica').fontSize(9).fillColor(DARK).text(`${i + 1}.  ${a}`, MARGIN, doc.y, { width: contentWidth });
      doc.moveDown(0.25);
    });
  }

  sectionTitle(doc, 'Supporting Evidence');
  drawTable(
    doc,
    [
      { label: 'Evidence Type', width: contentWidth * 0.26 },
      { label: 'File / Link', width: contentWidth * 0.3 },
      { label: 'Brief Description', width: contentWidth * 0.44 },
    ],
    model.supportingEvidence.map((e) => ({ cells: [e.type, e.reference, e.description] }))
  );

  sectionTitle(doc, 'Analyst Review & Sign-off');
  fieldTable(doc, [
    ['Analyst Name', model.signOff.analystName || ''],
    ['Analyst ID', model.signOff.analystId || ''],
    ['Review Date / Time (UTC)', model.signOff.reviewDateTime || ''],
    ['Electronic Signature', model.signOff.electronicSignature || ''],
  ]);

  doc.moveDown(1.2);
  doc
    .font('Helvetica-Oblique')
    .fontSize(8)
    .fillColor(GREY)
    .text(
      'System-generated draft STR produced by the Unified Fraud Detection Engine. Requires Admin sign-off before regulatory filing.',
      MARGIN,
      doc.y,
      { width: doc.page.width - MARGIN * 2 }
    );
}

/**
 * Renders the STR model to a PDF and resolves with a Buffer.
 */
function renderPdfBuffer(model) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: MARGIN, bufferPages: true });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.info.Title = `${model.reportId} - Suspicious Transaction Report`;
      doc.info.Author = model.header.preparedBy;

      renderBody(doc, model);

      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i += 1) {
        doc.switchToPage(range.start + i);
        // Writing inside the bottom margin would make PDFKit spill onto a new
        // page, so the margin is lifted for the duration of the footer write.
        const bottom = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;
        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor(GREY)
          .text(
            `${model.reportId}    |    Page ${i + 1} of ${range.count}`,
            MARGIN,
            doc.page.height - 34,
            { width: doc.page.width - MARGIN * 2, align: 'center', lineBreak: false }
          );
        doc.page.margins.bottom = bottom;
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { renderPdfBuffer };
