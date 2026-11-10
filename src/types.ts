export const groups = [
  "Грудь",
  "Спина",
  "Ноги",
  "Плечи",
  "Бицепс",
  "Трицепс",
  "Пресс и корпус",
] as const;
export type Group = (typeof groups)[number];
export type ExerciseType = "weighted" | "bodyweight" | "duration";
export interface Exercise {
  id: string;
  name: string;
  muscleGroup: Group;
  exerciseType: ExerciseType;
  isCustom: boolean;
  isArchived: boolean;
}
export interface Workout {
  id: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string | null;
  endDate: string | null;
  status: "draft" | "completed";
  notes: string;
  createdAt: string;
  updatedAt: string;
}
export interface WorkoutExercise {
  id: string;
  workoutId: string;
  exerciseId: string;
  order: number;
  name: string;
  muscleGroup: Group;
  exerciseType: ExerciseType;
}
export interface WorkoutSet {
  id: string;
  workoutExerciseId: string;
  order: number;
  weight: number | null;
  reps: number | null;
  isWarmup: boolean;
  isCompleted: boolean;
}
export interface WorkoutTemplate {
  id: string;
  name: string;
  exercises: string[];
}
export interface Setting {
  key: string;
  value: unknown;
}
export interface Data {
  exercises: Exercise[];
  workouts: Workout[];
  workoutExercises: WorkoutExercise[];
  sets: WorkoutSet[];
  templates: WorkoutTemplate[];
  settings: Setting[];
}
export interface Backup extends Data {
  app: "moi-trenirovki";
  version: 1;
  exportedAt: string;
}
export const uid = () => crypto.randomUUID();
export const today = () => localDate(new Date());
export const localDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const localTime = (d = new Date()) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
export const dateRu = (s: string) => s.split("-").reverse().join(".");
export const numberRu = (n: number) =>
  new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(n);
export const typeLabel = (t: ExerciseType) =>
  t === "weighted"
    ? "Внешнее отягощение"
    : t === "bodyweight"
      ? "Собственный вес"
      : "На время";
