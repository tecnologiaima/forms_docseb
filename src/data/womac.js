// src/data/womac.js

export const WOMAC_OPTIONS = [
  { label: "Ninguno/a", value: 0 },
  { label: "Poco/a", value: 1 },
  { label: "Bastante", value: 2 },
  { label: "Mucho/a", value: 3 },
  { label: "Muchísimo/a", value: 4 },
];

export const SECTION_HEADINGS = {
  pain: {
    title: "Apartado A: Dolor",
    instruction:
      "Indique cuánto DOLOR ha notado en los últimos 2 días en cada situación.",
    questionPrefix: "¿Cuánto dolor tiene…?",
  },
  stiffness: {
    title: "Apartado B: Rigidez",
    instruction:
      "Indique cuánta RIGIDEZ (no dolor) ha notado en los últimos 2 días.",
    questionPrefix: "¿Cuánta rigidez nota…?",
  },
  function: {
    title: "Apartado C: Capacidad Funcional",
    instruction:
      "Indique cuánta dificultad ha notado en los últimos 2 días al realizar:",
    questionPrefix: "¿Qué grado de dificultad tiene al…?",
  },
};

export const WOMAC_QUESTIONS = [
  // Dolor (5) 0..20
  { id: "pain_1", section: "pain", type: "radio", text: "Andar por un terreno llano." },
  { id: "pain_2", section: "pain", type: "radio", text: "Subir o bajar escaleras." },
  { id: "pain_3", section: "pain", type: "radio", text: "Por la noche en la cama." },
  { id: "pain_4", section: "pain", type: "radio", text: "Estar sentado o tumbado." },
  { id: "pain_5", section: "pain", type: "radio", text: "Estar de pie." },

  // Rigidez (2) 0..8
  { id: "stiffness_1", section: "stiffness", type: "radio", text: "Después de despertarse por la mañana." },
  { id: "stiffness_2", section: "stiffness", type: "radio", text: "Tras estar sentado, tumbado o descansando." },

  // Función (17) 0..68
  { id: "function_1", section: "function", type: "radio", text: "Bajar las escaleras." },
  { id: "function_2", section: "function", type: "radio", text: "Subir las escaleras." },
  { id: "function_3", section: "function", type: "radio", text: "Levantarse después de estar sentado." },
  { id: "function_4", section: "function", type: "radio", text: "Estar de pie." },
  { id: "function_5", section: "function", type: "radio", text: "Agacharse para coger algo del suelo." },
  { id: "function_6", section: "function", type: "radio", text: "Andar por un terreno llano." },
  { id: "function_7", section: "function", type: "radio", text: "Entrar y salir de un coche." },
  { id: "function_8", section: "function", type: "radio", text: "Ir de compras." },
  { id: "function_9", section: "function", type: "radio", text: "Ponerse las medias o calcetines." },
  { id: "function_10", section: "function", type: "radio", text: "Levantarse de la cama." },
  { id: "function_11", section: "function", type: "radio", text: "Quitarse las medias o calcetines." },
  { id: "function_12", section: "function", type: "radio", text: "Estar tumbado en la cama." },
  { id: "function_13", section: "function", type: "radio", text: "Entrar y salir de la ducha/bañera." },
  { id: "function_14", section: "function", type: "radio", text: "Estar sentado." },
  { id: "function_15", section: "function", type: "radio", text: "Sentarse y levantarse del retrete." },
  { id: "function_16", section: "function", type: "radio", text: "Hacer tareas domésticas pesadas." },
  { id: "function_17", section: "function", type: "radio", text: "Hacer tareas domésticas ligeras." },
];

