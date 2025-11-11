// src/data/ikdcQuestions.js
// Definición funcional (sin estilos) de las preguntas IKDC.
// Se modela cada reactivo con su tipo y puntos asociados.
// Nota: "pre_injury" se EXCLUYE del cálculo final.

export const ikdcQuestions = [
  // 1
  {
    id: "q1_activity_without_pain",
    text: "¿Cuál es el nivel más alto de actividad que puede realizar sin sentir dolor en la rodilla?",
    type: "radio",
    options: [
      { label: "Actividades muy agotadoras (saltar/girar, básquet/fútbol)", value: 4 },
      { label: "Actividades agotadoras (trabajo físico pesado, esquiar/tenis)", value: 3 },
      { label: "Actividades moderadas (correr/jogging, trabajo moderado)", value: 2 },
      { label: "Actividades ligeras (caminar, tareas en casa/jardín)", value: 1 },
      { label: "No puedo realizar ninguna de las anteriores por dolor", value: 0 },
    ],
  },

  // 2
  {
    id: "q2_pain_frequency",
    text:
      "Durante las últimas 4 semanas o desde la lesión, ¿con cuánta frecuencia ha tenido dolor? (Nunca = 10, Constantemente = 0)",
    type: "scale10", // 0..10
    min: 0,
    max: 10,
    minLabel: "Constantemente (0)",
    maxLabel: "Nunca (10)",
  },

  // 3
  {
    id: "q3_pain_intensity",
    text:
      "Marque la intensidad del dolor (Ningún dolor = 10, Peor dolor imaginable = 0)",
    type: "scale10",
    min: 0,
    max: 10,
    minLabel: "Peor dolor (0)",
    maxLabel: "Ningún dolor (10)",
  },

  // 4
  {
    id: "q4_stiffness_swelling",
    text: "Durante las últimas 4 semanas, ¿qué tan rígida o hinchada estuvo su rodilla?",
    type: "radio",
    options: [
      { label: "Nada", value: 4 },
      { label: "Poco", value: 3 },
      { label: "Moderadamente", value: 2 },
      { label: "Mucho", value: 1 },
      { label: "Muchísimo", value: 0 },
    ],
  },

  // 5
  {
    id: "q5_activity_without_swelling",
    text: "¿Cuál es el nivel más alto de actividad que puede realizar sin que la rodilla se hinche de forma considerable?",
    type: "radio",
    options: [
      { label: "Actividades muy agotadoras (saltar/girar…)", value: 4 },
      { label: "Actividades agotadoras (trabajo físico pesado…)", value: 3 },
      { label: "Actividades moderadas (correr/jogging…)", value: 2 },
      { label: "Actividades ligeras (caminar, tareas en casa…)", value: 1 },
      { label: "No puedo realizar ninguna de las anteriores", value: 0 },
    ],
  },

  // 6
  {
    id: "q6_locking",
    text:
      "Durante las últimas 4 semanas, ¿se le ha bloqueado/trabado temporalmente la rodilla?",
    type: "radio",
    options: [
      { label: "Sí", value: 0 },
      { label: "No", value: 1 },
    ],
  },

  // 7
  {
    id: "q7_activity_without_giving_way",
    text:
      "¿Cuál es el nivel más alto de actividad que puede hacer sin que la rodilla le falle?",
    type: "radio",
    options: [
      { label: "Actividades muy agotadoras (saltar/girar…)", value: 4 },
      { label: "Actividades agotadoras (trabajo físico pesado…)", value: 3 },
      { label: "Actividades moderadas (correr/jogging…)", value: 2 },
      { label: "Actividades ligeras (caminar, tareas en casa…)", value: 1 },
      { label: "No puedo realizar ninguna de las anteriores", value: 0 },
    ],
  },

  // 8
  {
    id: "q8_highest_regular_activity",
    text: "¿Cuál es el nivel más alto de actividad que puede efectuar de forma habitual?",
    type: "radio",
    options: [
      { label: "Actividades muy agotadoras", value: 4 },
      { label: "Actividades agotadoras", value: 3 },
      { label: "Actividades moderadas", value: 2 },
      { label: "Actividades ligeras", value: 1 },
      { label: "No puedo realizar ninguna de las anteriores", value: 0 },
    ],
  },

  // 9a - 9i (nueve tareas funcionales)
  ...[
    ["q9a_stairs_up", "Subir escaleras"],
    ["q9b_stairs_down", "Bajar escaleras"],
    ["q9c_kneeling", "Arrodillarse sobre la parte delantera de la rodilla"],
    ["q9d_squatting", "Ponerse en cuclillas"],
    ["q9e_sitting_bent", "Sentarse con la rodilla doblada"],
    ["q9f_stand_from_chair", "Levantarse de una silla"],
    ["q9g_run_straight", "Correr hacia delante en línea recta"],
    ["q9h_jump_land", "Saltar y caer sobre la pierna afectada"],
    ["q9i_stop_start", "Parar y comenzar rápidamente a caminar o correr"],
  ].map(([id, label]) => ({
    id,
    text: `Debido a su rodilla, nivel de dificultad para: ${label}`,
    type: "radio",
    options: [
      { label: "Ninguna dificultad", value: 4 },
      { label: "Dificultad mínima", value: 3 },
      { label: "Dificultad moderada", value: 2 },
      { label: "Sumamente difícil", value: 1 },
      { label: "No puedo hacerlo", value: 0 },
    ],
  })),

  // 10a) pre-injury (EXCLUIR)
  {
    id: "q10a_function_pre_injury",
    text:
      "Funcionamiento de su rodilla ANTES de la lesión (0 = nulo, 10 = óptimo) — *No se usa para el cálculo final*",
    type: "scale10",
    min: 0,
    max: 10,
    minLabel: "0 (nulo)",
    maxLabel: "10 (óptimo)",
    excludeFromScore: true,
  },

  // 10b) current function (INCLUIR)
  {
    id: "q10b_function_current",
    text:
      "Funcionamiento ACTUAL de su rodilla (0 = nulo, 10 = óptimo)",
    type: "scale10",
    min: 0,
    max: 10,
    minLabel: "0 (nulo)",
    maxLabel: "10 (óptimo)",
  },
];
