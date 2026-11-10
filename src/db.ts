import Dexie, { type Table } from "dexie";
import {
  Exercise,
  Workout,
  WorkoutExercise,
  WorkoutSet,
  WorkoutTemplate,
  Setting,
  Data,
  uid,
  today,
  localTime,
} from "./types";
import { exercises, templates } from "./catalog";
import { itemsFor, setsFor, ordered } from "./stats";
export class TrainingDB extends Dexie {
  exercises!: Table<Exercise>;
  workouts!: Table<Workout>;
  workoutExercises!: Table<WorkoutExercise>;
  sets!: Table<WorkoutSet>;
  templates!: Table<WorkoutTemplate>;
  settings!: Table<Setting>;
  constructor(name = "moi-trenirovki") {
    super(name);
    this.version(1).stores({
      exercises: "id,muscleGroup,isArchived",
      workouts: "id,date,status",
      workoutExercises: "id,workoutId,exerciseId",
      sets: "id,workoutExerciseId",
      templates: "id",
      settings: "key",
    });
    this.on("populate", async (tx) => {
      await tx.table("exercises").bulkAdd(exercises);
      await tx.table("templates").bulkAdd(templates);
    });
  }
}
export const db = new TrainingDB();
export const emptyData: Data = {
  exercises: [],
  workouts: [],
  workoutExercises: [],
  sets: [],
  templates: [],
  settings: [],
};
export async function readData(database = db): Promise<Data> {
  return database.transaction("r", database.tables, async () => ({
    exercises: await database.exercises.toArray(),
    workouts: await database.workouts.toArray(),
    workoutExercises: await database.workoutExercises.toArray(),
    sets: await database.sets.toArray(),
    templates: await database.templates.toArray(),
    settings: await database.settings.toArray(),
  }));
}
export const setting = <T>(d: Data, key: string, fallback: T): T =>
  (d.settings.find((s) => s.key === key)?.value as T) ?? fallback;
export async function setSetting(key: string, value: unknown) {
  await db.settings.put({ key, value });
}
export async function touch(id: string) {
  await db.workouts.update(id, { updatedAt: new Date().toISOString() });
}
export async function startWorkout(
  source?: Workout,
  template?: WorkoutTemplate,
  database = db,
): Promise<string> {
  return database.transaction(
    "rw",
    database.workouts,
    database.workoutExercises,
    database.sets,
    database.exercises,
    async () => {
      const draft = await database.workouts
        .where("status")
        .equals("draft")
        .first();
      if (draft) return draft.id;
      const now = new Date().toISOString(),
        id = uid();
      await database.workouts.add({
        id,
        name: source?.name || template?.name || "Моя тренировка",
        date: today(),
        startTime: localTime(),
        endTime: null,
        endDate: null,
        status: "draft",
        notes: "",
        createdAt: now,
        updatedAt: now,
      });
      if (source) {
        const es = ordered(
          await database.workoutExercises
            .where("workoutId")
            .equals(source.id)
            .toArray(),
        );
        for (const e of es) {
          const eid = uid();
          await database.workoutExercises.add({ ...e, id: eid, workoutId: id });
          const ss = await database.sets
            .where("workoutExerciseId")
            .equals(e.id)
            .toArray();
          await database.sets.bulkAdd(
            ss.map((s) => ({
              ...s,
              id: uid(),
              workoutExerciseId: eid,
              isCompleted: false,
            })),
          );
        }
      }
      if (template) {
        for (const [order, exerciseId] of template.exercises.entries()) {
          const e = await database.exercises.get(exerciseId);
          if (!e) continue;
          const eid = uid();
          await database.workoutExercises.add({
            id: eid,
            workoutId: id,
            exerciseId,
            order,
            name: e.name,
            muscleGroup: e.muscleGroup,
            exerciseType: e.exerciseType,
          });
          await database.sets.add({
            id: uid(),
            workoutExerciseId: eid,
            order: 0,
            weight: e.exerciseType === "weighted" ? null : 0,
            reps: null,
            isWarmup: false,
            isCompleted: false,
          });
        }
      }
      return id;
    },
  );
}
export async function addExercise(w: Workout, e: Exercise, d: Data) {
  await db.transaction(
    "rw",
    db.workoutExercises,
    db.sets,
    db.workouts,
    async () => {
      const id = uid();
      await db.workoutExercises.add({
        id,
        workoutId: w.id,
        exerciseId: e.id,
        order: Math.max(-1, ...itemsFor(d, w.id).map((e) => e.order)) + 1,
        name: e.name,
        muscleGroup: e.muscleGroup,
        exerciseType: e.exerciseType,
      });
      const previous = d.workoutExercises
        .filter((x) => x.exerciseId === e.id && x.workoutId !== w.id)
        .sort((a, b) =>
          (
            d.workouts.find((w) => w.id === b.workoutId)?.date || ""
          ).localeCompare(
            d.workouts.find((w) => w.id === a.workoutId)?.date || "",
          ),
        )[0];
      const last = previous
        ? setsFor(d, previous.id).find((s) => !s.isWarmup)
        : undefined;
      await db.sets.add({
        id: uid(),
        workoutExerciseId: id,
        order: 0,
        weight: last?.weight ?? (e.exerciseType === "weighted" ? null : 0),
        reps: last?.reps ?? null,
        isWarmup: false,
        isCompleted: false,
      });
      await touch(w.id);
    },
  );
}
export async function removeExercise(id: string) {
  await db.transaction("rw", db.workoutExercises, db.sets, async () => {
    await db.sets.where("workoutExerciseId").equals(id).delete();
    await db.workoutExercises.delete(id);
  });
}
export async function deleteWorkout(id: string, database = db) {
  await database.transaction(
    "rw",
    database.workouts,
    database.workoutExercises,
    database.sets,
    async () => {
      const es = await database.workoutExercises
        .where("workoutId")
        .equals(id)
        .primaryKeys();
      await database.sets
        .where("workoutExerciseId")
        .anyOf(es as string[])
        .delete();
      await database.workoutExercises.where("workoutId").equals(id).delete();
      await database.workouts.delete(id);
    },
  );
}
export async function reorder<T extends { id: string; order: number }>(
  table: Table<T>,
  rows: T[],
  index: number,
  offset: number,
) {
  const other = rows[index + offset];
  if (!other) return;
  await db.transaction("rw", table, async () => {
    await table.bulkPut(
      rows.map((r, i) => ({
        ...r,
        order: i === index ? index + offset : i === index + offset ? index : i,
      })),
    );
  });
}
export async function updateSet(
  s: WorkoutSet,
  changes: Partial<WorkoutSet>,
  workoutId: string,
) {
  await db.transaction("rw", db.sets, db.workouts, async () => {
    await db.sets.update(s.id, {
      ...changes,
      isCompleted:
        changes.isCompleted ??
        (changes.weight !== undefined || changes.reps !== undefined
          ? false
          : s.isCompleted),
    });
    await touch(workoutId);
  });
}
