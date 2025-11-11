// src/pages/LysholmTegner.jsx
import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";

import { lysholmQuestions, tegnerQuestion } from "../data/lysholmTegner";
import { computeLysholmScore, interpretLysholm, findTegnerLabel } from "../utils/lysholmTegner";

const allQuestions = [...lysholmQuestions, tegnerQuestion];

function useOwnerId() {
  const { id: pathId } = useParams();
  const [search] = useSearchParams();
  const queryId = search.get("id");
  return decodeURIComponent((pathId ?? queryId ?? "").toString());
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

// ⬇️ NEW: normalizador (acepta objeto {id:valor} o arreglo [{id,value},...])
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

export default function LysholmTegner() {
  const navigate = useNavigate();
  const ownerId = useOwnerId();

  const alertedRef = useRef(false);
  const fetchedRef = useRef(false); // ⬅️ evita doble GET en StrictMode
  const prefilledRef = useRef(false); // ⬅️ NEW: marca si se precargó desde GET
  const autoSubmittedRef = useRef(false); // ⬅️ NEW: evita enviar múltiples veces al terminar

  useEffect(() => {
    if (ownerId && !alertedRef.current) {
      alertedRef.current = true;
    }
  }, [ownerId]);

  useEffect(() => {
    if (!ownerId) {
      navigate("/PRE?from=LYSHOLM-TEGNER", { replace: true });
    }
  }, [ownerId, navigate]);

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [finished, setFinished] = useState(false);

  // ⬇️ NEW: estados de POST
  const [submitting, setSubmitting] = useState(false);
  const [submitOk, setSubmitOk] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // ⬇️ NEW: GET al cargar para precargar respuestas
  useEffect(() => {
    if (!ownerId || fetchedRef.current) return;
    fetchedRef.current = true;

    (async () => {
      try {
        const url = new URL(GET_ENDPOINT);
        url.searchParams.set("id", ownerId);
        url.searchParams.set("type", "LYSHOLM-TEGNER");

        const res = await fetch(url.toString(), { method: "GET" });
        if (!res.ok) return;

        const json = await res.json().catch(() => null);
        const raw = json?.data ?? json?.answers ?? json;

        const normalized = normalizeAnswers(raw);
        if (normalized && Object.keys(normalized).length > 0) {
          setAnswers(normalized);
          prefilledRef.current = true;        // ⬅️ marcamos que viene de GET
          setFinished(true);                  // ⬅️ directo a resultados “como si ya hubiera respondido”
        }
      } catch {
        // Silencioso: si falla, el usuario contesta normal
      }
    })();
  }, [ownerId]);

  const total = allQuestions.length;
  const q = allQuestions[step];

  const setAnswer = (id, val) => {
    setAnswers((prev) => ({ ...prev, [id]: val }));
  };

  const canNext = answers[q?.id] !== undefined;

  const goNext = () => {
    if (step < total - 1) {
      setStep((s) => s + 1);
    } else {
      setFinished(true); // ⬅️ al finalizar se mostrará resultados
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
    autoSubmittedRef.current = false; // ⬅️ reset
    prefilledRef.current = false;     // ⬅️ reset
  };

  // ⬇️ NEW: POST Finalizar
  async function submitResults() {
    if (!ownerId) {
      alert("Falta el parámetro 'id' en la URL.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    setSubmitOk(false);
    try {
      const payload = { id: ownerId, data: answers, type: "LYSHOLM-TEGNER" };
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

  // ⬇️ NEW: Auto-submit al mostrar resultados por haber llegado a la última pregunta
  useEffect(() => {
    if (!finished) return;
    // Evita auto-enviar si las respuestas provinieron de un GET (prefill)
    if (prefilledRef.current) return;
    // Evita múltiples envíos
    if (autoSubmittedRef.current) return;
    // Evita enviar sin ID
    if (!ownerId) return;

    autoSubmittedRef.current = true;
    submitResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished, ownerId]);

  const [showLysFormula, setShowLysFormula] = useState(false);
  const [showTegnerInfo, setShowTegnerInfo] = useState(false);

  function InfoDialogLysholm({ onClose }) {
    return (
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", display: "grid", placeItems: "center", zIndex: 50, padding: 16 }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "100%", maxWidth: 520, background: "#ffffff",
            border: "1px solid #B6DCE7", borderRadius: 16, padding: 16,
            color: "#134669", boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>¿Cómo se calcula Lysholm?</h3>
            <button
              onClick={onClose}
              style={{ border: "1px solid #B6DCE7", background: "#F0F7FA", color: "#134669", borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontWeight: 700 }}
            >
              ×
            </button>
          </div>

          <hr style={{ margin: "12px 0", borderColor: "#E6EEF2" }} />

          <div style={{ lineHeight: 1.55 }}>
            <div><strong>Fórmula:</strong> Suma de ítems (0–100)</div>
            <div style={{ marginTop: 8 }}>
              <strong>Rangos guía:</strong> 84–100 = Muy bueno/Bueno · 65–83 = Regular · &lt; 65 = Malo
            </div>
          </div>

          <div style={{ marginTop: 16, textAlign: "right" }}>
            <button
              onClick={onClose}
              style={{ background: "#134669", color: "#B6DCE7", border: "1px solid #B6DCE7", borderRadius: 12, padding: "8px 14px", cursor: "pointer", fontWeight: 600 }}
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    );
  }

  function InfoDialogTegner({ onClose }) {
    return (
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", display: "grid", placeItems: "center", zIndex: 50, padding: 16 }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "100%", maxWidth: 520, background: "#ffffff",
            border: "1px solid #B6DCE7", borderRadius: 16, padding: 16,
            color: "#134669", boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>¿Qué es la escala de Tegner?</h3>
            <button
              onClick={onClose}
              style={{ border: "1px solid #B6DCE7", background: "#F0F7FA", color: "#134669", borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontWeight: 700 }}
            >
              ×
            </button>
          </div>

          <hr style={{ margin: "12px 0", borderColor: "#E6EEF2" }} />

          <div style={{ lineHeight: 1.55 }}>
            <div>Escala ordinal de <strong>0–10</strong> que refleja el nivel de actividad física/deportiva habitual.</div>
            <div style={{ marginTop: 8 }}>Valores mayores indican actividades más exigentes.</div>
          </div>

          <div style={{ marginTop: 16, textAlign: "right" }}>
            <button
              onClick={onClose}
              style={{ background: "#134669", color: "#B6DCE7", border: "1px solid #B6DCE7", borderRadius: 12, padding: "8px 14px", cursor: "pointer", fontWeight: 600 }}
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (finished) {
    const { score } = computeLysholmScore(answers, lysholmQuestions);
    const tegnerVal = Number(answers["tegner"] ?? 0);
    const tegnerText = findTegnerLabel(tegnerVal, tegnerQuestion);
    const lyBand = score >= 84 ? "A" : score >= 65 ? "B" : "C";

    return (
      <div style={pageWrapperStyle}>
        {showLysFormula && <InfoDialogLysholm onClose={() => setShowLysFormula(false)} />}
        {showTegnerInfo && <InfoDialogTegner onClose={() => setShowTegnerInfo(false)} />}
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
          <div style={{ ...cardStyle, display: "grid", gap: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
                  Resultados Lysholm/Tegner
                </p>
                <h2 style={{ margin: "4px 0 0", color: palette.primary }}>Evaluación funcional</h2>
              </div>
              <button
                onClick={() => setShowLysFormula(true)}
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

            <div style={{ background: "rgba(255,255,255,0.9)", borderRadius: 24, padding: 20, border: "1px solid rgba(19,70,105,0.08)" }}>
              {(() => {
                const pct = Math.max(0, Math.min(100, Number(score ?? 0)));
                const ring = `conic-gradient(#F6A823 ${pct * 3.6}deg, rgba(38,152,170,0.18) 0deg)`;
                return (
                  <div style={{ display: "grid", placeItems: "center", margin: "12px 0" }}>
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
                        <span style={{ fontSize: 52, fontWeight: 800, lineHeight: 1 }}>
                          {score}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div style={{ textAlign: "center", opacity: 0.8, fontSize: 12, color: palette.muted }}>
                Puntuación Lysholm (0–100)
              </div>

              <hr style={{ margin: "16px 0", borderColor: "rgba(19,70,105,0.1)" }} />

              {(() => {
                const baseCell = { padding: "12px 14px", borderTop: "1px solid rgba(19,70,105,0.08)", fontSize: 13 };
                const rowStyle = (tag) => ({
                  background: lyBand === tag ? "linear-gradient(135deg, #1F6DA5, #2E9DD7)" : "rgba(38,152,170,0.06)",
                  color: lyBand === tag ? "#FFFFFF" : palette.primary,
                  fontWeight: lyBand === tag ? 700 : 500,
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
                          <td style={{ ...baseCell, borderTop: "none" }}><strong>84–100</strong></td>
                          <td style={{ ...baseCell, borderTop: "none" }}>Muy bueno / Bueno</td>
                        </tr>
                        <tr style={rowStyle("B")}>
                          <td style={baseCell}><strong>65–83</strong></td>
                          <td style={baseCell}>Regular</td>
                        </tr>
                        <tr style={rowStyle("C")}>
                          <td style={baseCell}><strong>&lt; 65</strong></td>
                          <td style={baseCell}>Malo</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            <div style={{ background: "rgba(255,255,255,0.9)", borderRadius: 24, padding: 20, border: "1px solid rgba(19,70,105,0.08)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0, color: palette.primary }}>Escala de Actividad de Tegner</h3>
                <button
                  onClick={() => setShowTegnerInfo(true)}
                  aria-label="¿Qué es Tegner?"
                  title="¿Qué es Tegner?"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    border: "none",
                    background: "linear-gradient(135deg, #F6A823, #FFD185)",
                    color: palette.primary,
                    cursor: "pointer",
                    fontWeight: 800,
                    fontSize: 18,
                    lineHeight: 1,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 10px 20px rgba(246,168,35,0.25)",
                  }}
                >
                  ?
                </button>
              </div>

              {(() => {
                const pct = Math.max(0, Math.min(100, (tegnerVal / 10) * 100));
                const ring = `conic-gradient(#F6A823 ${pct * 3.6}deg, rgba(38,152,170,0.18) 0deg)`;
                return (
                  <div style={{ display: "grid", placeItems: "center", margin: "12px 0" }}>
                    <div style={{ width: 160, height: 160, borderRadius: "50%", background: ring, display: "grid", placeItems: "center" }}>
                      <div
                        style={{
                          width: 124,
                          height: 124,
                          borderRadius: "50%",
                          background: "#2698AA",
                          color: "#fff",
                          display: "grid",
                          placeItems: "center",
                          boxShadow: "inset 0 0 0 6px rgba(255,255,255,0.14)",
                        }}
                      >
                        <span style={{ fontSize: 40, fontWeight: 800, lineHeight: 1 }}>{tegnerVal}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div style={{ textAlign: "center", opacity: 0.8, fontSize: 12, color: palette.muted }}>
                Nivel Tegner (0–10)
              </div>

              {tegnerText && (
                <div
                  style={{
                    marginTop: 12,
                    padding: "10px 12px",
                    border: "1px solid rgba(19,70,105,0.2)",
                    borderRadius: 16,
                    background: "rgba(38,152,170,0.06)",
                    color: palette.primary,
                    lineHeight: 1.5,
                    fontSize: 13,
                  }}
                >
                  {tegnerText}
                </div>
              )}
            </div>

            <button
              onClick={restart}
              disabled={submitting}
              style={{ ...gradientButton(submitting), width: "100%" }}
            >
              ¿Volver a contestar?
            </button>
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

  // ======= Vista del cuestionario =======
  return (
    <div style={pageWrapperStyle}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
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
              Cuestionario Lysholm & Tegner
            </p>
            <h2 style={{ margin: "4px 0 0", color: palette.primary }}>
              {q.text || q.title}
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
