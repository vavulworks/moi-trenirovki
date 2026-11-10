import { Data, Workout, dateRu, numberRu } from "./types";
import { summary, itemsFor, setsFor, exercisePoints, ordered } from "./stats";
export function selectedData(d: Data, ws: Workout[], exerciseId = ""): Data {
  const ids = new Set(ws.map((w) => w.id));
  const es = d.workoutExercises.filter(
    (e) => ids.has(e.workoutId) && (!exerciseId || e.exerciseId === exerciseId),
  );
  const eids = new Set(es.map((e) => e.id));
  return {
    ...d,
    workouts: ws,
    workoutExercises: es,
    sets: d.sets.filter((s) => eids.has(s.workoutExerciseId)),
  };
}
export function report(
  d: Data,
  ws: Workout[],
  from: string,
  to: string,
  exerciseId = "",
) {
  const data = selectedData(d, ws, exerciseId),
    s = summary(data, ws);
  const lines = [
    "ОТЧЁТ О ТРЕНИРОВКАХ",
    `Период: ${from ? dateRu(from) : "начало истории"}–${dateRu(to)}`,
  ];
  if (exerciseId)
    lines.push(
      `Упражнение: ${d.exercises.find((e) => e.id === exerciseId)?.name || exerciseId}. Итоги нагрузки только по этому упражнению; длительность — полных тренировок.`,
    );
  if (!ws.length) lines.push("За выбранный период завершённых тренировок нет.");
  [...ws]
    .sort((a, b) =>
      `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`),
    )
    .forEach((w) => {
      lines.push(
        "",
        `ТРЕНИРОВКА · ${w.name}`,
        `Дата: ${dateRu(w.date)}`,
        `Время: ${w.startTime}–${w.endTime}${w.endDate && w.endDate !== w.date ? ` (${dateRu(w.endDate)})` : ""}`,
      );
      itemsFor(data, w.id).forEach((e) => {
        lines.push(`${e.name}:`);
        setsFor(data, e.id).forEach((st, i) =>
          lines.push(
            `${i + 1}. ${e.exerciseType === "weighted" ? `${st.weight === null ? "—" : numberRu(st.weight)} кг × ` : ""}${st.reps ?? "—"}${e.exerciseType === "duration" ? " сек." : e.exerciseType === "bodyweight" ? " повт. (собственный вес)" : ""}${st.isWarmup ? " (разминка)" : ""}${!st.isCompleted ? " [не выполнен]" : ""}`,
          ),
        );
      });
      const sum = summary(data, [w]);
      lines.push(
        `Итог: ${sum.minutes} мин; рабочих подходов ${sum.sets}; объём с отягощением ${numberRu(sum.volume)} кг·повт.${sum.bodyReps ? `; собственный вес ${sum.bodyReps} повт.` : ""}${sum.seconds ? `; на время ${sum.seconds} сек.` : ""}`,
      );
      if (w.notes) lines.push(`Заметки: ${w.notes}`);
    });
  lines.push(
    "",
    "СВОДКА",
    `Тренировок: ${s.count}. Длительность: ${s.minutes} мин. Средняя: ${s.average} мин.`,
    `Выполненных рабочих подходов: ${s.sets}. Объём с отягощением: ${numberRu(s.volume)} кг·повт.`,
    `Собственный вес: ${s.bodyReps} повт. Упражнения на время: ${s.seconds} сек.`,
    "Частота мышечных групп (тренировок): " +
      Object.entries(s.frequency)
        .filter(([, v]) => v)
        .map(([g, v]) => `${g} — ${v}`)
        .join("; ") +
      ".",
  );
  const used = [...new Set(data.workoutExercises.map((e) => e.exerciseId))];
  const changes = used.flatMap((id) => {
    const ps = exercisePoints(data, ws, id);
    if (ps.length < 2) return [];
    const a = ps[0],
      b = ps.at(-1)!;
    const e = data.workoutExercises.find((e) => e.exerciseId === id)!;
    return [
      `${e.name}: ${dateRu(a.date)} → ${dateRu(b.date)}; ${e.exerciseType === "weighted" ? `макс. рабочий вес ${a.weight} → ${b.weight} кг; объём ${a.volume} → ${b.volume} кг·повт.` : `сумма ${a.totalReps} → ${b.totalReps} ${e.exerciseType === "duration" ? "сек." : "повт."}`}`,
    ];
  });
  lines.push(
    changes.length
      ? "Изменение результатов (первая → последняя тренировка):\n" +
          changes.join("\n")
      : "Для оценки изменения результатов нужно минимум два выполнения упражнения.",
    "Объём учитывает только выполненные рабочие подходы с внешним отягощением.",
  );
  return lines.join("\n");
}
export function reportJson(d: Data, ws: Workout[], exerciseId = "") {
  const sub = selectedData(d, ws, exerciseId);
  return JSON.stringify(
    {
      app: "moi-trenirovki",
      reportVersion: 1,
      exportedAt: new Date().toISOString(),
      exercises: d.exercises.filter((e) =>
        sub.workoutExercises.some((we) => we.exerciseId === e.id),
      ),
      workouts: ws,
      workoutExercises: sub.workoutExercises,
      sets: sub.sets,
    },
    null,
    2,
  );
}
const csvCell = (x: unknown) =>
  '"' +
  String(x ?? "")
    .replace(/^[=+@\-]/, "'$&")
    .replace(/"/g, '""') +
  '"';
export function csv(d: Data) {
  const rows: unknown[][] = [
    [
      "ID тренировки",
      "Дата",
      "Статус",
      "Начало",
      "Конец",
      "ID упражнения",
      "Название",
      "Тип нагрузки",
      "№ подхода",
      "Вес, кг",
      "Повторы / секунды",
      "Разминка",
      "Выполнен",
    ],
  ];
  d.workouts.forEach((w) =>
    itemsFor(d, w.id).forEach((e) =>
      ordered(setsFor(d, e.id)).forEach((s, i) =>
        rows.push([
          w.id,
          w.date,
          w.status,
          w.startTime,
          w.endTime,
          e.exerciseId,
          e.name,
          e.exerciseType,
          i + 1,
          e.exerciseType === "weighted" ? s.weight : "",
          s.reps,
          s.isWarmup ? "да" : "нет",
          s.isCompleted ? "да" : "нет",
        ]),
      ),
    ),
  );
  return "\uFEFF" + rows.map((row) => row.map(csvCell).join(";")).join("\r\n");
}
