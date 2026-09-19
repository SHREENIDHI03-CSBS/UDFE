const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  ShadingType,
} = require('docx');

const GREEN = '00915A';
const DARK = '0A2E1F';
const GREY = '6B7280';
const HEADER_FILL = 'EEF4F0';

const BAND_COLORS = {
  VERY_LOW: '4CAF50',
  LOW: '8BC34A',
  MEDIUM: 'C79100',
  HIGH: 'FF9800',
  CRITICAL: 'E53935',
};

const CELL_BORDER = {
  top: { style: BorderStyle.SINGLE, size: 4, color: 'CFD8D2' },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CFD8D2' },
  left: { style: BorderStyle.SINGLE, size: 4, color: 'CFD8D2' },
  right: { style: BorderStyle.SINGLE, size: 4, color: 'CFD8D2' },
};

function cell(text, { bold = false, fill = null, width = null, align = AlignmentType.LEFT } = {}) {
  return new TableCell({
    borders: CELL_BORDER,
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
    shading: fill ? { type: ShadingType.CLEAR, fill, color: 'auto' } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [
      new Paragraph({
        alignment: align,
        children: [new TextRun({ text: String(text ?? ''), bold, size: 19, color: DARK })],
      }),
    ],
  });
}

function table(rows) {
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });
}

function fieldTable(pairs) {
  return table(
    pairs.map(
      ([k, v]) =>
        new TableRow({ children: [cell(k, { bold: true, width: 38, fill: HEADER_FILL }), cell(v, { width: 62 })] })
    )
  );
}

function sectionHeading(text) {
  return new Paragraph({
    spacing: { before: 280, after: 120 },
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 24, color: DARK })],
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: GREEN, space: 2 } },
  });
}

function bullet(text, numbered) {
  return new Paragraph({
    spacing: { after: 60 },
    children: [new TextRun({ text, size: 19, color: DARK })],
    bullet: numbered ? undefined : { level: 0 },
    numbering: undefined,
  });
}

function buildChildren(model) {
  const children = [];

  children.push(
    new Paragraph({
      spacing: { after: 60 },
      children: [new TextRun({ text: 'SUSPICIOUS TRANSACTION REPORT (STR)', bold: true, size: 34, color: DARK })],
    }),
    new Paragraph({
      spacing: { after: 240 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: GREEN, space: 4 } },
      children: [new TextRun({ text: `Report ID: ${model.reportId}`, size: 19, color: GREY })],
    })
  );

  children.push(sectionHeading('Report Header'));
  children.push(
    fieldTable([
      ['Reporting Institution', model.header.reportingInstitution],
      ['Report ID', model.header.reportId],
      ['Date of Report', model.header.dateOfReport],
      ['Prepared By', model.header.preparedBy],
      ['Contact', model.header.contact],
    ])
  );

  const t = model.transactionSummary;
  children.push(sectionHeading('Transaction Summary'));
  children.push(
    fieldTable([
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
    ])
  );

  children.push(sectionHeading('Risk Assessment'));
  const ra = model.riskAssessment;
  children.push(
    table([
      new TableRow({
        children: [
          cell('Component', { bold: true, fill: HEADER_FILL, width: 34 }),
          cell('Sub-Score (0-100)', { bold: true, fill: HEADER_FILL, width: 18, align: AlignmentType.RIGHT }),
          cell('Weight in Overall Score', { bold: true, fill: HEADER_FILL, width: 24, align: AlignmentType.RIGHT }),
          cell('Weighted Contribution', { bold: true, fill: HEADER_FILL, width: 24, align: AlignmentType.RIGHT }),
        ],
      }),
      ...ra.rows.map(
        (r) =>
          new TableRow({
            children: [
              cell(r.component),
              cell(r.subScore, { align: AlignmentType.RIGHT }),
              cell(r.weightLabel, { align: AlignmentType.RIGHT }),
              cell(r.weightedContribution, { align: AlignmentType.RIGHT }),
            ],
          })
      ),
      new TableRow({
        children: [
          cell('TOTAL', { bold: true, fill: HEADER_FILL }),
          cell('', { fill: HEADER_FILL }),
          cell('', { fill: HEADER_FILL }),
          cell(ra.total, { bold: true, fill: HEADER_FILL, align: AlignmentType.RIGHT }),
        ],
      }),
    ])
  );
  children.push(
    new Paragraph({
      spacing: { before: 80 },
      children: [
        new TextRun({
          text: 'Weights are read from the currently active scoring configuration at the time of generation.',
          size: 16,
          italics: true,
          color: GREY,
        }),
      ],
    })
  );

  children.push(sectionHeading('Consolidated Risk Score'));
  children.push(
    new Paragraph({
      spacing: { after: 60 },
      children: [new TextRun({ text: `${model.consolidatedScore} / 100`, bold: true, size: 44, color: DARK })],
    }),
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: `Risk Band: ${String(model.band.label || '').toUpperCase()}`,
          bold: true,
          size: 24,
          color: BAND_COLORS[model.band.key] || GREEN,
        }),
      ],
    })
  );

  if (model.explanations.length) {
    children.push(sectionHeading('Plain-Language Explanation'));
    model.explanations.forEach((e) => children.push(bullet(e)));
  }

  if (model.recommendedActions.length) {
    children.push(sectionHeading('Recommended Actions'));
    model.recommendedActions.forEach((a, i) => children.push(bullet(`${i + 1}. ${a}`, true)));
  }

  children.push(sectionHeading('Supporting Evidence'));
  children.push(
    table([
      new TableRow({
        children: [
          cell('Evidence Type', { bold: true, fill: HEADER_FILL, width: 26 }),
          cell('File / Link', { bold: true, fill: HEADER_FILL, width: 30 }),
          cell('Brief Description', { bold: true, fill: HEADER_FILL, width: 44 }),
        ],
      }),
      ...model.supportingEvidence.map(
        (e) => new TableRow({ children: [cell(e.type), cell(e.reference), cell(e.description)] })
      ),
    ])
  );

  children.push(sectionHeading('Analyst Review & Sign-off'));
  children.push(
    fieldTable([
      ['Analyst Name', model.signOff.analystName || ''],
      ['Analyst ID', model.signOff.analystId || ''],
      ['Review Date / Time (UTC)', model.signOff.reviewDateTime || ''],
      ['Electronic Signature', model.signOff.electronicSignature || ''],
    ])
  );

  children.push(
    new Paragraph({
      spacing: { before: 320 },
      children: [
        new TextRun({
          text:
            'System-generated draft STR produced by the Unified Fraud Detection Engine. '
            + 'Requires Admin sign-off before regulatory filing.',
          italics: true,
          size: 16,
          color: GREY,
        }),
      ],
    })
  );

  return children;
}

/**
 * Renders the STR model to a Word (.docx) document and resolves with a Buffer.
 */
function renderDocxBuffer(model) {
  const doc = new Document({
    creator: model.header.preparedBy,
    title: `${model.reportId} - Suspicious Transaction Report`,
    sections: [
      {
        properties: { page: { margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 } } },
        children: buildChildren(model),
      },
    ],
  });
  return Packer.toBuffer(doc);
}

module.exports = { renderDocxBuffer };
