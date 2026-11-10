import { Data, Workout, WorkoutSet, WorkoutExercise } from "../types";
import { exercises } from "../catalog";
export const workout: Workout = {
  id: "w1",
  name: "Тестовая тренировка",
  date: "2026-11-10",
  startTime: "18:30",
  endTime: "19:30",
  endDate: "2026-11-10",
  status: "completed",
  notes: "Техника",
  createdAt: "2026-11-10T15:30:00.000Z",
  updatedAt: "2026-11-10T16:30:00.000Z",
};
export function fixture(): Data {
  const bench = exercises.find((e) => e.name === "Жим штанги лёжа")!,
    push = exercises.find((e) => e.name === "Отжимания")!,
    plank = exercises.find((e) => e.name === "Планка")!;
  const es: WorkoutExercise[] = [bench, push, plank].map((e, i) => ({
    id: `we${i}`,
    workoutId: "w1",
    exerciseId: e.id,
    order: i,
    name: e.name,
    muscleGroup: e.muscleGroup,
    exerciseType: e.exerciseType,
  }));
  const set = (
    id: string,
    we: string,
    order: number,
    weight: number | null,
    reps: number,
    isWarmup = false,
    isCompleted = true,
  ): WorkoutSet => ({
    id,
    workoutExerciseId: we,
    order,
    weight,
    reps,
    isWarmup,
    isCompleted,
  });
  return {
    exercises: [bench, push, plank],
    workouts: [{ ...workout }],
    workoutExercises: es,
    sets: [
      set("s1", "we0", 0, 20, 12, true),
      set("s2", "we0", 1, 60, 10),
      set("s3", "we0", 2, 65, 8),
      set("s4", "we0", 3, 100, 1, false, false),
      set("s5", "we1", 0, 0, 12),
      set("s6", "we2", 0, 0, 45),
    ],
    templates: [{ id: "t1", name: "Шаблон", exercises: [bench.id, push.id] }],
    settings: [
      { key: "theme", value: "dark" },
      { key: "restSeconds", value: 90 },
      { key: "autoRest", value: true },
    ],
  };
}
