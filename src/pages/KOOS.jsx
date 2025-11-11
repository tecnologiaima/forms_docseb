// src/pages/KOOS.jsx
import { useMemo, useState, useEffect, useRef } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";

import { KOOS_QUESTIONS, KOOS_OPTIONS_0_4, KOOS_SECTIONS } from "../data/koos";
import { computeKoosScores } from "../utils/koosScore";

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

// ⬇️ NEW: normalizador – acepta objeto {id:valor} o arreglo [{id,value}, ...]
function normalizeAnswers(raw) {
  if (!raw) return {};
  const toNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };

  if (Array.isArray(raw)) {
    const out = {};
    for (const it of raw) {
      if (!it) continue;
      const key = it.id ?? it.qid ?? it.key;
      const val = it.value ?? it.answer ?? it.val;
      if (key != null) {
        const num = toNum(val);
        if (num !== undefined) out[key] = num;
      }
    }
    return out;
  }

  if (typeof raw === "object") {
    const out = {};
    for (const [k, v] of Object.entries(raw)) {
      const num = toNum(v);
      if (num !== undefined) out[k] = num;
    }
    return out;
  }

  return {};
}

// Radio estilo IKDC (tarjeta con borde + resaltado al seleccionar)
function RadioCardList({ name, options, value, onChange }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {options.map((opt, idx) => (
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
            name={name}
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

export default function KOOS() {
  const navigate = useNavigate();
  const ownerId = useOwnerId();

  const alertedRef = useRef(false);
  const fetchedRef = useRef(false);      // evita doble GET en StrictMode
  const preloadedRef = useRef(false);    // marca si los datos vinieron de GET
  const autoPostedRef = useRef(false);   // evita doble POST automático

  useEffect(() => {
    if (ownerId && !alertedRef.current) {
      alertedRef.current = true;
    }
  }, [ownerId]);

  useEffect(() => {
    if (!ownerId) {
      navigate("/PRE?from=KOOS", { replace: true });
    }
  }, [ownerId, navigate]);

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [finished, setFinished] = useState(false);

  // ⬇️ NEW: estados de POST
  const [submitting, setSubmitting] = useState(false);
  const [submitOk, setSubmitOk] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // ⬇️ NEW: GET inicial para precargar
  useEffect(() => {
    if (!ownerId || fetchedRef.current) return;
    fetchedRef.current = true;

    (async () => {
      try {
        const url = new URL(GET_ENDPOINT);
        url.searchParams.set("id", ownerId);
        url.searchParams.set("type", "KOOS");

        const res = await fetch(url.toString(), { method: "GET" });
        if (!res.ok) return; // 404/204: sin datos previos

        const json = await res.json().catch(() => null);
        const raw = json?.data ?? json?.answers ?? json;
        const normalized = normalizeAnswers(raw);

        if (Object.keys(normalized).length > 0) {
          setAnswers(normalized);
          preloadedRef.current = true; // ← viene de servidor
          setFinished(true);           // directo a resultados
        }
      } catch {
        // silencioso: si falla, que el usuario responda normalmente
      }
    })();
  }, [ownerId]);

  const total = KOOS_QUESTIONS.length;
  const q = KOOS_QUESTIONS[step];

  const setAnswer = (id, val) => setAnswers((prev) => ({ ...prev, [id]: val }));
  const canNext = q ? answers[q.id] !== undefined : false;

  const next = () => {
    if (step < total - 1) setStep((s) => s + 1);
    else setFinished(true);
  };
  const prev = () => step > 0 && setStep((s) => s - 1);
  const restart = () => {
    setStep(0);
    setAnswers({});
    setFinished(false);
    setSubmitting(false);
    setSubmitOk(false);
    setSubmitError(null);
    autoPostedRef.current = false;
    preloadedRef.current = false;
  };

  const sectionTitle = KOOS_SECTIONS[q?.section]?.title ?? "";

  const [showKoosInfo, setShowKoosInfo] = useState(false);

  async function submitResults() {
    if (!ownerId) {
      alert("Falta el parámetro 'id' en la URL.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    setSubmitOk(false);
    try {
      const payload = { id: ownerId, data: answers, type: "KOOS" };
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

  // ⬇️ NEW: Auto-submit cuando llegas a resultados (última pregunta)
  useEffect(() => {
    if (finished && !preloadedRef.current && !autoPostedRef.current) {
      autoPostedRef.current = true;
      // no cambiamos el diseño, solo disparamos el envío como si se hubiera pulsado "Finalizar"
      submitResults();
    }
  }, [finished, ownerId, answers]); // dependencias seguras; guardado por refs

  function InfoDialogKoos({ onClose }) {
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
            <h3 style={{ margin: 0 }}>¿Cómo se interpreta KOOS?</h3>
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
            <div>KOOS reporta 5 subescalas: <strong>Síntomas</strong>, <strong>Dolor</strong>, <strong>ADL</strong>, <strong>Deporte/Rec</strong> y <strong>QoL</strong>.</div>
            <div style={{ marginTop: 8 }}><strong>Puntaje 0–100 (↑ mejor):</strong> cada subescala se normaliza; se requiere ≥50% de ítems respondidos para calcularla.</div>
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
    const results = computeKoosScores(answers, KOOS_QUESTIONS);
    const blocks = [
      { key: "symptoms", label: "Síntomas", max: 28 },
      { key: "pain", label: "Dolor", max: 36 },
      { key: "adl", label: "Función — Vida diaria", max: 68 },
      { key: "sport", label: "Función — Deportes/Rec", max: 20 },
      { key: "qol", label: "Calidad de vida", max: 16 },
    ];

    const Ring = ({ value, label, size = 190, inner = 150 }) => {
      const v = Math.round(Math.max(0, Math.min(100, Number(value ?? 0))));
      const ring = `conic-gradient(#F6A823 ${v * 3.6}deg, rgba(38,152,170,0.18) 0deg)`;
      return (
        <>
          <div style={{ display: "grid", placeItems: "center", margin: "12px 0" }}>
            <div style={{ width: size, height: size, borderRadius: "50%", background: ring, display: "grid", placeItems: "center" }}>
              <div
                style={{
                  width: inner,
                  height: inner,
                  borderRadius: "50%",
                  background: "#2698AA",
                  color: "#fff",
                  display: "grid",
                  placeItems: "center",
                  boxShadow: "inset 0 0 0 8px rgba(255,255,255,0.14)",
                }}
              >
                <span style={{ fontSize: 52, fontWeight: 800, lineHeight: 1 }}>{v}</span>
              </div>
            </div>
          </div>
          <div style={{ textAlign: "center", opacity: 0.8, fontSize: 12, color: palette.muted }}>
            {label}
          </div>
        </>
      );
    };

    const tableCell = { padding: "12px 14px", borderTop: "1px solid rgba(19,70,105,0.08)", fontSize: 13 };
    const rowStyle = (isTotal = false) => ({
      background: isTotal ? "linear-gradient(135deg, #1F6DA5, #2E9DD7)" : "rgba(38,152,170,0.06)",
      color: isTotal ? "#FFFFFF" : palette.primary,
      fontWeight: isTotal ? 700 : 500,
    });

    const blockShell = {
      background: "rgba(255,255,255,0.9)",
      borderRadius: 24,
      padding: 20,
      border: "1px solid rgba(19,70,105,0.08)",
      boxShadow: "0 12px 28px rgba(19,70,105,0.12)",
    };

    return (
      <div style={pageWrapperStyle}>
        {showKoosInfo && <InfoDialogKoos onClose={() => setShowKoosInfo(false)} />}
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ ...cardStyle, display: "grid", gap: 20 }}>
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
                Resultados KOOS
              </p>
              <h2 style={{ margin: "4px 0 0", color: palette.primary }}>Salud de rodilla</h2>
            </div>

            <div style={{ display: "grid", gap: 18 }}>
              {blocks.map(({ key, label }) => {
                const r = results[key];
                const denom = 4 * (r?.answered ?? 0);
                const score = Math.round(r?.score ?? 0);

                if (!r?.valid) {
                  return (
                    <div key={key} style={{ ...blockShell, background: "rgba(246,168,35,0.08)", border: "1px solid rgba(246,168,35,0.4)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h3 style={{ margin: 0, color: palette.primary }}>{label}</h3>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#b45309" }}>
                          Incompleto ({r?.answered ?? 0} ítems)
                        </span>
                      </div>
                      <p style={{ fontSize: 12, lineHeight: 1.5, color: palette.primary, marginTop: 10 }}>
                        Se requiere al menos el 50% de las preguntas respondidas para calcular esta subescala.
                      </p>
                    </div>
                  );
                }

                return (
                  <div key={key} style={blockShell}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <h3 style={{ margin: 0, color: palette.primary }}>{label}</h3>
                      <button
                        onClick={() => setShowKoosInfo(true)}
                        aria-label="¿Cómo se interpreta?"
                        title="¿Cómo se interpreta?"
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

                    <Ring value={score} label={`${label} (0–100, ↑ mejor)`} />

                    <div
                      style={{
                        border: "1px solid rgba(19,70,105,0.2)",
                        borderRadius: 20,
                        overflow: "hidden",
                        marginTop: 12,
                      }}
                    >
                      <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                        <tbody>
                          <tr style={rowStyle(false)}>
                            <td style={{ ...tableCell, borderTop: "none" }}><strong>Suma de ítems</strong></td>
                            <td style={{ ...tableCell, borderTop: "none" }}><strong>{r.sum}</strong></td>
                          </tr>
                          <tr style={rowStyle(false)}>
                            <td style={tableCell}><strong>Respondidas</strong></td>
                            <td style={tableCell}>{r.answered}</td>
                          </tr>
                          <tr style={rowStyle(false)}>
                            <td style={tableCell}><strong>Denominador ajustado</strong></td>
                            <td style={tableCell}>{denom}</td>
                          </tr>
                          <tr style={rowStyle(true)}>
                            <td style={tableCell}><strong>Puntaje KOOS</strong></td>
                            <td style={tableCell}><strong>{score}</strong></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>

            <div>
              <button
                onClick={restart}
                disabled={submitting}
                style={{ ...gradientButton(submitting), width: "100%" }}
              >
                ¿Volver a contestar?
              </button>
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

  const sectionInfo = KOOS_SECTIONS[q?.section];

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
              Cuestionario KOOS
            </p>
            <h2 style={{ margin: "4px 0 0", color: palette.primary }}>
              {sectionInfo?.title ?? "Sección"}
            </h2>
            {sectionInfo?.description && (
              <div style={{ fontSize: 13, color: palette.muted, marginTop: 6, lineHeight: 1.4 }}>
                {sectionInfo.description}
              </div>
            )}
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

          <h3 style={{ margin: "0 0 32px 0", lineHeight: 1.4, color: palette.primary }}>{q.text}</h3>

          <RadioCardList
            name={q.id}
            options={KOOS_OPTIONS_0_4}
            value={answers[q.id]}
            onChange={(v) => setAnswer(q.id, v)}
          />

          <div style={{ display: "flex", gap: 12, marginTop: 40, flexWrap: "wrap" }}>
            <button
              onClick={prev}
              disabled={step === 0}
              style={secondaryButton(step === 0)}
            >
              Anterior
            </button>
            <button
              onClick={next}
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
