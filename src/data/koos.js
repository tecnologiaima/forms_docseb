// src/data/koos.js

export const KOOS_SECTIONS = {
  symptoms: { key: "symptoms", title: "Síntomas", maxPerItem: 4 },
  pain:     { key: "pain",     title: "Dolor",     maxPerItem: 4 },
  adl:      { key: "adl",      title: "Función — Vida diaria", maxPerItem: 4 },
  sport:    { key: "sport",    title: "Función — Deportes/Rec", maxPerItem: 4 },
  qol:      { key: "qol",      title: "Calidad de vida", maxPerItem: 4 },
};

// Opciones estándar KOOS 0..4
export const KOOS_OPTIONS_0_4 = [
  { label: "Nunca / Ninguno / En absoluto", value: 0 },
  { label: "Rara vez / Leve / Ligeramente / Mensual", value: 1 },
  { label: "A veces / Moderado / Semanal", value: 2 },
  { label: "A menudo / Severo / Diario", value: 3 },
  { label: "Siempre / Extremo / Constante / Totalmente", value: 4 },
];

// Preguntas (id, sección, texto). El valor siempre es 0..4 según KOOS.
export const KOOS_QUESTIONS = [
  // I. Síntomas (7)
  { id: "S1",  section: "symptoms", text: "¿Tiene hinchazón en la rodilla?" },
  { id: "S2",  section: "symptoms", text: "¿Crujido/chasquido o ruido al mover la rodilla?" },
  { id: "S3",  section: "symptoms", text: "¿Se bloquea o se 'engancha' la rodilla al moverse?" },
  { id: "S4",  section: "symptoms", text: "¿Puede enderezar completamente la rodilla?" },
  { id: "S5",  section: "symptoms", text: "¿Puede doblar completamente la rodilla?" },
  { id: "S6",  section: "symptoms", text: "Rigidez después de despertarse por la mañana." },
  { id: "S7",  section: "symptoms", text: "Rigidez tras estar sentado/tumbado/descansando." },

  // II. Dolor (9)
  { id: "P1",  section: "pain", text: "¿Con qué frecuencia experimenta dolor de rodilla?" },
  { id: "P2",  section: "pain", text: "Dolor al girar o pivotar sobre su rodilla." },
  { id: "P3",  section: "pain", text: "Dolor al enderezar completamente la rodilla." },
  { id: "P4",  section: "pain", text: "Dolor al doblar completamente la rodilla." },
  { id: "P5",  section: "pain", text: "Dolor al caminar sobre superficie plana." },
  { id: "P6",  section: "pain", text: "Dolor al subir o bajar escaleras." },
  { id: "P7",  section: "pain", text: "Dolor por la noche en la cama." },
  { id: "P8",  section: "pain", text: "Dolor al estar sentado o acostado." },
  { id: "P9",  section: "pain", text: "Dolor al estar de pie." },

  // III. ADL (17)
  { id: "A1",  section: "adl", text: "Bajar escaleras." },
  { id: "A2",  section: "adl", text: "Subir escaleras." },
  { id: "A3",  section: "adl", text: "Levantarse de una silla." },
  { id: "A4",  section: "adl", text: "Estar de pie." },
  { id: "A5",  section: "adl", text: "Agacharse hasta el suelo." },
  { id: "A6",  section: "adl", text: "Caminar sobre superficie plana." },
  { id: "A7",  section: "adl", text: "Entrar o salir de un coche." },
  { id: "A8",  section: "adl", text: "Ir de compras." },
  { id: "A9",  section: "adl", text: "Ponerse calcetines/medias." },
  { id: "A10", section: "adl", text: "Levantarse de la cama." },
  { id: "A11", section: "adl", text: "Quitarse calcetines/medias." },
  { id: "A12", section: "adl", text: "Estar acostado en la cama." },
  { id: "A13", section: "adl", text: "Entrar o salir de la ducha/bañera." },
  { id: "A14", section: "adl", text: "Estar sentado." },
  { id: "A15", section: "adl", text: "Sentarse/levantarse del inodoro." },
  { id: "A16", section: "adl", text: "Tareas domésticas pesadas." },
  { id: "A17", section: "adl", text: "Tareas domésticas ligeras." },

  // IV. Sport/Rec (5)
  { id: "SP1", section: "sport", text: "Ponerse en cuclillas." },
  { id: "SP2", section: "sport", text: "Correr." },
  { id: "SP3", section: "sport", text: "Saltar." },
  { id: "SP4", section: "sport", text: "Girar/pivotar sobre la rodilla lesionada." },
  { id: "SP5", section: "sport", text: "Arrodillarse." },

  // V. QoL (4)
  { id: "Q1", section: "qol", text: "Frecuencia con la que es consciente del problema de rodilla." },
  { id: "Q2", section: "qol", text: "¿Ha modificado su estilo de vida por la rodilla?" },
  { id: "Q3", section: "qol", text: "Preocupación por falta de confianza en su rodilla." },
  { id: "Q4", section: "qol", text: "Dificultad general con su rodilla." },
];
