import { describe, it, expect, afterEach } from "vitest";
import { TrainingDB, startWorkout, readData, deleteWorkout } from "../db";
import {
  e1rm,
  summary,
  duration,
  exercisePoints,
  within,
  rangeStart,
  comparable,
} from "../stats";
import { makeBackup, validateBackup, restoreBackup } from "../backup";
import { report, reportJson, csv } from "../export";
import { fixture, workout } from "./fixtures";
const databases: TrainingDB[] = [];
const database = () => {
  const d = new TrainingDB(crypto.randomUUID());
  databases.push(d);
  return d;
};
afterEach(async () => {
  for (const d of databases.splice(0)) await d.delete();
});
describe("Расчёты", () => {
  it("исключает разминку и незавершённые подходы, отдельно считает собственный вес и время", () => {
    const d = fixture(),
      s = summary(d, d.workouts);
    expect(s).toMatchObject({
      volume: 1120,
      sets: 4,
      bodyReps: 12,
      seconds: 45,
      minutes: 60,
      average: 60,
      count: 1,
    });
    expect(s.muscle["Грудь"]).toBe(3);
    expect(s.frequency["Грудь"]).toBe(1);
  });
  it("рассчитывает e1RM только для выполненных рабочих подходов на 1–10 повторений с отягощением", () => {
    const d = fixture(),
      e = d.workoutExercises[0],
      s = d.sets[1];
    expect(e1rm(s, e)).toBeCloseTo(80);
    for (const change of [
      { reps: 11 },
      { reps: 0 },
      { isWarmup: true },
      { isCompleted: false },
      { weight: null },
    ])
      expect(e1rm({ ...s, ...change }, e)).toBeNull();
    expect(e1rm(s, d.workoutExercises[1])).toBeNull();
    expect(e1rm(s, d.workoutExercises[2])).toBeNull();
  });
  it("корректно обрабатывает ночь и пустую историю", () => {
    expect(
      duration({
        ...workout,
        startTime: "23:30",
        endTime: "00:20",
        endDate: "2026-11-11",
      }),
    ).toBe(50);
    expect(duration({ ...workout, endTime: null })).toBe(0);
    expect(summary(fixture(), [])).toMatchObject({
      count: 0,
      average: 0,
      volume: 0,
    });
  });
  it("агрегирует упражнение по тренировкам и возвращает точные максимумы", () => {
    const d = fixture(),
      p = exercisePoints(d, d.workouts, d.exercises[0].id)[0];
    expect(p).toMatchObject({ weight: 65, reps: 10, volume: 1120 });
    expect(p.e1rm).toBeCloseTo(65 * (1 + 8 / 30));
    expect(
      exercisePoints(d, d.workouts, d.exercises[1].id)[0].volume,
    ).toBeNull();
  });
  it("фильтрует даты включительно и считает интервалы через месяцы и годы", () => {
    expect(within([workout], "2026-11-10", "2026-11-10")).toHaveLength(1);
    expect(within([workout], "2026-11-11", "")).toHaveLength(0);
    expect(rangeStart(7, "2026-01-03")).toBe("2025-12-28");
    expect(comparable([], [])).toBe(false);
  });
});
describe("Резервные копии и база", () => {
  it("сериализует все записи без потери точности и восстанавливает их", async () => {
    const d = fixture();
    d.sets[1].weight = 12.5;
    const b = makeBackup(d),
      round = JSON.parse(JSON.stringify(b));
    expect(validateBackup(round)).toEqual(b);
    const db = database();
    await restoreBackup(round, db);
    expect(await readData(db)).toEqual(
      expect.objectContaining({
        workouts: d.workouts,
        sets: expect.arrayContaining(d.sets),
        exercises: expect.arrayContaining(d.exercises),
        templates: d.templates,
        settings: expect.arrayContaining(d.settings),
      }),
    );
  });
  it("отклоняет неподдерживаемую версию, дубликаты, неверные даты, отрицательные значения и повреждённые связи", () => {
    for (const mutate of [
      (b: any) => (b.version = 2),
      (b: any) => (b.workouts[0].date = "2026-02-30"),
      (b: any) => (b.sets[0].weight = -1),
      (b: any) => b.sets.push(b.sets[0]),
      (b: any) => (b.sets[0].workoutExerciseId = "missing"),
      (b: any) => (b.templates[0].exercises = ["unknown"]),
      (b: any) => b.settings.push({ key: "theme", value: "unknown" }),
      (b: any) => (b.workouts[0].endTime = "10:00"),
    ]) {
      const b = makeBackup(fixture());
      mutate(b);
      expect(() => validateBackup(b)).toThrow();
    }
  });
  it("не изменяет существующую базу после неудачного импорта", async () => {
    const db = database();
    await restoreBackup(makeBackup(fixture()), db);
    const before = await readData(db);
    await expect(
      restoreBackup({ ...makeBackup(fixture()), sets: [{ id: "broken" }] }, db),
    ).rejects.toThrow();
    expect(await readData(db)).toEqual(before);
  });
  it("откатывает замену целиком при ошибке записи внутри транзакции", async () => {
    const db = database();
    await restoreBackup(makeBackup(fixture()), db);
    const before = await readData(db);
    const fail = () => {
      throw new Error("Сбой записи");
    };
    db.exercises.hook("creating", fail);
    await expect(restoreBackup(makeBackup(fixture()), db)).rejects.toThrow(
      "Сбой записи",
    );
    db.exercises.hook("creating").unsubscribe(fail);
    expect(await readData(db)).toEqual(before);
  });
  it("сохраняет черновик после закрытия базы и не создаёт дубль при повторном старте", async () => {
    const db = database();
    const [a, b] = await Promise.all([
      startWorkout(undefined, undefined, db),
      startWorkout(undefined, undefined, db),
    ]);
    expect(a).toBe(b);
    await db.workouts.update(a, { notes: "Не потерять" });
    db.close();
    await db.open();
    expect(await startWorkout(undefined, undefined, db)).toBe(a);
    expect((await db.workouts.get(a))?.notes).toBe("Не потерять");
  });
  it("повторяет тренировку с новыми идентификаторами и невыполненными подходами", async () => {
    const db = database();
    await restoreBackup(makeBackup(fixture()), db);
    const id = await startWorkout(workout, undefined, db);
    const d = await readData(db),
      es = d.workoutExercises.filter((e) => e.workoutId === id),
      ids = new Set(es.map((e) => e.id)),
      ss = d.sets.filter((s) => ids.has(s.workoutExerciseId));
    expect(es).toHaveLength(3);
    expect(ss).toHaveLength(6);
    expect(ss.every((s) => !s.isCompleted)).toBe(true);
    expect(d.workouts.find((w) => w.id === "w1")?.status).toBe("completed");
    expect(d.sets.find((s) => s.id === "s2")?.isCompleted).toBe(true);
  });
  it("переименование каталога не меняет снимки истории", async () => {
    const db = database();
    await restoreBackup(makeBackup(fixture()), db);
    await db.exercises.update(fixture().exercises[0].id, {
      name: "Новое имя",
      exerciseType: "bodyweight",
    });
    expect((await db.workoutExercises.get("we0"))?.name).toBe(
      "Жим штанги лёжа",
    );
    expect((await db.workoutExercises.get("we0"))?.exerciseType).toBe(
      "weighted",
    );
  });
  it("удаляет тренировку и её дочерние записи без удаления каталога", async () => {
    const db = database();
    await restoreBackup(makeBackup(fixture()), db);
    await deleteWorkout("w1", db);
    const d = await readData(db);
    expect(d.workouts).toHaveLength(0);
    expect(d.workoutExercises).toHaveLength(0);
    expect(d.sets).toHaveLength(0);
    expect(d.exercises).toHaveLength(3);
  });
});
describe("Экспорт", () => {
  it("формирует отчёт только из реальных записей с точными итогами", () => {
    const d = fixture(),
      text = report(d, d.workouts, "2026-11-10", "2026-11-10");
    expect(text).toContain("10.11.2026");
    expect(text).toContain("18:30–19:30");
    expect(text).toContain("20 кг × 12 (разминка)");
    expect(text).toContain("[не выполнен]");
    expect(text.replace(/[\s\u00a0\u202f]/g, "")).toContain("1120");
    expect(text).toContain("собственный вес");
    expect(text).toContain("Для оценки изменения");
  });
  it("сохраняет идентификаторы, десятичные веса и флаги в JSON отчёте", () => {
    const d = fixture();
    d.sets[1].weight = 12.5;
    const b = JSON.parse(reportJson(d, d.workouts));
    expect(b.sets.find((s: any) => s.id === "s2")).toMatchObject({
      weight: 12.5,
      isCompleted: true,
      isWarmup: false,
      workoutExerciseId: "we0",
    });
  });
  it("экспорт одного упражнения исключает остальные подходы", () => {
    const d = fixture(),
      b = JSON.parse(reportJson(d, d.workouts, d.exercises[1].id));
    expect(b.workoutExercises).toHaveLength(1);
    expect(b.sets).toHaveLength(1);
    expect(b.sets[0].id).toBe("s5");
  });
  it("CSV содержит статус и тип, экранирует опасные ячейки", () => {
    const d = fixture();
    d.workoutExercises[0].name = "=1+1";
    const text = csv(d);
    expect(text.startsWith("\uFEFF")).toBe(true);
    expect(text).toContain('"\'=1+1"');
    expect(text).toContain('"weighted"');
    expect(text).toContain('"completed"');
  });
});
