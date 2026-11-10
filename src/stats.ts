import {
  Data,
  Workout,
  WorkoutExercise,
  WorkoutSet,
  groups,
  localDate,
} from "./types";
export const ordered = <T extends { order: number }>(rows: T[]) =>
  [...rows].sort((a, b) => a.order - b.order);
export const itemsFor = (d: Data, w: string) =>
  ordered(d.workoutExercises.filter((e) => e.workoutId === w));
export const setsFor = (d: Data, e: string) =>
  ordered(d.sets.filter((s) => s.workoutExerciseId === e));
export const working = (sets: WorkoutSet[]) =>
  sets.filter((s) => s.isCompleted && !s.isWarmup);
export function duration(w: Workout) {
  if (!w.endTime) return 0;
  return Math.max(
    0,
    Math.round(
      (new Date(`${w.endDate || w.date}T${w.endTime}`).getTime() -
        new Date(`${w.date}T${w.startTime}`).getTime()) /
        60000,
    ),
  );
}
export function e1rm(s: WorkoutSet, e: WorkoutExercise) {
  return e.exerciseType === "weighted" &&
    s.isCompleted &&
    !s.isWarmup &&
    s.weight != null &&
    s.reps != null &&
    s.reps >= 1 &&
    s.reps <= 10
    ? s.weight * (1 + s.reps / 30)
    : null;
}
export function summary(d: Data, ws: Workout[]) {
  const ids = new Set(ws.map((w) => w.id)),
    es = d.workoutExercises.filter((e) => ids.has(e.workoutId));
  let volume = 0,
    sets = 0,
    bodyReps = 0,
    seconds = 0;
  const muscle = Object.fromEntries(groups.map((g) => [g, 0])) as Record<
    string,
    number
  >;
  const frequency = Object.fromEntries(groups.map((g) => [g, 0])) as Record<
    string,
    number
  >;
  es.forEach((e) => {
    const ss = working(setsFor(d, e.id));
    sets += ss.length;
    muscle[e.muscleGroup] += ss.length;
    ss.forEach((s) => {
      if (e.exerciseType === "weighted")
        volume += (s.weight || 0) * (s.reps || 0);
      if (e.exerciseType === "bodyweight") bodyReps += s.reps || 0;
      if (e.exerciseType === "duration") seconds += s.reps || 0;
    });
  });
  ws.forEach((w) =>
    new Set(
      es
        .filter((e) => e.workoutId === w.id && working(setsFor(d, e.id)).length)
        .map((e) => e.muscleGroup),
    ).forEach((g) => frequency[g]++),
  );
  const minutes = ws.reduce((s, w) => s + duration(w), 0);
  return {
    count: ws.length,
    minutes,
    average: ws.length ? Math.round(minutes / ws.length) : 0,
    volume,
    sets,
    bodyReps,
    seconds,
    muscle,
    frequency,
  };
}
export function exercisePoints(d: Data, ws: Workout[], exerciseId: string) {
  return [...ws]
    .sort((a, b) =>
      `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`),
    )
    .flatMap((w) => {
      const es = itemsFor(d, w.id).filter((e) => e.exerciseId === exerciseId);
      const ss = es.flatMap((e) => working(setsFor(d, e.id)));
      if (!ss.length) return [];
      const rms = es
        .flatMap((e) => working(setsFor(d, e.id)).map((s) => e1rm(s, e)))
        .filter((v): v is number => v != null);
      const weighted = es[0].exerciseType === "weighted";
      return [
        {
          id: w.id,
          date: w.date,
          time: w.startTime,
          weight: weighted ? Math.max(...ss.map((s) => s.weight || 0)) : null,
          reps: Math.max(...ss.map((s) => s.reps || 0)),
          totalReps: ss.reduce((n, s) => n + (s.reps || 0), 0),
          volume: weighted
            ? ss.reduce((n, s) => n + (s.weight || 0) * (s.reps || 0), 0)
            : null,
          e1rm: rms.length ? Math.max(...rms) : null,
        },
      ];
    });
}
export const completed = (d: Data) =>
  d.workouts
    .filter((w) => w.status === "completed")
    .sort((a, b) =>
      `${b.date}${b.startTime}`.localeCompare(`${a.date}${a.startTime}`),
    );
export const within = (ws: Workout[], from: string, to: string) =>
  ws.filter((w) => (!from || w.date >= from) && (!to || w.date <= to));
export function rangeStart(days: number, to = localDate(new Date())) {
  const d = new Date(`${to}T12:00:00`);
  d.setDate(d.getDate() - days + 1);
  return localDate(d);
}
export function comparable(a: WorkoutExercise[], b: WorkoutExercise[]) {
  return (
    a.length > 0 &&
    a.length === b.length &&
    a
      .map((e) => e.exerciseId)
      .sort()
      .join("|") ===
      b
        .map((e) => e.exerciseId)
        .sort()
        .join("|")
  );
}
