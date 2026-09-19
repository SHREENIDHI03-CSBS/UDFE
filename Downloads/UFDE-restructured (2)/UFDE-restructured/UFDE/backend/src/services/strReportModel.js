const { v4: uuidv4 } = require('uuid');
const { round2, safeGet } = require('../utils/helpers');
const scoringConfigService = require('./scoringConfigService');

const NOT_PROVIDED = 'Not provided';

function firstOf(...values) {
  for (const v of values) {
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
}

function fmt(value) {
  return value === undefined || value === null || value === '' ? NOT_PROVIDED : String(value);
}

function formatGeo(geo) {
  if (!geo) return undefined;
  if (typeof geo === 'string') return geo;
  const lat = firstOf(geo.lat, geo.latitude);
  const lon = firstOf(geo.lon, geo.lng, geo.longitude);
  const place = [geo.city, geo.region, geo.country].filter(Boolean).join(', ');
  const coords = lat !== undefined && lon !== undefined ? `${lat}, ${lon}` : '';
  return [place, coords && `(${coords})`].filter(Boolean).join(' ') || undefined;
}

function formatDevice(device) {
  if (!device) return undefined;
  const parts = [
    device.os && `OS: ${device.os}`,
    device.browser && `Browser: ${device.browser}`,
    device.ipAddress && `IP: ${device.ipAddress}`,
  ].filter(Boolean);
  return parts.length ? parts.join(' | ') : undefined;
}

function formatLastLogin(login) {
  if (!login) return undefined;
  if (typeof login === 'string') return login;
  const when = firstOf(login.timestamp, login.at, login.dateTime);
  const where = formatGeo(firstOf(login.geolocation, login.location));
  return [when, where].filter(Boolean).join(' - ') || undefined;
}

/**
 * Derives the fund-flow direction from the ledger record when the source
 * data does not state it explicitly.
 */
function deriveFundFlowDirection(ff) {
  if (!ff) return undefined;
  const explicit = firstOf(ff.direction, ff.fundFlowDirection);
  if (explicit) return explicit;
  const inDeg = ff.inDegree;
  const outDeg = ff.outDegree;
  if (inDeg === null || inDeg === undefined || outDeg === null || outDeg === undefined) return undefined;
  if (outDeg > inDeg) return `Outbound-dominant (in-degree ${inDeg}, out-degree ${outDeg})`;
  if (inDeg > outDeg) return `Inbound-dominant (in-degree ${inDeg}, out-degree ${outDeg})`;
  return `Balanced (in-degree ${inDeg}, out-degree ${outDeg})`;
}

function buildEvidence(record) {
  const rows = [];
  if (record.af) {
    rows.push({
      type: 'Adaptive-Friction payload',
      reference: `af-payload-${record.transactionId}.json`,
      description: 'Device fingerprint, geo-distance from last sign-in, amount versus historical average.',
    });
  }
  if (record.ff) {
    rows.push({
      type: 'Fund-Flow ledger',
      reference: `ff-ledger-${record.transactionId}.csv`,
      description: 'In/out degree, retained balance, total sent, holding time in minutes.',
    });
  }
  if (record.ph) {
    rows.push({
      type: 'Phishing-Site assessment',
      reference: `ph-payload-${record.transactionId}.json`,
      description: 'Domain registration age, TLS certificate quality, blacklist/whitelist status.',
    });
  }
  if (!rows.length) {
    rows.push({ type: NOT_PROVIDED, reference: NOT_PROVIDED, description: 'No source evidence attached to this record.' });
  }
  return rows;
}

/**
 * Builds the risk-assessment rows using the admin's currently active group
 * weights (falling back to the shipped risk_bands.yaml defaults), never
 * hardcoded percentages.
 */
function buildRiskAssessment(scored, config) {
  const groupWeights = (config && config.groupWeights) || {};
  const components = [
    { key: 'AF', label: 'Adaptive-Friction (AF)', subscore: safeGet(scored, ['af', 'subscore'], 0) },
    { key: 'FF', label: 'Fund-Flow (FF)', subscore: safeGet(scored, ['ff', 'subscore'], 0) },
    { key: 'PH', label: 'Phishing-Site (PH)', subscore: safeGet(scored, ['ph', 'subscore'], 0) },
  ];

  const rows = components.map((c) => {
    const weight = Number(groupWeights[c.key] ?? 0);
    return {
      component: c.label,
      subScore: round2(c.subscore),
      weight,
      weightLabel: `${round2(weight * 100)}%`,
      weightedContribution: round2(weight * c.subscore),
    };
  });

  const total = round2(rows.reduce((sum, r) => sum + r.weightedContribution, 0));
  return { rows, total };
}

/**
 * Assembles every field required by the bank's Suspicious Transaction Report
 * template, in template order. Pure data - no formatting/rendering here.
 */
function buildReportModel(record, scored, options = {}) {
  const config = options.config || scoringConfigService.getActiveConfig();
  const generatedAt = options.generatedAt ? new Date(options.generatedAt) : new Date();
  const reportId = options.reportId
    || `STR-${generatedAt.toISOString().slice(0, 10)}-${uuidv4().slice(0, 8).toUpperCase()}`;

  const live = safeGet(record.af, ['liveTransaction'], {}) || {};
  const stored = safeGet(record.af, ['storedProfile'], {}) || {};
  const ff = record.ff || null;

  const amount = firstOf(live.amount, safeGet(record.ff, ['amount']));
  const currency = firstOf(live.currency, safeGet(record.ff, ['currency']));
  const merchant = firstOf(
    typeof live.merchant === 'object' ? safeGet(live.merchant, ['name']) : live.merchant,
    live.merchantName
  );
  const merchantCategory = firstOf(
    typeof live.merchant === 'object' ? safeGet(live.merchant, ['category']) : undefined,
    live.merchantCategory,
    live.mcc
  );

  const riskAssessment = buildRiskAssessment(scored, config);

  return {
    reportId,
    header: {
      reportingInstitution: options.reportingInstitution
        || process.env.REPORTING_INSTITUTION
        || 'UFDE Reporting Institution',
      reportId,
      dateOfReport: generatedAt.toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
      preparedBy: options.preparedBy || 'UFDE Automated Engine',
      contact: options.contact
        || process.env.REPORTING_CONTACT
        || 'compliance@ufde.demo',
    },
    transactionSummary: {
      transactionId: fmt(record.transactionId),
      dateTimeUtc: fmt(firstOf(live.timestamp, live.dateTime, live.transactionTime, safeGet(record.ph, ['submittedAt']))),
      channel: fmt(firstOf(live.channel, live.paymentChannel)),
      amount: amount === undefined ? NOT_PROVIDED : String(amount),
      currency: fmt(currency),
      geolocation: fmt(formatGeo(firstOf(live.geolocation, live.location, live.geo))),
      lastSuccessfulLogin: fmt(
        formatLastLogin(firstOf(stored.lastSuccessfulLogin, live.lastSuccessfulLogin, stored.lastLogin))
      ),
      deviceFingerprint: fmt(formatDevice(live.deviceFingerprint)),
      merchant: fmt(merchant),
      merchantCategory: fmt(merchantCategory),
      beneficiaryKycTier: fmt(
        firstOf(safeGet(record.ff, ['beneficiaryKycTier']), safeGet(live, ['beneficiary', 'kycTier']), live.beneficiaryKycTier)
      ),
      fundFlowDirection: fmt(deriveFundFlowDirection(ff)),
    },
    riskAssessment,
    consolidatedScore: round2(safeGet(scored, ['consolidatedScore'], 0)),
    band: {
      key: safeGet(scored, ['band', 'key'], ''),
      label: safeGet(scored, ['band', 'label'], ''),
    },
    explanations: scored.explanations || [],
    recommendedActions: scored.recommendedActions || [],
    supportingEvidence: buildEvidence(record),
    signOff: {
      analystName: options.analystName || '',
      analystId: options.analystId || '',
      reviewDateTime: options.reviewDateTime || '',
      electronicSignature: options.electronicSignature || '',
    },
  };
}

module.exports = { buildReportModel, NOT_PROVIDED };
