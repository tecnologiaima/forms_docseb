// src/utils/koosScore.js

/**
 * Calcula KOOS por subescala con normalización 0–100.
 * Regla de completitud: se requiere ≥50% respondido por subescala.
 * Si hay omisiones, el denominador se ajusta a (4 * respondidas).
 */
export function computeKoosScores(answers, questions) {
  const buckets = { symptoms: [], pain: [], adl: [], sport: [], qol: [] };

  for (const q of questions) {
    const v = answers[q.id];
    if (v !== undefined && v !== null && !Number.isNaN(v)) {
      buckets[q.section].push(Number(v));
    }
  }

  function subscaleScore(arr, maxItems) {
    const answered = arr.length;
    const valid = answered >= Math.ceil(maxItems / 2);
    if (!valid) return { valid: false, sum: 0, score: null, answered };

    const sum = arr.reduce((a, b) => a + b, 0);
    const denom = 4 * answered;
    const score = +(100 - (sum * 100) / denom).toFixed(1); // 1 decimal
    return { valid: true, sum, score, answered };
  }

  return {
    symptoms: subscaleScore(buckets.symptoms, 7),
    pain:     subscaleScore(buckets.pain, 9),
    adl:      subscaleScore(buckets.adl, 17),
    sport:    subscaleScore(buckets.sport, 5),
    qol:      subscaleScore(buckets.qol, 4),
  };
}
