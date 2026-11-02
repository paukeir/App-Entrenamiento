export const agreedGymDate = '2026-11-03';
const exercise = (name, sets, reps, weight, unit, warmup, note, extra = {}) => ({ name, sets, reps, weight, unit, warmup, note, ...extra });
export const agreedGym = {
  type: 'gym', source: 'agreed', title: 'Cuerpo completo · énfasis en piernas',
  sessionInstructions: '55–65 min. Calienta 8 minutos en bicicleta o caminando en cinta y haz movilidad de tobillos, cadera y hombros. Termina con unas 3 repeticiones en reserva, sin llegar al fallo. Descansa 60–90 s en tren superior y 90–120 s en piernas. Evita estrenar cargas excesivas.',
  details: '55–65 min. Calienta 8 minutos en bicicleta o caminando en cinta y haz movilidad de tobillos, cadera y hombros. Termina con unas 3 repeticiones en reserva, sin llegar al fallo. Descansa 60–90 s en tren superior y 90–120 s en piernas. Evita cargas nuevas excesivas y agujetas fuertes: posible 5K el domingo 8 y 10K el 15. Objetivo: recuperar fuerza de piernas para la Media Maratón de Sevilla sin acumular fatiga innecesaria.',
  exercises: [
    exercise('Prensa de piernas', 3, 10, null, 'total', '1 × 12 con carga de calentamiento', 'Carga moderada, todavía sin referencia fiable. Elige un peso que permita 3–4 repeticiones más por serie.', { lowerBody: true }),
    exercise('Peso muerto rumano con mancuernas', 2, 10, 8, 'por mano', '', 'Solo si controlas la técnica. Trabaja glúteos e isquiotibiales sin buscar un estiramiento excesivo.', { maxWeight: 10, lowerBody: true }),
    exercise('Elevaciones de gemelos', 3, 15, 0, 'total', '', 'Peso corporal o carga ligera. Movimiento lento, controlando la bajada.', { lowerBody: true }),
    exercise('Jalón al pecho', 3, 10, 40, 'total', '1 × 12 · 20 kg', 'Puedes repetir 45 kg si la máquina y las sensaciones son comparables al 27/10.', { maxReps: 12, maxWeight: 45 }),
    exercise('Press de pecho en máquina', 3, 12, 30, 'total', '1 × 12 · 15 kg', 'El 27/10 utilizaste 30 kg. Solo prueba una pequeña subida si tienes margen.', { maxWeight: 35 }),
    exercise('Remo en máquina', 3, 12, 30, 'total', '', 'El plan del chat menciona 32 kg el domingo. Mantén la técnica antes de aumentar.', { maxWeight: 35 }),
    exercise('Plancha frontal', 2, null, null, 'segundos', '', 'Descansa 45–60 s. Puedes repetir 45 s o aumentar si mantienes buena postura.', { durationSeconds: 45, maxDurationSeconds: 60 }),
  ],
};
export const initialProfile = {
  objective: 'Preparar la Media Maratón de Sevilla; recuperar fuerza de piernas y mejorar la marca de 54:14 en 10K.',
  context: 'Descanso lunes y miércoles por trabajo e italiano. Objetivo habitual: 3 sesiones de running y 2 de gimnasio. Media Maratón de Sevilla: 13/12/2026, referencia 1:59:18.',
  automaticPlanning: true,
  events: [
    { date: '2026-11-08', name: 'Posible 5K', distanceKm: 5, confirmed: false },
    { date: '2026-11-15', name: '10K · referencia 54:14', distanceKm: 10, confirmed: true },
    { date: '2026-12-13', name: 'Media Maratón de Sevilla · referencia 1:59:18', distanceKm: 21.0975, confirmed: true },
  ],
};

export const proposedWeek = {
 '2026-11-02':{type:'rest',title:'Descanso',details:'Trabajo e italiano. Recuperación.',source:'draft'},
 '2026-11-04':{type:'rest',title:'Descanso',details:'Trabajo e italiano. Recuperación.',source:'draft'},
 '2026-11-05':{type:'run',title:'Rodaje suave · 6–7 km',distanceKm:6,maxDistanceKm:7,intensity:'suave',details:'6–7 km cómodos y 4 progresivos de 15–20 segundos, con recuperación completa.',source:'draft'},
 '2026-11-06':{type:'gym',title:'Tren superior y core',details:'Gimnasio moderado, sin trabajo pesado de piernas antes de la posible 5K. Ejercicios y cargas por confirmar: la captura no los detalla.',source:'draft'},
 '2026-11-07':{type:'rest',title:'Descanso previo a la carrera',details:'Recuperación; prepara la carrera si finalmente participas.',source:'draft'},
 '2026-11-08':{type:'run',title:'5K opcional · controlada',distanceKm:7,maxDistanceKm:9,intensity:'suave',optionalRace:true,details:'Solo si confirmas participación: 5K controlada, sin buscar récord; calentamiento de 10–15 min. Si no hay carrera: rodaje suave de 7–9 km. Confirma tu participación en Mi objetivo.',source:'draft'},
};
