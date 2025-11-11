// src/pages/WOMAC.jsx
import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { WOMAC_QUESTIONS, WOMAC_OPTIONS, SECTION_HEADINGS } from "../data/womac";
import { computeWomacScores, severityLabel } from "../utils/womacScore";

function useOwnerId() {
  const { id: pathId } = useParams();
  const [search] = useSearchParams();
  const queryId = search.get("id");
  const raw = pathId ?? queryId ?? "";
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

// ⬇️ NEW: endpoints
const ENDPOINT = "https://register-responses-229745866329.northamerica-south1.run.app";
const GET_ENDPOINT = "https://get-responses-229745866329.northamerica-south1.run.app";

// ---------- estilos reutilizables ----------
const palette = {
  primary: "#134669",
  primaryLight: "#2E9DD7",
  surface: "#B6DCE7",
  surfaceAlt: "#E3F0F9",
  textOnPrimary: "#B6DCE7",
  accent: "#F6A823",
  muted: "#5E7579",
  success: "#0E6B3B",
  error: "#8A1F1F",
};

const pageWrapperStyle = {
  minHeight: "100vh",
  padding: "32px 16px 64px",
  background: "linear-gradient(180deg, #2E9DD7 0%, #1F6DA5 100%)",
};

const gradientButton = (disabled = false) => ({
  width: "50%",
  padding: "14px 0",
  borderRadius: 16,
  border: "none",
  cursor: disabled ? "not-allowed" : "pointer",
  fontWeight: 700,
  color: "#FFFFFF",
  background: disabled
    ? "linear-gradient(135deg, #8CAFC4, #5E7D93)"
    : "linear-gradient(135deg, #1F6DA5, #2E9DD7)",
  boxShadow: disabled ? "0 6px 18px rgba(31,109,165,0.15)" : "0 12px 32px rgba(31,109,165,0.35)",
  transition: "opacity .2s, transform .07s",
  opacity: disabled ? 0.6 : 1,
  textAlign: "center",
});

const secondaryButton = (disabled = false) => ({
  width: "50%",
  padding: "14px 0",
  borderRadius: 16,
  border: "1px solid rgba(19,70,105,0.4)",
  background: disabled ? "rgba(255,255,255,0.35)" : "#F4F6FB",
  color: palette.primary,
  cursor: disabled ? "not-allowed" : "pointer",
  fontWeight: 700,
  opacity: disabled ? 0.7 : 1,
  boxShadow: "0 8px 20px rgba(19,70,105,0.12)",
});

const cardStyle = {
  background: palette.surfaceAlt,
  borderRadius: 28,
  padding: "32px 28px",
  boxShadow: "0 24px 55px rgba(19,70,105,0.16)",
  border: "1px solid rgba(19,70,105,0.08)",
};

// ⬇️ NEW: normalizador – acepta objeto {id: valor} o arreglo [{id, value}, ...]
function normalizeAnswers(raw) {
  if (!raw) return {};
  if (Array.isArray(raw)) {
    const out = {};
    for (const it of raw) {
      if (!it) continue;
      const key = it.id ?? it.qid ?? it.key;
      const val = it.value ?? it.answer ?? it.val;
      if (key != null && val != null) {
        const num = Number(val);
        out[key] = Number.isFinite(num) ? num : val;
      }
    }
    return out;
  }
  if (typeof raw === "object") {
    const out = {};
    for (const [k, v] of Object.entries(raw)) {
      const num = Number(v);
      out[k] = Number.isFinite(num) ? num : v;
    }
    return out;
  }
  return {};
}

function RadioGroup({ q, value, onChange }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {WOMAC_OPTIONS.map((opt, idx) => (
        <label
          key={idx}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px",
            border: value === opt.value ? "none" : "1px solid rgba(19,70,105,0.18)",
            background:
              value === opt.value
                ? "linear-gradient(135deg, #1F6DA5, #2E9DD7)"
                : "#F4F6FB",
            color: value === opt.value ? "#FFFFFF" : palette.primary,
            borderRadius: 20,
            cursor: "pointer",
            textAlign: "left",
            gap: 12,
            boxShadow:
              value === opt.value
                ? "0 14px 32px rgba(31,109,165,0.35)"
                : "0 10px 22px rgba(19,70,105,0.08)",
            transition: "transform .08s ease, box-shadow .2s ease",
          }}
        >
          <input
            type="radio"
            name={q.id}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            style={{ display: "none" }}
          />
          <span
            style={{
              color: value === opt.value ? palette.textOnPrimary : palette.primary,
              lineHeight: 1.2,
              flex: 1,
              fontWeight: 600,
            }}
          >
            {opt.label}
          </span>
          <span
            style={{
              opacity: 0.85,
              fontSize: 12,
              color: value === opt.value ? palette.textOnPrimary : palette.muted,
              marginLeft: 4,
              whiteSpace: "nowrap",
              fontWeight: 700,
            }}
          >
            {opt.value} pts
          </span>
        </label>
      ))}
    </div>
  );
}

export default function WOMAC() {
  const navigate = useNavigate();
  const ownerId = useOwnerId();

  const alertedRef = useRef(false);
  const fetchedRef = useRef(false); // ⬅️ evita doble GET en StrictMode

  // ⬇️ NEW: refs para auto-submit al terminar desde el flujo de preguntas
  const autoSubmitArmedRef = useRef(false);
  const autoSubmitDoneRef = useRef(false);

  useEffect(() => {
    if (ownerId && !alertedRef.current) {
      alertedRef.current = true;
    }
  }, [ownerId]);

  useEffect(() => {
    if (!ownerId) {
      navigate("/PRE?from=WOMAC", { replace: true });
    }
  }, [ownerId, navigate]);

  const [step, setStep] = useState(0);          // índice de pregunta
  const [answers, setAnswers] = useState({});   // { [id]: number }
  const [finished, setFinished] = useState(false);

  // ⬇️ estados de POST
  const [submitting, setSubmitting] = useState(false);
  const [submitOk, setSubmitOk] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // ⬇️ GET al cargar – precarga si existen respuestas guardadas
  useEffect(() => {
    if (!ownerId || fetchedRef.current) return;
    fetchedRef.current = true;

    (async () => {
      try {
        const url = new URL(GET_ENDPOINT);
        url.searchParams.set("id", ownerId);
        url.searchParams.set("type", "WOMAC");

        const res = await fetch(url.toString(), { method: "GET" });
        if (!res.ok) return; // 404/204: sin datos previos

        const json = await res.json().catch(() => null);
        const raw = json?.data ?? json?.answers ?? json;

        const normalized = normalizeAnswers(raw);
        if (normalized && Object.keys(normalized).length > 0) {
          setAnswers(normalized);
          setFinished(true); // ⬅️ directo a resultados (no arma auto-submit)
        }
      } catch {
        // Silencioso: si falla, que el usuario responda normalmente
      }
    })();
  }, [ownerId]);

  const total = WOMAC_QUESTIONS.length;
  const q = WOMAC_QUESTIONS[step];

  const setAnswer = (id, val) => setAnswers((prev) => ({ ...prev, [id]: val }));

  const canNext = answers[q?.id] !== undefined;

  const goNext = () => {
    if (step < total - 1) {
      setStep((s) => s + 1);
    } else {
      // Última pregunta → mostrar resultados
      setFinished(true);
      // ⬇️ arma el auto-submit SOLO cuando se llegó a resultados desde el flujo
      autoSubmitArmedRef.current = true;
    }
  };

  const goPrev = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const restart = () => {
    setStep(0);
    setAnswers({});
    setFinished(false);
    setSubmitting(false);
    setSubmitOk(false);
    setSubmitError(null);
    autoSubmitArmedRef.current = false;
    autoSubmitDoneRef.current = false;
  };

  // ⬇️ POST Finalizar – guarda { id, data, type: "WOMAC" }
  async function submitResults() {
    if (!ownerId) {
      alert("Falta el parámetro 'id' en la URL.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    setSubmitOk(false);
    try {
      const payload = { id: ownerId, data: answers, type: "WOMAC" };
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}${text ? ` — ${text}` : ""}`);
      }
      setSubmitOk(true);
    } catch (err) {
      setSubmitError(err?.message || "Error desconocido al enviar.");
    } finally {
      setSubmitting(false);
    }
  }

  // ⬇️ NEW: auto-submit cuando ya se muestran resultados (si viene del flujo)
  useEffect(() => {
    if (
      finished &&
      autoSubmitArmedRef.current &&
      !autoSubmitDoneRef.current &&
      !submitting &&
      !submitOk &&
      ownerId &&
      Object.keys(answers || {}).length > 0
    ) {
      autoSubmitDoneRef.current = true; // evita dobles envíos (StrictMode)
      submitResults();
    }
  }, [finished, submitting, submitOk, ownerId, answers]);

  const [showWomacInfo, setShowWomacInfo] = useState(false);

  function InfoDialogWomac({ onClose }) {
    return (
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.25)",
          display: "grid",
          placeItems: "center",
          zIndex: 50,
          padding: 16,
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "100%",
            maxWidth: 520,
            background: palette.surfaceAlt,
            border: "1px solid rgba(19,70,105,0.12)",
            borderRadius: 24,
            padding: 24,
            color: palette.primary,
            boxShadow: "0 24px 55px rgba(19,70,105,0.16)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>¿Cómo se interpreta WOMAC?</h3>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              style={{
                border: "1px solid rgba(19,70,105,0.2)",
                background: "#F0F7FA",
                color: palette.primary,
                borderRadius: 12,
                padding: "4px 8px",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              ×
            </button>
          </div>

          <hr style={{ margin: "12px 0", borderColor: "#E6EEF2" }} />

          <div style={{ lineHeight: 1.55 }}>
            <div><strong>Rango crudo:</strong> 0 (mejor) a 96 (peor).</div>
            <div style={{ marginTop: 8 }}>
              <strong>Normalización 0–100:</strong> (puntuación / máximo) × 100 — 0 es mejor, 100 es peor.
            </div>
          </div>

          <div style={{ marginTop: 16, textAlign: "right" }}>
            <button
              onClick={onClose}
              style={{
                background: "linear-gradient(135deg, #1F6DA5, #2E9DD7)",
                color: "#FFFFFF",
                border: "none",
                borderRadius: 16,
                padding: "10px 18px",
                cursor: "pointer",
                fontWeight: 700,
                boxShadow: "0 12px 28px rgba(31,109,165,0.35)",
              }}
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (finished) {
    const { scores, normalized, total: totalScore, maxTotal, answered } =
      computeWomacScores(answers, WOMAC_QUESTIONS);

    const sevPain = severityLabel(normalized.pain);
    const sevStiff = severityLabel(normalized.stiffness);
    const sevFunc = severityLabel(normalized.function);
    const sevTotal = severityLabel(normalized.total);

    const normTotal = Math.round(Math.max(0, Math.min(100, normalized.total)));
    const pct = (x) => `${Math.round(Math.max(0, Math.min(100, x)))}`;

    return (
      <div style={pageWrapperStyle}>
        {showWomacInfo && <InfoDialogWomac onClose={() => setShowWomacInfo(false)} />}
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
          <div style={{ ...cardStyle, display: "grid", gap: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    letterSpacing: 0.6,
                    textTransform: "uppercase",
                    color: "rgba(19,70,105,0.7)",
                  }}
                >
                  Resultados WOMAC
                </p>
                <h2 style={{ margin: "4px 0 0", color: palette.primary }}>Índice de osteoartritis</h2>
              </div>
              <button
                onClick={() => setShowWomacInfo(true)}
                aria-label="¿Cómo se interpreta?"
                title="¿Cómo se interpreta?"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  border: "none",
                  background: "linear-gradient(135deg, #F6A823, #FFD185)",
                  color: palette.primary,
                  cursor: "pointer",
                  fontWeight: 800,
                  fontSize: 20,
                  lineHeight: 1,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 12px 24px rgba(246,168,35,0.3)",
                }}
              >
                ?
              </button>
            </div>

            <div style={{ background: "rgba(255,255,255,0.9)", borderRadius: 24, padding: 20, border: "1px solid rgba(19,70,105,0.08)" }}>
              {(() => {
                const ring = `conic-gradient(#F6A823 ${normTotal * 3.6}deg, rgba(38,152,170,0.18) 0deg)`;
                return (
                  <div style={{ display: "grid", placeItems: "center", margin: "12px 0" }}>
                    <div
                      style={{ width: 190, height: 190, borderRadius: "50%", background: ring, display: "grid", placeItems: "center" }}
                    >
                      <div
                        style={{
                          width: 150,
                          height: 150,
                          borderRadius: "50%",
                          background: "#2698AA",
                          color: "#fff",
                          display: "grid",
                          placeItems: "center",
                          boxShadow: "inset 0 0 0 8px rgba(255,255,255,0.14)",
                        }}
                      >
                        <span style={{ fontSize: 52, fontWeight: 800, lineHeight: 1 }}>{normTotal}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div style={{ textAlign: "center", opacity: 0.8, fontSize: 12, color: palette.muted }}>
                WOMAC total normalizado (0–100, ↑ peor)
              </div>

              <hr style={{ margin: "16px 0", borderColor: "rgba(19,70,105,0.1)" }} />

              {(() => {
                const rowStyle = (isTotal = false) => ({
                  background: isTotal ? "linear-gradient(135deg, #1F6DA5, #2E9DD7)" : "rgba(38,152,170,0.06)",
                  color: isTotal ? "#FFFFFF" : palette.primary,
                  fontWeight: isTotal ? 700 : 500,
                });

                return (
                  <div
                    style={{
                      border: "1px solid rgba(19,70,105,0.2)",
                      borderRadius: 20,
                      overflow: "hidden",
                      boxShadow: "0 12px 28px rgba(19,70,105,0.12)",
                    }}
                  >
                    <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                      <tbody>
                        <tr style={rowStyle(false)}>
                          <td style={{ padding: "12px 14px", borderTop: "none" }}><strong>Dolor</strong></td>
                          <td style={{ padding: "12px 14px", borderTop: "none" }}>
                            <strong>{scores.pain}/20</strong> — {pct(normalized.pain)}% · <span style={{ color: sevPain.color }}>{sevPain.label}</span>
                          </td>
                        </tr>
                        <tr style={rowStyle(false)}>
                          <td style={{ padding: "12px 14px" }}><strong>Rigidez</strong></td>
                          <td style={{ padding: "12px 14px" }}>
                            <strong>{scores.stiffness}/8</strong> — {pct(normalized.stiffness)}% · <span style={{ color: sevStiff.color }}>{sevStiff.label}</span>
                          </td>
                        </tr>
                        <tr style={rowStyle(false)}>
                          <td style={{ padding: "12px 14px" }}><strong>Funcionalidad</strong></td>
                          <td style={{ padding: "12px 14px" }}>
                            <strong>{scores.function}/68</strong> — {pct(normalized.function)}% · <span style={{ color: sevFunc.color }}>{sevFunc.label}</span>
                          </td>
                        </tr>
                        <tr style={rowStyle(true)}>
                          <td style={{ padding: "12px 14px" }}><strong>Total</strong></td>
                          <td style={{ padding: "12px 14px" }}>
                            <strong>{totalScore}/{maxTotal}</strong> — {pct(normalized.total)}% · <span style={{ color: sevTotal.color }}>{sevTotal.label}</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                );
              })()}

              <div style={{ marginTop: 12, textAlign: "right", fontSize: 12, color: palette.muted }}>
                Respondidas: {answered}/{WOMAC_QUESTIONS.length}
              </div>

              <div style={{ marginTop: 20 }}>
                <button
                  onClick={restart}
                  disabled={submitting}
                  style={{ ...gradientButton(submitting), width: "100%" }}
                >
                  ¿Volver a contestar?
                </button>
              </div>
            </div>
          </div>

          {submitOk && (
            <div
              style={{
                marginTop: 16,
                padding: 16,
                borderRadius: 20,
                background: "rgba(14,107,59,0.08)",
                border: "1px solid rgba(14,107,59,0.3)",
                color: palette.success,
                fontWeight: 600,
              }}
            >
              ✅ Respuestas enviadas correctamente.
            </div>
          )}
          {submitError && (
            <div
              style={{
                marginTop: 16,
                padding: 16,
                borderRadius: 20,
                background: "rgba(138,31,31,0.08)",
                border: "1px solid rgba(138,31,31,0.3)",
                color: palette.error,
                fontWeight: 600,
              }}
            >
              ❌ Error al enviar: {submitError}
            </div>
          )}

          <details
            style={{
              marginTop: 16,
              background: "rgba(255,255,255,0.85)",
              borderRadius: 18,
              padding: 16,
              color: palette.primary,
              border: "1px solid rgba(19,70,105,0.08)",
            }}
          >
            <summary style={{ cursor: "pointer", fontWeight: 600, marginBottom: 8 }}>Detalles</summary>
            <pre style={{ background: "#FFFFFF", padding: 12, borderRadius: 12, margin: 0 }}>
              {JSON.stringify(answers, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    );
  }

  const sec = SECTION_HEADINGS[q.section];

  return (
    <div style={pageWrapperStyle}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <div style={{ ...cardStyle }}>
          <div style={{ marginBottom: 24 }}>
            <p
              style={{
                margin: 0,
                fontSize: 12,
                letterSpacing: 0.5,
                textTransform: "uppercase",
                color: "rgba(19,70,105,0.7)",
              }}
            >
              Cuestionario WOMAC
            </p>
            <h2 style={{ margin: "4px 0 0", color: palette.primary }}>
              {sec.title}
            </h2>
            <div style={{ fontSize: 13, color: palette.muted, marginTop: 6, lineHeight: 1.4 }}>
              {sec.instruction}
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ height: 14, background: "rgba(19,70,105,0.12)", borderRadius: 999 }}>
              <div
                style={{
                  width: `${((step + 1) / total) * 100}%`,
                  height: "100%",
                  background: "linear-gradient(135deg, #1F6DA5, #2E9DD7)",
                  borderRadius: 999,
                  transition: "width .2s ease",
                  boxShadow: "0 6px 18px rgba(31,109,165,0.3)",
                }}
              />
            </div>
            <div
              style={{
                marginTop: 10,
                fontSize: 13,
                color: palette.muted,
                display: "flex",
                justifyContent: "space-between",
                fontWeight: 600,
              }}
            >
              <span>Pregunta {step + 1} de {total}</span>
              <span>{Math.round(((step + 1) / total) * 100)}%</span>
            </div>
          </div>

          <h3 style={{ lineHeight: 1.4, marginBottom: 32, color: palette.primary }}>
            {(sec.questionPrefix ? `${sec.questionPrefix} ` : "")}{q.text}
          </h3>

          <RadioGroup
            q={q}
            value={answers[q.id]}
            onChange={(v) => setAnswer(q.id, v)}
          />

          <div style={{ display: "flex", gap: 12, marginTop: 40, flexWrap: "wrap" }}>
            <button
              onClick={goPrev}
              disabled={step === 0}
              style={secondaryButton(step === 0)}
            >
              Anterior
            </button>
            <button
              onClick={goNext}
              disabled={!canNext}
              style={gradientButton(!canNext)}
            >
              {step === total - 1 ? "Finalizar" : "Siguiente"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RowScore({ label, value, max, pct, sev, big = false }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontWeight: big ? 700 : 500, fontSize: big ? 18 : 14 }}>{label}</span>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: big ? 28 : 18, fontWeight: 800, color: "#2563eb" }}>
          {value} / {max} <span style={{ fontSize: 12, opacity: 0.7 }}>({pct}%)</span>
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: sev.color, marginTop: 2 }}>
          {sev.label}
        </div>
      </div>
    </div>
  );
}
