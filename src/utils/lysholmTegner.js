// src/utils/lysholmTegner.js

export function computeLysholmScore(answers, lysholmQuestions) {
  const answered = lysholmQuestions.filter(q => answers[q.id] !== undefined);
  const sum = answered.reduce((acc, q) => acc + Number(answers[q.id] || 0), 0);
  // Lysholm máx = 100 por definición de opciones
  return { score: sum, max: 100, answeredCount: answered.length };
}

export function interpretLysholm(score) {
  if (score >= 84) return { label: "Muy bueno / Bueno", color: "#16a34a" }; // verde
  if (score >= 65) return { label: "Regular", color: "#ca8a04" }; // ámbar
  return { label: "Malo", color: "#dc2626" }; // rojo
}

export function findTegnerLabel(tegnerValue, tegnerQuestion) {
  const opt = (tegnerQuestion?.options || []).find(o => o.value === tegnerValue);
  return opt?.label || "";
}
