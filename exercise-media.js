const library = [
  [/jal[oó]n/i, 'Wide-Grip_Lat_Pulldown', 'Jalón al pecho con agarre amplio. Ajusta el agarre a tu máquina.'],
  [/remo/i, 'Seated_Cable_Rows', 'La foto muestra remo sentado en polea; tu remo en máquina puede tener otra colocación o recorrido.'],
  [/press.*pecho|pecho.*press/i, 'Machine_Bench_Press', 'Press de pecho en máquina. La forma y el ajuste pueden variar respecto a tu máquina convergente.'],
  [/tr[ií]ceps/i, 'Triceps_Pushdown', 'Extensión de tríceps en polea con barra.'],
  [/militar|hombro.*press/i, 'Leverage_Shoulder_Press', 'Press de hombros en máquina de palancas. Ajusta asiento y agarre a tu máquina.'],
  [/laterales/i, 'Side_Lateral_Raise', 'Elevaciones laterales con mancuernas.'],
  [/b[ií]ceps/i, 'Standing_Biceps_Cable_Curl', 'Curl de bíceps en polea con barra.'],
  [/plancha/i, 'Plank', 'Plancha apoyada sobre los antebrazos. Mantén el cuerpo alineado.'],
  [/prensa/i, 'Leg_Press', 'Prensa inclinada. Tu modelo de prensa puede tener una inclinación diferente.'],
  [/rumano/i, 'Stiff-Legged_Dumbbell_Deadlift', 'Variante de referencia con mancuernas y piernas semirrígidas. Para tu rumano, conserva ligera flexión de rodillas y no fuerces el estiramiento.'],
  [/gemelos/i, 'Standing_Calf_Raises', 'La foto muestra elevaciones de gemelos en máquina. Tu plan permite hacerlas con peso corporal o carga ligera; no exige esta máquina.'],
];
export function exerciseMedia(name) {
  if(/erg[oó]metro/i.test(name))return null;
  const entry = library.find(([pattern]) => pattern.test(name));
  if (!entry) return null;
  const [, id, caption] = entry;
  return { id, caption, images: [0, 1].map(n => `assets/exercises/${id}/${n}.jpg`) };
}
