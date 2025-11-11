// src/pages/IKDC.jsx
import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";

import { ikdcQuestions } from "../data/ikdcQuestions";
import { computeIkdcScore } from "../utils/ikdcScore";

function useOwnerId() {
  const { id: pathId } = useParams();
  const [search] = useSearchParams();
  const queryId = search.get("id");
  return decodeURIComponent(pathId ?? queryId ?? "");
}

const ENDPOINT = "https://register-responses-229745866329.northamerica-south1.run.app";
const GET_ENDPOINT = "https://get-responses-229745866329.northamerica-south1.run.app";

// ---------- estilos reutilizables ----------
const palette = {
  primary: "#134669",
  primaryLight: "#2E9DD7",
  surface: "#B6DCE7",
  surfaceAlt: "#E3F0F9",
  textOnPrimary: "#B6DCE7",
  textOnSurface: "#134669",
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

// ---------- componentes de UI ----------
function Scale10({ q, value, onChange }) {
  const percentage =
    (((value ?? 0) - (q.min ?? 0)) / ((q.max ?? 10) - (q.min ?? 0))) * 100;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          marginBottom: 12,
          color: palette.primary,
          fontWeight: 600,
        }}
      >
        <span>{q.minLabel || `${q.min ?? 0}`}</span>
        <span>{q.maxLabel || `${q.max ?? 10}`}</span>
      </div>

      <div
        style={{
          background: "rgba(19,70,105,0.08)",
          borderRadius: 999,
          padding: "12px 16px",
          boxShadow: "inset 0 6px 18px rgba(19,70,105,0.12)",
        }}
      >
        <input
          type="range"
          min={q.min ?? 0}
          max={q.max ?? 10}
          value={value ?? ""}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            width: "100%",
            height: 8,
            borderRadius: 999,
            outline: "none",
            cursor: "pointer",
            WebkitAppearance: "none",
            background: `linear-gradient(to right, #1F6DA5 ${Math.max(
              0,
              Math.min(100, percentage)
            )}%, rgba(31,109,165,0.1) ${Math.max(0, Math.min(100, percentage))}%)`,
            boxShadow: "0 6px 12px rgba(19,70,105,0.25)",
          }}
        />
      </div>

      <div
        style={{
          marginTop: 12,
          fontSize: 24,
          color: palette.primary,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "6px 18px",
          borderRadius: 16,
          background: "#FFFFFF",
          border: "1px solid rgba(19,70,105,0.1)",
          boxShadow: "0 8px 20px rgba(19,70,105,0.12)",
        }}
      >
        <strong>{value ?? "-"}</strong>
      </div>

      <style>
        {`
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: linear-gradient(135deg,#1F6DA5,#2E9DD7);
            border: 2px solid #FFFFFF;
            box-shadow: 0 4px 10px rgba(25,87,129,0.35);
            cursor: pointer;
          }
          input[type="range"]::-moz-range-thumb {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: linear-gradient(135deg,#1F6DA5,#2E9DD7);
            border: 2px solid #FFFFFF;
            box-shadow: 0 4px 10px rgba(25,87,129,0.35);
            cursor: pointer;
          }
        `}
      </style>
    </div>
  );
}

function RadioGroup({ q, value, onChange }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {q.options.map((opt, idx) => (
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
              lineHeight: 1.2,
              flex: 1,
              color: value === opt.value ? palette.textOnPrimary : palette.primary,
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

// Normalizador de respuestas (acepta objeto {id: valor} o arreglo [{id, value}, ...])
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

export default function IKDC() {
  const navigate = useNavigate();
  const ownerId = useOwnerId();

  // Evitar dobles efectos en StrictMode
  const fetchedRef = useRef(false);
  const autoSubmitGuardRef = useRef(false);
  const shouldAutoSubmitRef = useRef(false);

  // Estado base
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [finished, setFinished] = useState(false);

  // Envío
  const [submitting, setSubmitting] = useState(false);
  const [submitOk, setSubmitOk] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // UI extra
  const [showFormula, setShowFormula] = useState(false);

  // Redirigir si no hay id
  useEffect(() => {
    if (!ownerId) {
      navigate("/pre?from=IKDC", { replace: true });
    }
  }, [ownerId, navigate]);

  // Carga de respuestas existentes (GET)
  useEffect(() => {
    if (!ownerId || fetchedRef.current) return;
    fetchedRef.current = true;
    (async () => {
      try {
        const url = new URL(GET_ENDPOINT);
        url.searchParams.set("id", ownerId);
        url.searchParams.set("type", "IKDC");
        const res = await fetch(url.toString(), { method: "GET", mode: "cors" });
        if (!res.ok) return; // si 404/204, simplemente no hace nada
        const json = await res.json().catch(() => null);
        const raw = json?.data ?? json?.answers ?? json;
        const normalized = normalizeAnswers(raw);
        if (normalized && Object.keys(normalized).length > 0) {
          setAnswers(normalized);
          setFinished(true); // directo a resultados si ya existen
        }
      } catch {
        // Silencioso: si falla la carga, el usuario puede contestar normalmente
      }
    })();
  }, [ownerId]);

  async function submitResults() {
    if (!ownerId) {
      alert("Falta el parámetro 'id' en la URL.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    setSubmitOk(false);
    try {
      const payload = { id: ownerId, data: answers, type: "IKDC" };
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
        mode: "cors",
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

  // Auto-submit cuando se llega a resultados por el flujo normal
  useEffect(() => {
    if (!finished) return;
    if (!shouldAutoSubmitRef.current) return;    // no auto-submit si venimos de GET previo
    if (autoSubmitGuardRef.current) return;      // evita dobles en StrictMode
    if (submitting || submitOk) return;

    const r = computeIkdcScore(answers, ikdcQuestions);
    if (!r.valid) return;

    autoSubmitGuardRef.current = true;
    submitResults().finally(() => {
      // mantener el guard activado para esta sesión
    });
  }, [finished, answers, submitting, submitOk]);

  const total = ikdcQuestions.length;
  const q = ikdcQuestions[step];

  const setAnswer = (id, val) => {
    setAnswers((prev) => ({ ...prev, [id]: val }));
  };

  const canNext = q ? answers[q.id] !== undefined : false;

  const goNext = () => {
    if (step < total - 1) {
      setStep((s) => s + 1);
    } else {
      shouldAutoSubmitRef.current = true;
      setFinished(true);
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
    shouldAutoSubmitRef.current = false;
    autoSubmitGuardRef.current = false;
  };

  function InfoDialog({ onClose }) {
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
            <h3 style={{ margin: 0 }}>¿Cómo se calcula el puntaje IKDC?</h3>
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
            <div><strong>Fórmula:</strong> (Suma de puntos / Máximo posible) × 100</div>
            <div style={{ marginTop: 8 }}>
              El cuestionario es válido cuando respondes al menos <strong>16 de 18</strong> preguntas puntuables.
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

  // ---------- render ----------
  if (finished) {
    const result = computeIkdcScore(answers, ikdcQuestions);

    return (
      <div style={pageWrapperStyle}>
        {showFormula && <InfoDialog onClose={() => setShowFormula(false)} />}
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
          <div style={{ ...cardStyle, position: "relative", overflow: "hidden" }}>
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
                  Resultados listos
                </p>
                <h2 style={{ margin: "4px 0 0", color: palette.primary }}>Cuestionario IKDC</h2>
              </div>
              <button
                onClick={() => setShowFormula(true)}
                aria-label="¿Cómo se calcula?"
                title="¿Cómo se calcula?"
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

            {!result.valid ? (
              <div
                style={{
                  marginTop: 24,
                  padding: 20,
                  borderRadius: 24,
                  background: "#FFF6F6",
                  border: "1px solid rgba(138,31,31,0.25)",
                  color: palette.error,
                  lineHeight: 1.5,
                }}
              >
                <p style={{ margin: 0 }}>
                  <strong>Cálculo incompleto:</strong> Debe responder al menos 16 de 18 preguntas puntuables.
                </p>
                <p style={{ margin: "8px 0 0" }}>Respondidas válidas: {result.answered} / 18</p>
              </div>
            ) : (
              <>
                {(() => {
                  const s = Number(result.score ?? 0);
                  const pct = Math.max(0, Math.min(100, s));
                  const ring = `conic-gradient(#F6A823 ${pct * 3.6}deg, rgba(38,152,170,0.14) 0deg)`;
                  return (
                    <div style={{ display: "grid", placeItems: "center", margin: "24px 0 12px" }}>
                      <div
                        style={{
                          width: 190,
                          height: 190,
                          borderRadius: "50%",
                          background: ring,
                          display: "grid",
                          placeItems: "center",
                        }}
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
                          <span style={{ fontSize: 52, fontWeight: 800, lineHeight: 1 }}>{result.score}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div
                  style={{
                    textAlign: "center",
                    fontSize: 13,
                    color: palette.muted,
                    marginBottom: 12,
                    letterSpacing: 0.3,
                  }}
                >
                  Puntaje IKDC (0–100)
                </div>

                <hr style={{ margin: "12px 0 18px", borderColor: "rgba(19,70,105,0.1)" }} />

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 12,
                  }}
                >
                  <h3 style={{ margin: 0, color: palette.primary }}>Interpretación rápida</h3>
                </div>

                {(() => {
                  const s = Number(result.score ?? 0);
                  const band = s >= 90 ? "A" : s >= 70 ? "B" : s >= 50 ? "C" : "D";
                  const baseCell = {
                    padding: "12px 14px",
                    borderTop: "1px solid rgba(19,70,105,0.08)",
                    fontSize: 13,
                  };
                  const rowStyle = (tag) => ({
                    background:
                      band === tag
                        ? "linear-gradient(135deg, #1F6DA5, #2E9DD7)"
                        : "rgba(38,152,170,0.06)",
                    color: band === tag ? "#FFFFFF" : palette.primary,
                    fontWeight: band === tag ? 700 : 500,
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
                          <tr style={rowStyle("A")}>
                            <td style={{ ...baseCell, borderTop: "none" }}><strong>90–100</strong></td>
                            <td style={{ ...baseCell, borderTop: "none" }}>Excelente — función óptima, sin limitaciones</td>
                          </tr>
                          <tr style={rowStyle("B")}>
                            <td style={baseCell}><strong>70–89</strong></td>
                            <td style={baseCell}>Buena — limitaciones mínimas</td>
                          </tr>
                          <tr style={rowStyle("C")}>
                            <td style={baseCell}><strong>50–69</strong></td>
                            <td style={baseCell}>Moderada — limitaciones moderadas, dar seguimiento</td>
                          </tr>
                          <tr style={rowStyle("D")}>
                            <td style={baseCell}><strong>&lt; 50</strong></td>
                            <td style={baseCell}>Baja — limitación significativa; consultar profesional</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  );
                })()}

                <div style={{ marginTop: 24 }}>
                  <button
                    onClick={restart}
                    disabled={submitting}
                    style={{ ...gradientButton(submitting), width: "100%" }}
                  >
                    ¿Volver a contestar?
                  </button>
                </div>
              </>
            )}
          </div>

          {/* estado de envío al backend */}
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
              background: "rgba(255,255,255,0.8)",
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

  // ---- Pantalla de preguntas ----
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
              Cuestionario IKDC
            </p>
            <h2 style={{ margin: "4px 0 0", color: palette.primary, lineHeight: 1.2 }}>
              Autoevaluación de rodilla
            </h2>
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

          <h3 style={{ marginTop: 4, lineHeight: 1.4, marginBottom: 28, color: palette.primary }}>
            {q.text}
          </h3>

          {q.type === "radio" && (
            <RadioGroup
              q={q}
              value={answers[q.id]}
              onChange={(v) => setAnswer(q.id, v)}
            />
          )}

          {q.type === "scale10" && (
            <Scale10
              q={q}
              value={answers[q.id]}
              onChange={(v) => setAnswer(q.id, v)}
            />
          )}

          <div style={{ display: "flex", gap: 16, marginTop: 36, flexWrap: "nowrap" }}>
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
