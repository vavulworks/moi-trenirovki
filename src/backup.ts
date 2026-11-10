import { z } from "zod";
import { Backup, Data, groups } from "./types";
import { db, TrainingDB, readData } from "./db";
const id = z.string().min(1).max(200);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const d = new Date(`${s}T12:00:00Z`);
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, "Некорректная дата");
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const type = z.enum(["weighted", "bodyweight", "duration"]);
const order = z.number().int().nonnegative();
const amount = z.number().finite().nonnegative().max(1000000).nullable();
const schema = z.object({
  app: z.literal("moi-trenirovki"),
  version: z.literal(1),
  exportedAt: z.string().datetime(),
  exercises: z.array(
    z.object({
      id,
      name: z.string().trim().min(1).max(200),
      muscleGroup: z.enum(groups),
      exerciseType: type,
      isCustom: z.boolean(),
      isArchived: z.boolean(),
    }),
  ),
  workouts: z.array(
    z.object({
      id,
      name: z.string().max(200),
      date,
      startTime: time,
      endTime: time.nullable(),
      endDate: date.nullable(),
      status: z.enum(["draft", "completed"]),
      notes: z.string().max(50000),
      createdAt: z.string().datetime(),
      updatedAt: z.string().datetime(),
    }),
  ),
  workoutExercises: z.array(
    z.object({
      id,
      workoutId: id,
      exerciseId: id,
      order,
      name: z.string().min(1).max(200),
      muscleGroup: z.enum(groups),
      exerciseType: type,
    }),
  ),
  sets: z.array(
    z.object({
      id,
      workoutExerciseId: id,
      order,
      weight: amount,
      reps: amount.refine(
        (n) => n === null || Number.isInteger(n),
        "Повторы должны быть целыми",
      ),
      isWarmup: z.boolean(),
      isCompleted: z.boolean(),
    }),
  ),
  templates: z.array(
    z.object({
      id,
      name: z.string().trim().min(1).max(200),
      exercises: z.array(id),
    }),
  ),
  settings: z.array(z.object({ key: z.string(), value: z.unknown() })),
});
export function validateBackup(input: unknown): Backup {
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    throw new Error(
      "Файл не является корректной резервной копией версии 1. " +
        parsed.error.issues[0].path.join("."),
    );
  const b = parsed.data as Backup;
  for (const rows of [
    b.exercises,
    b.workouts,
    b.workoutExercises,
    b.sets,
    b.templates,
  ])
    if (new Set(rows.map((r) => r.id)).size !== rows.length)
      throw new Error("В копии повторяются идентификаторы.");
  if (new Set(b.settings.map((s) => s.key)).size !== b.settings.length)
    throw new Error("Повторяются настройки.");
  if (b.workouts.filter((w) => w.status === "draft").length > 1)
    throw new Error("В копии больше одного черновика.");
  const ex = new Set(b.exercises.map((e) => e.id)),
    ws = new Set(b.workouts.map((w) => w.id)),
    wes = new Map(b.workoutExercises.map((e) => [e.id, e]));
  if (
    b.workoutExercises.some(
      (e) => !ex.has(e.exerciseId) || !ws.has(e.workoutId),
    ) ||
    b.sets.some((s) => !wes.has(s.workoutExerciseId)) ||
    b.templates.some((t) => t.exercises.some((e) => !ex.has(e)))
  )
    throw new Error("Нарушены связи между записями.");
  if (
    b.sets.some(
      (s) =>
        s.isCompleted &&
        (!(s.reps && s.reps > 0) ||
          (wes.get(s.workoutExerciseId)!.exerciseType === "weighted" &&
            s.weight === null)),
    )
  )
    throw new Error("Выполненные подходы содержат незаполненные значения.");
  if (
    b.workouts.some(
      (w) =>
        w.status === "completed" &&
        (!w.endTime ||
          !w.endDate ||
          new Date(`${w.endDate}T${w.endTime}`) <
            new Date(`${w.date}T${w.startTime}`)),
    )
  )
    throw new Error("Некорректное время завершения тренировки.");
  for (const s of b.settings) {
    const v = s.value;
    const valid =
      s.key === "theme"
        ? ["light", "dark", "system"].includes(v as string)
        : s.key === "restSeconds"
          ? typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 3600
          : s.key === "autoRest"
            ? typeof v === "boolean"
            : s.key === "restEnd"
              ? v === null ||
                (typeof v === "number" && Number.isFinite(v) && v >= 0)
              : s.key === "lastBackup"
                ? typeof v === "string" && !isNaN(Date.parse(v))
                : false;
    if (!valid)
      throw new Error("Копия содержит неизвестную или некорректную настройку.");
  }
  return b;
}
export const makeBackup = (d: Data, at = new Date().toISOString()): Backup => ({
  app: "moi-trenirovki",
  version: 1,
  exportedAt: at,
  ...d,
});
export async function restoreBackup(input: unknown, database: TrainingDB = db) {
  const b = validateBackup(input);
  await database.transaction("rw", database.tables, async () => {
    await Promise.all(database.tables.map((t) => t.clear()));
    await database.exercises.bulkPut(b.exercises);
    await database.workouts.bulkPut(b.workouts);
    await database.workoutExercises.bulkPut(b.workoutExercises);
    await database.sets.bulkPut(b.sets);
    await database.templates.bulkPut(b.templates);
    await database.settings.bulkPut(b.settings);
  });
}
export async function backupNow() {
  const d = await readData();
  return makeBackup(d);
}
export function download(
  content: string,
  name: string,
  type = "text/plain;charset=utf-8",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const a = document.createElement("textarea");
    a.value = text;
    a.style.position = "fixed";
    a.style.top = "0";
    a.style.opacity = "0";
    document.body.append(a);
    a.focus();
    a.select();
    a.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    a.remove();
    if (!ok)
      throw new Error(
        "Копирование недоступно. Скачайте отчёт или выделите его текст.",
      );
  }
}
