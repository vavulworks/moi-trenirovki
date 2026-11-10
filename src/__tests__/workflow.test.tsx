import { useLiveQuery } from "dexie-react-hooks";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { db, startWorkout, readData, addExercise } from "../db";
import { WorkoutEditor } from "../WorkoutEditor";
import { summary } from "../stats";
import { ExerciseList, ExerciseForm, TemplateForm } from "../pages";
import { uid } from "../types";
beforeEach(async () => {
  await db.delete();
  await db.open();
});
afterEach(async () => {
  await db.delete();
});
function Editor({ id }: { id: string }) {
  const d = useLiveQuery(() => readData(), []);
  if (!d) return null;
  const w = d.workouts.find((w) => w.id === id)!;
  return (
    <WorkoutEditor
      d={d}
      w={w}
      run={async (fn) => {
        await fn();
      }}
      onBack={() => {}}
      onAdd={() => {}}
      onFinish={() => {}}
      onExerciseHistory={() => {}}
    />
  );
}
describe("Рабочий сценарий", () => {
  it("записывает пять упражнений, дробный вес, правки, копирование, выполнение и завершение", async () => {
    const user = userEvent.setup(),
      id = await startWorkout();
    let d = await readData();
    const ex = d.exercises.slice(0, 5);
    for (const e of ex) {
      await addExercise(d.workouts[0], e, d);
      d = await readData();
    }
    expect(d.workoutExercises).toHaveLength(5);
    const view = render(<Editor id={id} />);
    const weight = await screen.findByLabelText(`Вес подхода 1 ${ex[0].name}`),
      reps = screen.getByLabelText(`Повторы подхода 1 ${ex[0].name}`);
    await user.type(weight, "12,5");
    await user.type(reps, "10");
    await user.click(
      screen.getByLabelText(`Подход 1 ${ex[0].name}: отметить выполненным`),
    );
    await waitFor(async () => {
      const d = await readData();
      expect(summary(d, d.workouts).volume).toBe(125);
    });
    await user.click(screen.getAllByText("Добавить подход")[0]);
    await waitFor(() =>
      expect(screen.getByLabelText(`Вес подхода 2 ${ex[0].name}`)).toBeTruthy(),
    );
    expect(
      (screen.getByLabelText(`Вес подхода 2 ${ex[0].name}`) as HTMLInputElement)
        .value,
    ).toBe("12,5");
    await user.clear(weight);
    await user.type(weight, "15");
    await user.click(reps);
    await waitFor(async () => {
      const d = await readData();
      expect(summary(d, d.workouts).volume).toBe(0);
    });
    await user.click(
      screen.getByLabelText(`Подход 1 ${ex[0].name}: отметить выполненным`),
    );
    view.unmount();
    db.close();
    await db.open();
    render(<Editor id={id} />);
    await screen.findByText("Ваша тренировка");
    expect((await readData()).workouts[0].status).toBe("draft");
    await user.click(screen.getByText("Завершить тренировку"));
    await user.click(await screen.findByText("Завершить и посмотреть итог"));
    await waitFor(async () =>
      expect((await readData()).workouts[0].status).toBe("completed"),
    );
  });
  it("создаёт своё упражнение и находит его по названию", async () => {
    const user = userEvent.setup(),
      d = await readData();
    const close = vi.fn();
    render(
      <ExerciseForm
        d={d}
        run={async (fn) => {
          await fn();
        }}
        onClose={close}
      />,
    );
    await user.type(
      screen.getByLabelText("Название"),
      "Тяга в новом тренажёре",
    );
    await user.click(screen.getByText("Создать упражнение"));
    await waitFor(() => expect(close).toHaveBeenCalled());
    const updated = await readData();
    expect(
      updated.exercises.some(
        (e) => e.name === "Тяга в новом тренажёре" && e.isCustom,
      ),
    ).toBe(true);
    render(<ExerciseList d={updated} onEdit={() => {}} />);
    await user.type(screen.getByLabelText("Поиск упражнений"), "новом");
    expect(screen.getByText("Тяга в новом тренажёре")).toBeTruthy();
  });
  it("переставляет упражнения в шаблоне без случайной отправки формы", async () => {
    const user = userEvent.setup(),
      d = await readData();
    const done = vi.fn();
    render(
      <TemplateForm
        d={d}
        template={{
          id: uid(),
          name: "Тест",
          exercises: d.exercises.slice(0, 2).map((e) => e.id),
        }}
        run={async (fn) => {
          await fn();
        }}
        onDone={done}
      />,
    );
    await user.click(screen.getAllByLabelText("Упражнение: ниже")[0]);
    expect(done).not.toHaveBeenCalled();
    await user.click(screen.getByText("Сохранить шаблон"));
    await waitFor(() => expect(done).toHaveBeenCalled());
    const result = await db.templates.toArray();
    expect(
      result.some(
        (t) => t.name === "Тест" && t.exercises[0] === d.exercises[1].id,
      ),
    ).toBe(true);
  });
});
