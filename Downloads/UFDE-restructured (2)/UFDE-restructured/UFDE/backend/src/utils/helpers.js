function clip01(x) {
  if (x === null || x === undefined || Number.isNaN(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function round2(x) {
  return Math.round((x + Number.EPSILON) * 100) / 100;
}

function daysBetween(fromISO, toISO) {
  const from = new Date(fromISO).getTime();
  const to = new Date(toISO).getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) return null;
  return (to - from) / (1000 * 60 * 60 * 24);
}

function safeGet(obj, pathArr, fallback = undefined) {
  let cur = obj;
  for (const key of pathArr) {
    if (cur === null || cur === undefined) return fallback;
    cur = cur[key];
  }
  return cur === undefined ? fallback : cur;
}

module.exports = { clip01, round2, daysBetween, safeGet };
