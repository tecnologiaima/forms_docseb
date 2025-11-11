// src/pages/IKS.jsx
import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";

import {
  IKS_PAIN_OPTIONS,
  IKS_STABILITY_AP_OPTIONS,
  IKS_STABILITY_ML_OPTIONS,
  IKS_WALK_OPTIONS,
  IKS_STAIRS_OPTIONS,
  IKS_AIDS_DEDUCTIONS,
} from "../data/iks";
import { computeIksScores } from "../utils/iksScore";

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

const inputStyle = {
  width: "100%",
  padding: "14px 16px",
  border: "1px solid rgba(19,70,105,0.2)",
  borderRadius: 16,
  background: "#FFFFFF",
  color: palette.primary,
  outline: "none",
  fontSize: 15,
  boxSizing: "border-box",
  boxShadow: "0 12px 28px rgba(19,70,105,0.08)",
  transition: "box-shadow .2s ease, border-color .2s ease",
};

// === mismo RadioGroup básico que usaste en IKDC ===
function RadioGroup({ name, options, value, onChange }) {
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

// ⬇️ NEW: utilidades de normalización
function coerceNum(val) {
  if (val === "" || val == null) return undefined;
  const n = Number(val);
  return Number.isFinite(n) ? n : undefined;
}
function coerceBool(val) {
  if (typeof val === "boolean") return val;
  if (val === "true" || val === "1" || val === 1) return true;
  if (val === "false" || val === "0" || val === 0) return false;
  return Boolean(val);
}
function normalizeRaw(raw) {
  // Acepta objeto {id:valor} o arreglo [{id,value}, ...] o el propio objeto de respuestas guardadas
  if (!raw) return {};
  if (Array.isArray(raw)) {
    const out = {};
    for (const it of raw) {
      if (!it) continue;
      const key = it.id ?? it.qid ?? it.key;
      const val = it.value ?? it.answer ?? it.val;
      if (key != null) out[key] = val;
    }
    return out;
  }
  if (typeof raw === "object") return { ...raw };
  return {};
}
function normalizeIksAnswers(rawObj) {
  const s = normalizeRaw(rawObj);

  // Si viene exactamente con nuestras claves, solo coercionamos tipos
  const out = {
    painPts: coerceNum(s.painPts ?? s.pain_points ?? s.pain),
    flexDeg: coerceNum(s.flexDeg ?? s.flex_degrees ?? s.flex),
    apPts: coerceNum(s.apPts ?? s.ap_points ?? s.ap),
    mlPts: coerceNum(s.mlPts ?? s.ml_points ?? s.ml),
    contractureDeg: coerceNum(s.contractureDeg ?? s.contracture_deg ?? s.contracture) ?? 0,
    extDefDeg: coerceNum(s.extDefDeg ?? s.extension_deficit_deg ?? s.extDef) ?? 0,
    alignDegrees: coerceNum(s.alignDegrees ?? s.alignment_deg ?? s.align) ?? 5,
    alignOther: s.alignOther != null ? coerceBool(s.alignOther) : false,
    walkPts: coerceNum(s.walkPts ?? s.walk_points ?? s.walk),
    stairsPts: coerceNum(s.stairsPts ?? s.stairs_points ?? s.stairs),
    aidsDeduction: coerceNum(s.aidsDeduction ?? s.aids_deduction ?? s.aids) ?? 0,
  };

  return out;
}

export default function IKS() {
  const navigate = useNavigate();
  const ownerId = useOwnerId();
  const alertedRef = useRef(false);
  const fetchedRef = useRef(false); // ⬅️ NEW: evitar doble GET en StrictMode
  const autoSubmittedRef = useRef(false); // ⬅️ NEW: evitar doble POST al entrar a resultados

  useEffect(() => {
    if (ownerId && !alertedRef.current) {
      alertedRef.current = true; // evita doble alerta en StrictMode
    }
  }, [ownerId]);

  useEffect(() => {
    if (!ownerId) {
      navigate("/PRE?from=IKS", { replace: true });
    }
  }, [ownerId, navigate]);

  // respuestas “crudas” necesarias para el cómputo
  const [answers, setAnswers] = useState({
    painPts: undefined,     // radio
    flexDeg: undefined,     // número (0–150)
    apPts: undefined,       // radio
    mlPts: undefined,       // radio
    contractureDeg: 0,      // número (grados)
    extDefDeg: 0,           // número (grados)
    alignDegrees: 5,        // número
    alignOther: false,      // “otra” -> -20
    walkPts: undefined,     // radio
    stairsPts: undefined,   // radio
    aidsDeduction: 0,       // radio (deducciones negativas)
  });

  // ⬇️ NEW: estados para POST
  const [submitting, setSubmitting] = useState(false);
  const [submitOk, setSubmitOk] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // ⬇️ NEW: GET inicial para precargar si ya hay respuestas
  useEffect(() => {
    if (!ownerId || fetchedRef.current) return;
    fetchedRef.current = true;

    (async () => {
      try {
        const url = new URL(GET_ENDPOINT);
        url.searchParams.set("id", ownerId);
        url.searchParams.set("type", "IKS");

        const res = await fetch(url.toString(), { method: "GET" });
        if (!res.ok) return; // 404/204: sin datos previos

        const json = await res.json().catch(() => null);
        const raw = json?.data ?? json?.answers ?? json;
        const normalized = normalizeIksAnswers(raw);

        // si hay al menos un valor relevante, llenamos y vamos directo a resultados
        const hasData = Object.values(normalized).some((v) => v !== undefined && v !== null);
        if (hasData) {
          setAnswers((prev) => ({ ...prev, ...normalized }));
          setStep(steps.length - 1); // ⬅️ directo a "Resultados"
        }
      } catch {
        // silencioso: si falla, el usuario puede contestar normalmente
      }
    })();
  }, [ownerId]);

  const steps = [
    { id: "pain", title: "Dolor", render: renderPain },
    { id: "flex", title: "Movilidad (rango de flexión)", render: renderFlex },
    { id: "ap", title: "Estabilidad anteroposterior (laxitud)", render: renderAP },
    { id: "ml", title: "Estabilidad mediolateral (laxitud)", render: renderML },
    { id: "contracture", title: "Deducción: Contractura en flexión (grados)", render: renderContracture },
    { id: "extdef", title: "Deducción: Déficit de extensión activa (grados)", render: renderExtDef },
    { id: "align", title: "Deducción: Alineación anatómica (grados)", render: renderAlignment },
    { id: "walk", title: "Función: Perímetro de marcha", render: renderWalk },
    { id: "stairs", title: "Función: Escaleras", render: renderStairs },
    { id: "aids", title: "Función: Ayudas para la marcha", render: renderAids },
    { id: "review", title: "Resultados", render: renderResults },
  ];

  const [step, setStep] = useState(0);
  const current = steps[step];
  const totalSteps = steps.length - 1; // la última vista es resultados

  const canNext = (() => {
    switch (current.id) {
      case "pain": return typeof answers.painPts === "number";
      case "flex": return typeof answers.flexDeg === "number";
      case "ap": return typeof answers.apPts === "number";
      case "ml": return typeof answers.mlPts === "number";
      case "contracture": return typeof answers.contractureDeg === "number";
      case "extdef": return typeof answers.extDefDeg === "number";
      case "align": return typeof answers.alignDegrees === "number" || answers.alignOther === true;
      case "walk": return typeof answers.walkPts === "number";
      case "stairs": return typeof answers.stairsPts === "number";
      case "aids": return typeof answers.aidsDeduction === "number";
      default: return true;
    }
  })();

  function next() {
    if (step < steps.length - 1) setStep((s) => s + 1);
  }
  function prev() {
    if (step > 0) setStep((s) => s - 1);
  }
  function restart() {
    setStep(0);
    setAnswers({
      painPts: undefined,
      flexDeg: undefined,
      apPts: undefined,
      mlPts: undefined,
      contractureDeg: 0,
      extDefDeg: 0,
      alignDegrees: 5,
      alignOther: false,
      walkPts: undefined,
      stairsPts: undefined,
      aidsDeduction: 0,
    });
    setSubmitting(false);
    setSubmitOk(false);
    setSubmitError(null);
    autoSubmittedRef.current = false; // permitir un nuevo auto-submit en un nuevo flujo
  }

  // ⬇️ NEW: POST Finalizar
  async function submitResults() {
    if (!ownerId) {
      alert("Falta el parámetro 'id' en la URL.");
      return;
    }
    // Evita envíos duplicados
    if (submitting || submitOk) return;

    setSubmitting(true);
    setSubmitError(null);
    setSubmitOk(false);
    try {
      const payload = { id: ownerId, data: answers, type: "IKS" };
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

  // ⬇️ NEW: Auto-submit al entrar a "Resultados" (último paso)
  useEffect(() => {
    const atLast = step === totalSteps;
    if (ownerId && atLast && !autoSubmittedRef.current) {
      autoSubmittedRef.current = true; // protege en StrictMode / re-renders
      submitResults();
    }
  }, [step, totalSteps, ownerId]); // no dependemos de answers para no re-postear si cambian

  // === RENDER STEPS ===

  function renderPain() {
    return (
      <RadioGroup
        name="pain"
        options={IKS_PAIN_OPTIONS}
        value={answers.painPts}
        onChange={(v) => setAnswers((p) => ({ ...p, painPts: v }))}
      />
    );
  }

  function renderFlex() {
    return (
      <div>
        <p style={{ fontSize: 14, opacity: 0.85, marginBottom: 12, color: palette.primary, lineHeight: 1.5 }}>
          Una flexión de <strong style={{ color: palette.primary }}>125°</strong> otorga <strong style={{ color: palette.primary }}>25 pts</strong>.
          Se resta <strong style={{ color: palette.primary }}>1 punto</strong> por cada <strong style={{ color: palette.primary }}>5°</strong> menos.
        </p>

        <input
          type="number"
          min={0}
          max={150}
          value={answers.flexDeg ?? ""}
          placeholder="Grados de flexión (ej. 120)"
          onChange={(e) => setAnswers((p) => ({ ...p, flexDeg: e.target.value === "" ? undefined : Number(e.target.value) }))}
          style={{ ...inputStyle }}
        />
        <style>{`input::placeholder{color:${palette.primary};opacity:.5}`}</style>
      </div>
    );
  }

  function renderAP() {
    return (
      <RadioGroup
        name="ap"
        options={IKS_STABILITY_AP_OPTIONS}
        value={answers.apPts}
        onChange={(v) => setAnswers((p) => ({ ...p, apPts: v }))}
      />
    );
  }

  function renderML() {
    return (
      <RadioGroup
        name="ml"
        options={IKS_STABILITY_ML_OPTIONS}
        value={answers.mlPts}
        onChange={(v) => setAnswers((p) => ({ ...p, mlPts: v }))}
      />
    );
  }

  function renderContracture() {
    return (
      <div>
        <p style={{ fontSize: 14, opacity: 0.85, marginBottom: 12, color: palette.primary, lineHeight: 1.5 }}>
          Rangos: <strong>5–10° = -2</strong> · <strong>11–15° = -5</strong> · <strong>16–20° = -10</strong> · <strong>&gt;20° = -15</strong>
        </p>

        <input
          type="number" min={0} max={60} value={answers.contractureDeg ?? ""}
          placeholder="Grados de contractura (ej. 10)"
          onChange={(e) => setAnswers((p) => ({ ...p, contractureDeg: e.target.value === "" ? undefined : Number(e.target.value) }))}
          style={{ ...inputStyle }}
        />
        <style>{`input::placeholder{color:${palette.primary};opacity:.5}input:focus{border-color:${palette.primaryLight};box-shadow:0 0 0 3px rgba(31,109,165,0.2)}`}</style>
      </div>
    );
  }

  function renderExtDef() {
    return (
      <div>
        <p style={{ fontSize: 14, opacity: 0.85, marginBottom: 12, color: palette.primary, lineHeight: 1.5 }}>
          Rangos: <strong>&lt;10° = -5</strong> · <strong>11–20° = -10</strong> · <strong>&gt;20° = -15</strong>
        </p>

        <input
          type="number" min={0} max={60} value={answers.extDefDeg ?? ""}
          placeholder="Grados de extensión deficiente (ej. 15)"
          onChange={(e) => setAnswers((p) => ({ ...p, extDefDeg: e.target.value === "" ? undefined : Number(e.target.value) }))}
          style={{ ...inputStyle }}
        />
        <style>{`input::placeholder{color:${palette.primary};opacity:.5}input:focus{border-color:${palette.primaryLight};box-shadow:0 0 0 3px rgba(31,109,165,0.2)}`}</style>
      </div>
    );
  }

  function renderAlignment() {
    return (
      <div style={{ display: "grid", gap: 10 }}>
        <label style={{ fontSize: 14, color: palette.primary, opacity: 0.9, lineHeight: 1.4 }}>
          Grados de alineación anatómica (0–15° es rango habitual):
        </label>

        <input
          type="number" min={0} max={40} value={answers.alignDegrees ?? ""}
          placeholder="Ej. 10"
          onChange={(e) => setAnswers((p) => ({ ...p, alignDegrees: e.target.value === "" ? undefined : Number(e.target.value) }))}
          style={{ ...inputStyle }}
        />

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 14px",
            borderRadius: 20,
            border: answers.alignOther ? "none" : "1px solid rgba(19,70,105,0.18)",
            background: answers.alignOther ? "linear-gradient(135deg, #1F6DA5, #2E9DD7)" : "#F4F6FB",
            color: answers.alignOther ? palette.textOnPrimary : palette.primary,
            cursor: "pointer",
            fontWeight: 600,
            boxShadow: answers.alignOther
              ? "0 14px 32px rgba(31,109,165,0.35)"
              : "0 10px 22px rgba(19,70,105,0.08)",
            transition: "transform .08s ease, box-shadow .2s ease",
          }}
        >
          <input
            type="checkbox"
            checked={answers.alignOther}
            onChange={(e) => setAnswers((p) => ({ ...p, alignOther: e.target.checked }))}
            style={{ display: "none" }}
          />
          <span>Otra deformidad anatómica (aplica -20 pts)</span>
        </label>

        <p style={{ fontSize: 12, opacity: 0.75, color: palette.primary, lineHeight: 1.4 }}>
          Deducción: <strong>5–10° → 0</strong> · <strong>0–4° → -3</strong> por grado faltante ·
          <strong> 11–15° → -3</strong> por grado excedente · fuera 0–15° u “Otra” → <strong>-20</strong>
        </p>

        <style>{`input::placeholder{color:${palette.primary};opacity:.5}input[type="number"]:focus{border-color:${palette.primaryLight};box-shadow:0 0 0 3px rgba(31,109,165,0.2)}`}</style>
      </div>
    );
  }

  function renderWalk() {
    return (
      <RadioGroup
        name="walk"
        options={IKS_WALK_OPTIONS}
        value={answers.walkPts}
        onChange={(v) => setAnswers((p) => ({ ...p, walkPts: v }))}
      />
    );
  }

  function renderStairs() {
    return (
      <RadioGroup
        name="stairs"
        options={IKS_STAIRS_OPTIONS}
        value={answers.stairsPts}
        onChange={(v) => setAnswers((p) => ({ ...p, stairsPts: v }))}
      />
    );
  }

  function renderAids() {
    return (
      <RadioGroup
        name="aids"
        options={IKS_AIDS_DEDUCTIONS}
        value={answers.aidsDeduction}
        onChange={(v) => setAnswers((p) => ({ ...p, aidsDeduction: v }))}
      />
    );
  }

  const [showIksInfo, setShowIksInfo] = useState(false);

  function InfoDialogIks({ onClose }) {
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
            <h3 style={{ margin: 0 }}>¿Cómo se interpreta IKS/KSS?</h3>
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
            <div><strong>Rodilla (0–100):</strong> combina dolor, movilidad (flexión) y estabilidad (AP/ML), con deducciones por contractura, déficit de extensión y alineación.</div>
            <div style={{ marginTop: 8 }}><strong>Función (0–100):</strong> considera perímetro de marcha y escaleras, con deducción por ayudas para deambular.</div>
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

  function renderResults() {
    const input = {
      painPts: answers.painPts,
      flexDeg: answers.flexDeg,
      apPts: answers.apPts,
      mlPts: answers.mlPts,
      contractureDeg: answers.contractureDeg,
      extDefDeg: answers.extDefDeg,
      align: { degrees: answers.alignDegrees, other: answers.alignOther },
      walkPts: answers.walkPts,
      stairsPts: answers.stairsPts,
      aidsDeduction: answers.aidsDeduction,
    };

    const r = computeIksScores(input);
    const alignLabel = answers.alignOther ? "Otra" : `${answers.alignDegrees ?? 0}°`;

    const baseCell = { padding: "12px 14px", borderTop: "1px solid rgba(19,70,105,0.08)", fontSize: 13 };
    const rowStyle = (isTotal = false) => ({
      background: isTotal ? "linear-gradient(135deg, #1F6DA5, #2E9DD7)" : "rgba(38,152,170,0.06)",
      color: isTotal ? "#FFFFFF" : palette.primary,
      fontWeight: isTotal ? 700 : 500,
    });

    const Ring = ({ value, size = 190, inner = 150, label }) => {
      const v = Math.max(0, Math.min(100, Number(value ?? 0)));
      const ring = `conic-gradient(#F6A823 ${v * 3.6}deg, rgba(38,152,170,0.18) 0deg)`;
      return (
        <>
          <div style={{ display: "grid", placeItems: "center", margin: "12px 0 4px" }}>
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
          <div style={{ textAlign: "center", opacity: 0.8, fontSize: 12, color: palette.muted, marginTop: 6 }}>
            {label}
          </div>
        </>
      );
    };

    return (
      <div style={{ display: "grid", gap: 16 }}>
        {showIksInfo && <InfoDialogIks onClose={() => setShowIksInfo(false)} />}

        <div style={{ ...cardStyle, display: "grid", gap: 28 }}>
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
                Resultados IKS/KSS
              </p>
              <h2 style={{ margin: "4px 0 0", color: palette.primary }}>Resumen clínico</h2>
            </div>
            <button
              onClick={() => setShowIksInfo(true)}
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

          <div style={{ display: "grid", gap: 24 }}>
            <div style={{ background: "rgba(255,255,255,0.9)", borderRadius: 24, padding: 20, border: "1px solid rgba(19,70,105,0.08)" }}>
              <Ring value={r.kneeScore} label="Puntuación de la rodilla (0–100)" />
              <hr style={{ margin: "16px 0", borderColor: "rgba(19,70,105,0.08)" }} />
              <h3 style={{ margin: "0 0 12px", color: palette.primary }}>Desglose de la rodilla</h3>
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
                      <td style={{ ...baseCell, borderTop: "none" }}><strong>Dolor</strong></td>
                      <td style={{ ...baseCell, borderTop: "none" }}><strong>{answers.painPts ?? 0} pts</strong></td>
                    </tr>
                    <tr style={rowStyle(false)}>
                      <td style={baseCell}><strong>Movilidad</strong></td>
                      <td style={baseCell}><strong>{r.mobilityPts} pts</strong> — flexión: {answers.flexDeg ?? 0}°</td>
                    </tr>
                    <tr style={rowStyle(false)}>
                      <td style={baseCell}><strong>Estabilidad</strong></td>
                      <td style={baseCell}><strong>{r.stabilityPts} pts</strong> — AP: {answers.apPts ?? 0} · ML: {answers.mlPts ?? 0}</td>
                    </tr>
                    <tr style={rowStyle(false)}>
                      <td style={baseCell}><strong>Deducciones</strong></td>
                      <td style={baseCell}><strong>{r.kneeDeductions} pts</strong> — Contractura: {answers.contractureDeg ?? 0}°, Extensión: {answers.extDefDeg ?? 0}°, Alineación: {alignLabel}</td>
                    </tr>
                    <tr style={rowStyle(true)}>
                      <td style={baseCell}><strong>Puntuación de la rodilla</strong></td>
                      <td style={baseCell}><strong>{r.kneeScore} / 100</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.9)", borderRadius: 24, padding: 20, border: "1px solid rgba(19,70,105,0.08)" }}>
              <Ring value={r.functionScore} label="Puntuación de la función (0–100)" />
              <hr style={{ margin: "16px 0", borderColor: "rgba(19,70,105,0.08)" }} />
              <h3 style={{ margin: "0 0 12px", color: palette.primary }}>Desglose de la función</h3>
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
                      <td style={{ ...baseCell, borderTop: "none" }}><strong>Perímetro de marcha</strong></td>
                      <td style={{ ...baseCell, borderTop: "none" }}><strong>{answers.walkPts ?? 0} pts</strong></td>
                    </tr>
                    <tr style={rowStyle(false)}>
                      <td style={baseCell}><strong>Escaleras</strong></td>
                      <td style={baseCell}><strong>{answers.stairsPts ?? 0} pts</strong></td>
                    </tr>
                    <tr style={rowStyle(false)}>
                      <td style={baseCell}><strong>Deducción por ayudas</strong></td>
                      <td style={baseCell}><strong>{answers.aidsDeduction ?? 0} pts</strong></td>
                    </tr>
                    <tr style={rowStyle(true)}>
                      <td style={baseCell}><strong>Puntuación de la función</strong></td>
                      <td style={baseCell}><strong>{r.functionScore} / 100</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 8 }}>
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
              marginTop: 4,
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
              marginTop: 4,
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
    );
  }


  const isReview = current.id === "review";

  return (
    <div style={pageWrapperStyle}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        {isReview ? (
          renderResults()
        ) : (
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
                Cuestionario IKS/KSS
              </p>
              <h2 style={{ margin: "4px 0 0", color: palette.primary, lineHeight: 1.2 }}>
                {current.title}
              </h2>
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ height: 14, background: "rgba(19,70,105,0.12)", borderRadius: 999 }}>
                <div
                  style={{
                    width: `${(Math.min(step + 1, totalSteps) / totalSteps) * 100}%`,
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
                <span>Pregunta {Math.min(step + 1, totalSteps)} de {totalSteps}</span>
                <span>{Math.round((Math.min(step + 1, totalSteps) / totalSteps) * 100)}%</span>
              </div>
            </div>

            <div style={{ marginBottom: 28, color: palette.primary, lineHeight: 1.4 }}>
              {current.render()}
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 36, flexWrap: "wrap" }}>
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
                {step === totalSteps ? "Finalizar" : "Siguiente"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
