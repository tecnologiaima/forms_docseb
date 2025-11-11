// src/pages/PreIntake.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import logoImage from "../assets/logo.jpg";

const ENDPOINT = "https://register-responses-229745866329.northamerica-south1.run.app";
const REDIRECTABLE_FROM = new Set(["IKDC", "IKS", "WOMAC", "KOOS", "LYSHOLM-TEGNER"]);

/**
 * Uso:
 * <PreIntake onDone={(data) => console.log(data)} />
 *
 * También puedes leer luego:
 * const data = getPreIntake(); // desde localStorage
 */

export function getPreIntake() {
    try {
        const raw = localStorage.getItem("preIntake");
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function clearPreIntake() {
    localStorage.removeItem("preIntake");
}

function emailToId(email = "") {
    const clean = email.trim();
    if (!clean) return "";
    const at = clean.indexOf("@");
    return (at === -1 ? clean : clean.slice(0, at)).trim();
}

async function sendPreIntake(payloadForm) {
    const id = emailToId(payloadForm?.email ?? "");
    if (!id) throw new Error("No se pudo leer el correo para guardar.");

    const payload = { id, data: payloadForm, type: "general" };
    const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Error HTTP ${res.status}`);
    }

    return id;
}

async function checkEmailExists(email) {
    const cleanEmail = email?.trim();
    if (!cleanEmail) throw new Error("Ingresa un correo válido.");

    const res = await fetch("https://search-email-229745866329.northamerica-south1.run.app", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Error HTTP ${res.status}`);
    }

    const data = await res.json().catch(() => null);
    if (!data || typeof data.search !== "boolean") {
        throw new Error("Respuesta inválida del servicio de búsqueda.");
    }

    return data.search;
}

export default function PreIntake({ onDone }) {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const fromParamRaw = searchParams.get("from");
    const fromParam = fromParamRaw ? fromParamRaw.toUpperCase() : "";
    const redirectTarget = REDIRECTABLE_FROM.has(fromParam) ? fromParam : "";
    const redirectTimeoutRef = useRef(null);
    const [step, setStep] = useState(0);
    const [form, setForm] = useState({
        name: "",
        email: "",
        sex: "",
        birthdate: "",
        hasSurgery: false,
        surgeryYears: "",
        surgeryMonths: "",
    });
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [submitFeedback, setSubmitFeedback] = useState(null);

    useEffect(() => {
        return () => {
            if (redirectTimeoutRef.current) {
                clearTimeout(redirectTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const saved = getPreIntake();
        if (saved) setForm((p) => ({ ...p, ...saved }));
    }, []);

    // Paleta (mismo look & feel)
    const palette = {
        primary: "#134669",
        surface: "#B6DCE7",
        surfaceAlt: "#E5F2F7",
        textOnPrimary: "#B6DCE7",
        textOnSurface: "#134669",
        error: "#8A1F1F",
    };

    const focusRing = (ok = true) =>
        ok
            ? `0 0 0 3px rgba(19,70,105,.15), 0 2px 8px rgba(19,70,105,.2)`
            : `0 0 0 3px rgba(138,31,31,.15), 0 2px 8px rgba(138,31,31,.2)`;

    const inputStyle = (invalid = false) => ({
        width: "100%",
        padding: "14px 16px",
        border: `1px solid ${invalid ? palette.error : "rgba(19,70,105,0.2)"}`,
        borderRadius: 16,
        background: "#FFFFFF",
        color: palette.textOnSurface,
        outline: "none",
        fontSize: 15,
        boxSizing: "border-box",
        transition: "box-shadow .2s ease, border-color .2s ease",
        textAlign: "left",
        boxShadow: invalid ? "0 10px 25px rgba(138,31,31,0.15)" : "0 12px 28px rgba(19,70,105,0.08)",
    });

    const labelStyle = {
        fontWeight: 700,
        color: palette.textOnSurface,
        marginBottom: 6,
        display: "block",
        lineHeight: 1.2,
        textAlign: "left",
    };

    const helpStyle = { fontSize: 12, opacity: 0.8, lineHeight: 1.0, color: palette.textOnSurface, marginTop: 12, textAlign: "left" };
    const errorStyle = { color: palette.error, fontSize: 12, marginTop: 6, textAlign: "left" };

    // ===== Lógica =====
    function setField(k, v) {
        setForm((p) => {
            const next = { ...p, [k]: v };
            if (k === "hasSurgery" && !v) {
                next.surgeryYears = "";
                next.surgeryMonths = "";
            }
            return next;
        });
    }

    function validate(currentStep = step, nextForm = form) {
        const f = nextForm;
        const e = {};
        if (currentStep === 0) {
            if (!f.name?.trim()) e.name = "El nombre es requerido.";
            if (!f.email?.trim()) e.email = "El correo es requerido.";
            else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email))
                e.email = "Formato de correo inválido.";
        } else if (currentStep === 1) {
            if (!f.sex) e.sex = "Selecciona una opción.";
            if (!f.birthdate) e.birthdate = "La fecha de nacimiento es requerida.";
            if (f.hasSurgery) {
                const y = Number(f.surgeryYears ?? 0);
                const m = Number(f.surgeryMonths ?? 0);
                if (!Number.isFinite(y) || y < 0 || y > 12) e.surgeryYears = "0–12";
                if (!Number.isFinite(m) || m < 0 || m > 11) e.surgeryMonths = "0–11";
                if (y === 0 && m === 0) e.surgeryMonths = "Indica años/meses > 0";
            }
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    }

    async function goNext() {
        if (!validate(0)) return;
        try {
            const found = await checkEmailExists(form.email);
            if (found) {
                const existingId = emailToId(form.email);
                const destination =
                    redirectTarget && existingId ? `/${redirectTarget}/${encodeURIComponent(existingId)}` : "/";
                navigate(destination, { replace: true });
                return;
            }
        } catch (err) {
            alert(err?.message || "No se pudo verificar el correo.");
            return;
        }
        setStep(1);
    }

    function goBack() {
        setStep(0);
    }

    async function finish() {
        if (submitting) return;
        if (!validate(1)) return;
        localStorage.setItem("preIntake", JSON.stringify(form));
        setSubmitting(true);
        setSubmitFeedback(null);
        try {
            const savedId = await sendPreIntake(form);
            const destination =
                redirectTarget && savedId ? `/${redirectTarget}/${encodeURIComponent(savedId)}` : "/";
            const successMessage = redirectTarget
                ? `Datos enviados. Preparando tu cuestionario ${redirectTarget}...`
                : "Datos enviados correctamente. Redirigiendo...";
            setSubmitFeedback({ type: "success", message: successMessage });
            if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current);
            redirectTimeoutRef.current = setTimeout(() => navigate(destination), 1400);
        } catch (err) {
            setSubmitFeedback({ type: "error", message: err?.message || "No se pudo enviar. Intenta nuevamente." });
        } finally {
            setSubmitting(false);
        }
        if (typeof onDone === "function") onDone(form);
    }

    // Enter global
    useEffect(() => {
        const handler = (e) => {
            if (e.key === "Enter") {
                if (step === 0) goNext();
                else finish();
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
        // eslint-disable-next-line
    }, [step, form]);

    // Edad calculada
    const ageText = useMemo(() => {
        if (!form.birthdate) return "";
        const today = new Date();
        const bd = new Date(form.birthdate);
        if (isNaN(bd.getTime())) return "";
        let age = today.getFullYear() - bd.getFullYear();
        const m = today.getMonth() - bd.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--;
        if (age < 0 || age > 120) return "";
        return `${age} años`;
    }, [form.birthdate]);

    // Estados de botones
    const canNext = useMemo(() => validate(0, { ...form }), [form.name, form.email]); // eslint-disable-line
    const canFinish = useMemo(
        () => validate(1, { ...form }),
        [form.sex, form.birthdate, form.hasSurgery, form.surgeryYears, form.surgeryMonths] // eslint-disable-line
    );

    const gradientBtn = (disabled = false) => ({
        width: "100%",
        padding: "14px 0",
        borderRadius: 16,
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        fontWeight: 700,
        color: "#FFFFFF",
        background: disabled
            ? "linear-gradient(135deg, #8CAFC4, #5E7D93)"
            : "linear-gradient(135deg, #1F6DA5, #2E9DD7)",
        boxShadow: "0 10px 25px rgba(31,109,165,0.35)",
        transition: "opacity .2s, transform .07s",
        opacity: disabled ? 0.6 : 1,
        textAlign: "center",
    });

    const cardStyle = {
        background: "#e3f0f9ff",
        borderRadius: 28,
        padding: "28px 22px",
        boxShadow: "0 24px 55px rgba(19,70,105,0.16)",
    };

    // ===== UI (alineado a la izquierda, texto de botones centrado, con padding horizontal de 32px) =====
    return (
        <div
            style={{
                minHeight: "100vh",
                padding: "24px 16px 64px",
                background: "linear-gradient(180deg, #2E9DD7 0%, #1F6DA5 100%)", 
            }}
        >
            <div style={{ maxWidth: 420, margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 32, marginTop: 8 }}>
                    <img
                        src={logoImage}
                        alt="Logo"
                        style={{
                            width: "28vw",
                            maxWidth: 150,
                            aspectRatio: "1 / 1",
                            objectFit: "cover",
                            borderRadius: "50%",
                            border: `4px solid ${palette.primary}`,
                            boxShadow: "0 12px 28px rgba(19,70,105,0.25)",
                        }}
                    />
                </div>
                <div style={cardStyle}>
            <style>
                {`
          @keyframes preIntakeSpin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
            </style>
            {/* Título */}
            <h2 style={{ marginTop: 4, marginBottom: 8, lineHeight: 0.5, color: palette.primary, textAlign: "left" }}>
                Información básica
            </h2>
            <div style={{ marginBottom: 18, fontSize: 12, color: palette.textOnSurface, opacity: 0.9, textAlign: "left" }}>
                {step === 0 ? "Completa tu nombre y correo." : "Completa tus datos complementarios."}
            </div>

            {step === 0 ? (
                <>
                    <div style={{ display: "grid", gap: 16 }}>
                        <div>
                            <label style={labelStyle} htmlFor="name">Nombre</label>
                            <input
                                id="name"
                                type="text"
                                value={form.name}
                                onChange={(e) => setField("name", e.target.value)}
                                placeholder="Nombre completo"
                                style={inputStyle(!!errors.name)}
                                aria-invalid={!!errors.name}
                                aria-describedby={errors.name ? "err-name" : undefined}
                                autoComplete="name"
                                onFocus={(e) => (e.currentTarget.style.boxShadow = focusRing(!errors.name))}
                                onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
                            />
                            {errors.name && <div id="err-name" style={errorStyle}>{errors.name}</div>}
                        </div>

                        <div>
                            <label style={labelStyle} htmlFor="email">Correo</label>
                            <input
                                id="email"
                                type="email"
                                value={form.email}
                                onChange={(e) => setField("email", e.target.value)}
                                placeholder="nombre@dominio.com"
                                style={inputStyle(!!errors.email)}
                                aria-invalid={!!errors.email}
                                aria-describedby={errors.email ? "err-email" : undefined}
                                autoComplete="email"
                                onFocus={(e) => (e.currentTarget.style.boxShadow = focusRing(!errors.email))}
                                onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
                            />
                            {errors.email && <div id="err-email" style={errorStyle}>{errors.email}</div>}
                            <div style={helpStyle}>Usaremos tu correo para enviarte resultados o recordatorios.</div>
                        </div>
                    </div>

                            <div style={{ marginTop: 28 }}>
                                <button
                                    onClick={goNext}
                                    disabled={!canNext}
                                    style={gradientBtn(!canNext)}
                                    onMouseDown={(e) => (e.currentTarget.style.transform = "scale(.98)")}
                                    onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                                    onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                                    onFocus={(e) => (e.currentTarget.style.boxShadow = focusRing(true))}
                                    onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
                                >
                                    Continuar
                                </button>
                            </div>

                </>
            ) : (
                <>
                    {/* Sexo en fila — solo Femenino y Masculino */}
                    <div style={{ marginBottom: 14 }}>
                        <span style={labelStyle}>Sexo</span>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            {[
                                { value: "Femenino", label: "Femenino" },
                                { value: "Masculino", label: "Masculino" },
                            ].map((opt) => {
                                const selected = form.sex === opt.value;
                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setField("sex", opt.value)}
                                        aria-pressed={selected}
                                        style={{
                                            padding: "12px 18px",
                                            borderRadius: 999,
                                            border: "none",
                                            background: selected
                                                ? "linear-gradient(135deg, #1F6DA5, #2E9DD7)"
                                                : "#F4F6FB",
                                            color: selected ? "#FFFFFF" : palette.primary,
                                            fontWeight: 700,
                                            cursor: "pointer",
                                            transition: "box-shadow .2s ease, transform .07s ease",
                                            textAlign: "center",
                                            boxShadow: selected
                                                ? "0 12px 28px rgba(31,109,165,0.35)"
                                                : "0 6px 18px rgba(19,70,105,0.12)",
                                        }}
                                        onMouseDown={(e) => (e.currentTarget.style.transform = "scale(.97)")}
                                        onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                                        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                                        onFocus={(e) => (e.currentTarget.style.boxShadow = focusRing(true))}
                                        onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
                                    >
                                        {opt.label}
                                    </button>
                                );
                            })}
                        </div>
                        {errors.sex && <div style={errorStyle}>{errors.sex}</div>}
                    </div>

                    {/* Fecha de nacimiento + edad */}
                    <div style={{ marginBottom: 14 }}>
                        <label style={labelStyle} htmlFor="birthdate">Fecha de nacimiento</label>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
                            <input
                                id="birthdate"
                                type="date"
                                value={form.birthdate}
                                onChange={(e) => setField("birthdate", e.target.value)}
                                style={inputStyle(!!errors.birthdate)}
                                aria-invalid={!!errors.birthdate}
                                aria-describedby={errors.birthdate ? "err-birthdate" : undefined}
                                onFocus={(e) => (e.currentTarget.style.boxShadow = focusRing(!errors.birthdate))}
                                onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
                            />
                            <div
                                style={{
                                    alignSelf: "center",
                                    padding: "10px 12px",
                                    borderRadius: 12,
                                    border: `1px dashed ${palette.primary}`,
                                    background: palette.surfaceAlt,
                                    color: palette.textOnSurface,
                                    minWidth: 110,
                                    textAlign: "center",
                                    fontWeight: 700,
                                }}
                                title={ageText ? "Edad calculada automáticamente" : ""}
                            >
                                {ageText || "Edad —"}
                            </div>
                        </div>
                        {errors.birthdate && <div id="err-birthdate" style={errorStyle}>{errors.birthdate}</div>}
                    </div>

                    {/* Cirugía */}
                    <div style={{ marginBottom: 8 }}>
                        <span style={labelStyle}>¿Te han operado de la rodilla?</span>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            {[
                                { value: false, label: "No, nunca", caption: "Sin operación previa" },
                                { value: true, label: "Sí, tuve cirugía", caption: "Indicar hace cuánto" },
                            ].map((opt) => {
                                const selected = form.hasSurgery === opt.value;
                                return (
                                    <button
                                        key={opt.label}
                                        type="button"
                                        onClick={() => setField("hasSurgery", opt.value)}
                                        aria-pressed={selected}
                                        style={{
                                            flex: "1 1 180px",
                                            padding: "14px 16px",
                                            borderRadius: 18,
                                            border: "none",
                                            background: selected
                                                ? "linear-gradient(135deg, #1F6DA5, #2E9DD7)"
                                                : "#F4F6FB",
                                            color: selected ? "#FFFFFF" : palette.primary,
                                            fontWeight: 700,
                                            cursor: "pointer",
                                            textAlign: "left",
                                            transition: "box-shadow .2s ease, transform .07s ease",
                                            minWidth: 0,
                                            boxShadow: selected
                                                ? "0 14px 32px rgba(31,109,165,0.35)"
                                                : "0 8px 18px rgba(19,70,105,0.12)",
                                        }}
                                        onMouseDown={(e) => (e.currentTarget.style.transform = "scale(.97)")}
                                        onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                                        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                                        onFocus={(e) => (e.currentTarget.style.boxShadow = focusRing(true))}
                                        onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
                                    >
                                        <div>{opt.label}</div>
                                        <div style={{ fontSize: 12, opacity: 0.75 }}>{opt.caption}</div>
                                    </button>
                                );
                            })}
                        </div>
                        <div style={{ ...helpStyle, marginTop: 6 }}>
                            Si eliges “Sí, tuve cirugía” cuéntanos hace cuánto tiempo (Años / Meses).
                        </div>
                    </div>

                    {form.hasSurgery && (
                        <>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
                                <div>
                                    <label style={labelStyle} htmlFor="surgeryYears">Años (0–12)</label>
                                    <input
                                        id="surgeryYears"
                                        type="number"
                                        min={0}
                                        max={12}
                                        value={form.surgeryYears}
                                        placeholder="Ej. 3"
                                        onChange={(e) =>
                                            setField(
                                                "surgeryYears",
                                                e.target.value === "" ? "" : Math.max(0, Math.min(12, Number(e.target.value)))
                                            )
                                        }
                                        style={inputStyle(!!errors.surgeryYears)}
                                        onFocus={(e) => (e.currentTarget.style.boxShadow = focusRing(!errors.surgeryYears))}
                                        onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
                                    />
                                    {errors.surgeryYears && <div style={errorStyle}>Años: {errors.surgeryYears}</div>}
                                </div>

                                <div>
                                    <label style={labelStyle} htmlFor="surgeryMonths">Meses (0–11)</label>
                                    <input
                                        id="surgeryMonths"
                                        type="number"
                                        min={0}
                                        max={11}
                                        value={form.surgeryMonths}
                                        placeholder="Ej. 3"
                                        onChange={(e) =>
                                            setField(
                                                "surgeryMonths",
                                                e.target.value === "" ? "" : Math.max(0, Math.min(11, Number(e.target.value)))
                                            )
                                        }
                                        style={inputStyle(!!errors.surgeryMonths)}
                                        onFocus={(e) => (e.currentTarget.style.boxShadow = focusRing(!errors.surgeryMonths))}
                                        onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
                                    />
                                    {errors.surgeryMonths && <div style={errorStyle}>Meses: {errors.surgeryMonths}</div>}
                                </div>
                            </div>
                            <div style={{ ...helpStyle, marginTop: 8 }}>
                                (En caso de no saber el tiempo exacto, poner un aproximado)
                            </div>
                        </>
                    )}



                    <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
                        <button
                            type="button"
                            onClick={goBack}
                            disabled={submitting}
                            style={{
                                width: "50%",
                                padding: "12px 0",
                                borderRadius: 16,
                                border: "none",
                                background: "#EEF6FA",
                                color: palette.primary,
                                cursor: submitting ? "not-allowed" : "pointer",
                                fontWeight: 700,
                                boxShadow: "0 12px 26px rgba(19,70,105,0.12)",
                                opacity: submitting ? 0.7 : 1,
                            }}
                        >
                            Regresar
                        </button>

                        <button
                            type="button"
                            onClick={finish}
                            disabled={submitting || !canFinish}
                            style={gradientBtn(submitting || !canFinish)}
                        >
                            {submitting ? "Enviando..." : "Finalizar"}
                        </button>
                    </div>

                    {submitting && (
                        <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 10, color: palette.primary }}>
                            <span
                                style={{
                                    width: 16,
                                    height: 16,
                                    borderRadius: "50%",
                                    border: `2px solid ${palette.primary}30`,
                                    borderTopColor: palette.primary,
                                    animation: "preIntakeSpin 0.9s linear infinite",
                                    display: "inline-block",
                                }}
                            />
                            Guardando información...
                        </div>
                    )}

                    {submitFeedback && (
                        <div
                            style={{
                                marginTop: 12,
                                padding: 12,
                                borderRadius: 12,
                                background: submitFeedback.type === "success" ? "#E8FFF2" : "#FFF1F1",
                                color: submitFeedback.type === "success" ? "#0E6B3B" : palette.error,
                                border: submitFeedback.type === "success" ? "1px solid #70D39E" : `1px solid ${palette.error}`,
                                fontSize: 13,
                                textAlign: "left",
                            }}
                        >
                            {submitFeedback.message}
                        </div>
                    )}

                    <details style={{ marginTop: 16 }}>
                        <summary>Vista previa JSON</summary>
                        <pre style={{ background: "#f7f7f7", padding: 12, borderRadius: 8, textAlign: "left" }}>
                            {JSON.stringify(form, null, 2)}
                        </pre>
                    </details>
                </>
            )}
                </div>
            </div>
        </div>
    );
}
