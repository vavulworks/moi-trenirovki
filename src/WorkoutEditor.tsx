import { useEffect, useState } from "react";
import {
  Plus,
  Check,
  Trash2,
  Copy,
  ChevronRight,
  ArrowLeft,
  Clock3,
  Timer,
  Flag,
  ShieldCheck,
  MoreHorizontal,
} from "lucide-react";
import {
  db,
  updateSet,
  touch,
  removeExercise,
  reorder,
  setSetting,
  setting,
  deleteWorkout,
} from "./db";
import {
  Data,
  Workout,
  WorkoutExercise,
  WorkoutSet,
  uid,
  today,
  localTime,
  numberRu,
  dateRu,
} from "./types";
import { itemsFor, setsFor, summary, completed, comparable } from "./stats";
import { Run, NumberInput, MoveButtons, Modal, Empty, AutoText } from "./ui";
export function WorkoutEditor({
  d,
  w,
  run,
  onBack,
  onAdd,
  onFinish,
  onExerciseHistory,
}: {
  d: Data;
  w: Workout;
  run: Run;
  onBack: () => void;
  onAdd: () => void;
  onFinish: () => void;
  onExerciseHistory: (id: string) => void;
}) {
  const [finish, setFinish] = useState(false),
    [timer, setTimer] = useState(false),
    [now, setNow] = useState(Date.now());
  const es = itemsFor(d, w.id),
    sum = summary(d, [w]);
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  const elapsed = Math.max(
    0,
    Math.floor((now - new Date(`${w.date}T${w.startTime}`).getTime()) / 60000),
  );
  const change = (changes: Partial<Workout>) =>
    run(async () => {
      const next = { ...w, ...changes };
      if (
        next.status === "completed" &&
        new Date(`${next.endDate}T${next.endTime}`) <
          new Date(`${next.date}T${next.startTime}`)
      )
        throw new Error(
          "Окончание должно быть не раньше начала. Сначала измените дату или время окончания.",
        );
      await db.workouts.update(w.id, {
        ...changes,
        updatedAt: new Date().toISOString(),
      });
    });
  return (
    <>
      <div className="page-heading">
        <div>
          <button className="text-button back" onClick={onBack}>
            <ArrowLeft size={16} />{" "}
            {w.status === "draft" ? "На главную" : "К тренировке"}
          </button>
          <h1>{w.status === "draft" ? "Ваша тренировка" : "Редактирование"}</h1>
          <p>
            <ShieldCheck size={14} /> Изменения автоматически сохраняются на
            устройстве
          </p>
        </div>
        <button className="secondary" onClick={() => setTimer(true)}>
          <Timer size={18} /> <span>Отдых</span>
        </button>
      </div>
      <div className="editor-meta card">
        <label className="name-label">
          Название
          <AutoText
            maxLength={200}
            value={w.name}
            onChange={(name) => change({ name })}
          />
        </label>
        <div className="date-fields">
          <label>
            Дата
            <input
              type="date"
              aria-label="Дата тренировки"
              value={w.date}
              required
              onChange={(e) => {
                if (e.target.value) change({ date: e.target.value });
              }}
            />
          </label>
          <label>
            Начало
            <input
              type="time"
              aria-label="Время начала"
              value={w.startTime}
              required
              onChange={(e) => {
                if (e.target.value) change({ startTime: e.target.value });
              }}
            />
          </label>
          {w.status === "completed" && (
            <>
              <label>
                Дата окончания
                <input
                  type="date"
                  value={w.endDate || w.date}
                  onChange={(e) => {
                    if (e.target.value) change({ endDate: e.target.value });
                  }}
                />
              </label>
              <label>
                Окончание
                <input
                  type="time"
                  value={w.endTime || ""}
                  onChange={(e) => {
                    if (e.target.value) change({ endTime: e.target.value });
                  }}
                />
              </label>
            </>
          )}
          <div className="elapsed">
            <Clock3 size={18} />
            <strong>{w.status === "draft" ? elapsed : sum.minutes}</strong> мин
          </div>
        </div>
      </div>
      <div className="editor-summary">
        <span>
          <b>{es.length}</b> упражнений
        </span>
        <span>
          <b>{sum.sets}</b> рабочих подходов
        </span>
        <span>
          <b>{numberRu(sum.volume)}</b> кг·повт. с отягощением
        </span>
        {sum.bodyReps > 0 && (
          <span>
            <b>{sum.bodyReps}</b> повт. со своим весом
          </span>
        )}
        {sum.seconds > 0 && (
          <span>
            <b>{sum.seconds}</b> сек. на время
          </span>
        )}
      </div>
      {es.length === 0 && (
        <div className="card">
          <Empty
            title="С чего начнём?"
            description="Выберите первое упражнение. Вес и повторы можно менять прямо в строке."
          >
            <button className="primary" onClick={onAdd}>
              <Plus size={18} /> Добавить упражнение
            </button>
          </Empty>
        </div>
      )}
      <div className="exercise-stack">
        {es.map((e, i) => (
          <ExerciseCard
            key={e.id}
            d={d}
            w={w}
            e={e}
            index={i}
            count={es.length}
            run={run}
            onHistory={() => onExerciseHistory(e.exerciseId)}
          />
        ))}
      </div>
      {es.length > 0 && (
        <button className="add-exercise" onClick={onAdd}>
          <Plus size={20} /> Добавить упражнение
        </button>
      )}
      <label className="notes-label">
        Заметки к тренировке
        <AutoText
          multiline
          placeholder="Самочувствие, техника, что попробовать в следующий раз…"
          value={w.notes}
          maxLength={50000}
          onChange={(notes) => change({ notes })}
        />
      </label>
      <div className="editor-footer">
        <span className="muted">
          <ShieldCheck size={15} /> Локальное сохранение
        </span>
        {w.status === "draft" ? (
          <button className="primary" onClick={() => setFinish(true)}>
            <Flag size={18} /> Завершить тренировку
          </button>
        ) : (
          <button
            className="primary"
            onClick={() => {
              if (
                !w.endDate ||
                !w.endTime ||
                new Date(`${w.endDate}T${w.endTime}`) <
                  new Date(`${w.date}T${w.startTime}`)
              ) {
                window.alert(
                  "Окончание должно быть не раньше начала тренировки.",
                );
                return;
              }
              onBack();
            }}
          >
            <Check size={18} /> Готово
          </button>
        )}
      </div>
      {w.status === "draft" && (
        <button
          className="text-button danger discard-draft"
          onClick={() => {
            if (
              window.confirm(
                "Удалить черновик вместе со всеми подходами? Это действие нельзя отменить.",
              )
            )
              run(async () => {
                await deleteWorkout(w.id);
                onBack();
              }, "Черновик удалён");
          }}
        >
          <Trash2 size={14} /> Удалить черновик
        </button>
      )}
      {finish && (
        <Finish
          d={d}
          w={w}
          run={run}
          onClose={() => setFinish(false)}
          onDone={onFinish}
        />
      )}
      {timer && (
        <RestSettings d={d} run={run} onClose={() => setTimer(false)} />
      )}
    </>
  );
}
function ExerciseCard({
  d,
  w,
  e,
  index,
  count,
  run,
  onHistory,
}: {
  d: Data;
  w: Workout;
  e: WorkoutExercise;
  index: number;
  count: number;
  run: Run;
  onHistory: () => void;
}) {
  const ss = setsFor(d, e.id);
  const [menu, setMenu] = useState(false);
  const previous = completed(d)
    .filter(
      (x) =>
        x.id !== w.id && `${x.date}${x.startTime}` <= `${w.date}${w.startTime}`,
    )
    .flatMap((x) => itemsFor(d, x.id))
    .find((x) => x.exerciseId === e.exerciseId);
  const prev = previous
    ? setsFor(d, previous.id).filter((s) => s.isCompleted)
    : [];
  const add = (source?: WorkoutSet) =>
    run(async () => {
      const candidate = source || ss.at(-1);
      const last = candidate ? await db.sets.get(candidate.id) : undefined;
      await db.sets.add({
        id: uid(),
        workoutExerciseId: e.id,
        order: Math.max(-1, ...ss.map((s) => s.order)) + 1,
        weight: last?.weight ?? (e.exerciseType === "weighted" ? null : 0),
        reps: last?.reps ?? null,
        isWarmup: last?.isWarmup || false,
        isCompleted: false,
      });
      await touch(w.id);
    });
  async function toggle(s: WorkoutSet) {
    await db.transaction("rw", db.sets, db.workouts, db.settings, async () => {
      const current = await db.sets.get(s.id);
      if (!current) throw new Error("Подход уже удалён.");
      if (
        !current.isCompleted &&
        (!current.reps ||
          current.reps < 1 ||
          (e.exerciseType === "weighted" && current.weight === null))
      )
        throw new Error(
          "Укажите " +
            (e.exerciseType === "weighted" ? "вес и " : "") +
            (e.exerciseType === "duration"
              ? "длительность."
              : "количество повторений."),
        );
      await updateSet(current, { isCompleted: !current.isCompleted }, w.id);
      if (!current.isCompleted && setting(d, "autoRest", false))
        await setSetting(
          "restEnd",
          Date.now() + setting(d, "restSeconds", 90) * 1000,
        );
    });
  }
  return (
    <section className="exercise-card card">
      <div className="exercise-title">
        <div className="exercise-index">
          {String(index + 1).padStart(2, "0")}
        </div>
        <div className="grow">
          <span className="eyebrow">
            {e.muscleGroup}{" "}
            {e.exerciseType === "bodyweight"
              ? "· свой вес"
              : e.exerciseType === "duration"
                ? "· на время"
                : ""}
          </span>
          <h3>{e.name}</h3>
        </div>
        <button
          className="icon-button"
          aria-label={`Действия: ${e.name}`}
          onClick={() => setMenu(!menu)}
        >
          <MoreHorizontal size={20} />
        </button>
      </div>
      {menu && (
        <div className="exercise-actions">
          <MoveButtons
            index={index}
            length={count}
            label={e.name}
            onMove={(offset) =>
              run(() =>
                reorder(db.workoutExercises, itemsFor(d, w.id), index, offset),
              )
            }
          />
          <button
            className="text-button danger"
            onClick={() => {
              if (
                window.confirm(
                  `Удалить «${e.name}» из этой тренировки вместе с подходами?`,
                )
              )
                run(() => removeExercise(e.id));
            }}
          >
            <Trash2 size={15} /> Удалить из тренировки
          </button>
        </div>
      )}
      <button className="previous-result" onClick={onHistory}>
        {prev.length
          ? `Прошлый раз: ${prev.map((s) => `${e.exerciseType === "weighted" ? `${s.weight} × ` : ""}${s.reps}${e.exerciseType === "duration" ? " с" : ""}${s.isWarmup ? " (р)" : ""}`).join(", ")}`
          : "Первое выполнение · история появится здесь"}
        <ChevronRight size={15} />
      </button>
      <div
        className={
          "set-table " + (e.exerciseType !== "weighted" ? "unweighted" : "")
        }
      >
        <div className="set-head">
          <span>№</span>
          <span>Тип</span>
          {e.exerciseType === "weighted" && <span>Вес, кг</span>}
          <span>{e.exerciseType === "duration" ? "Секунды" : "Повторы"}</span>
          <span>Готово</span>
          <span />
        </div>
        {ss.map((s, i) => (
          <div
            className={"set-row " + (s.isCompleted ? "done" : "")}
            key={s.id}
          >
            <span className="set-number">{i + 1}</span>
            <button
              className={"set-type " + (s.isWarmup ? "warmup" : "")}
              title="Переключить тип подхода"
              aria-label={`Тип подхода ${i + 1}: ${s.isWarmup ? "разминочный" : "рабочий"}`}
              onClick={() =>
                run(() => updateSet(s, { isWarmup: !s.isWarmup }, w.id))
              }
            >
              {s.isWarmup ? "Р" : "Рб"}
            </button>
            {e.exerciseType === "weighted" && (
              <NumberInput
                label={`Вес подхода ${i + 1} ${e.name}`}
                value={s.weight}
                onChange={(weight) => run(() => updateSet(s, { weight }, w.id))}
              />
            )}
            <NumberInput
              integer
              label={`${e.exerciseType === "duration" ? "Секунды" : "Повторы"} подхода ${i + 1} ${e.name}`}
              value={s.reps}
              onChange={(reps) => run(() => updateSet(s, { reps }, w.id))}
            />
            <button
              className={"complete-set " + (s.isCompleted ? "checked" : "")}
              aria-label={`Подход ${i + 1} ${e.name}: ${s.isCompleted ? "выполнен" : "отметить выполненным"}`}
              aria-pressed={s.isCompleted}
              onClick={() => run(() => toggle(s))}
            >
              <Check size={18} />
            </button>
            <SetMenu s={s} ss={ss} i={i} run={run} onCopy={() => add(s)} />
          </div>
        ))}
      </div>
      <div className="sets-footer">
        <button className="text-button" onClick={() => add()}>
          <Plus size={16} /> Добавить подход
        </button>
        <span>Рб — рабочий · Р — разминка</span>
      </div>
    </section>
  );
}
function SetMenu({
  s,
  ss,
  i,
  run,
  onCopy,
}: {
  s: WorkoutSet;
  ss: WorkoutSet[];
  i: number;
  run: Run;
  onCopy: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="set-menu">
      <button
        className="icon-button small"
        aria-label={`Действия с подходом ${i + 1}`}
        onClick={() => setOpen(!open)}
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div className="set-popover">
          <MoveButtons
            index={i}
            length={ss.length}
            label={`Подход ${i + 1}`}
            onMove={(n) =>
              run(async () => {
                await reorder(db.sets, ss, i, n);
                setOpen(false);
              })
            }
          />
          <button
            className="icon-button"
            aria-label="Копировать подход"
            onClick={() => {
              onCopy();
              setOpen(false);
            }}
          >
            <Copy size={16} />
          </button>
          <button
            className="icon-button danger"
            aria-label="Удалить подход"
            onClick={() => run(() => db.sets.delete(s.id))}
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
function Finish({
  d,
  w,
  run,
  onClose,
  onDone,
}: {
  d: Data;
  w: Workout;
  run: Run;
  onClose: () => void;
  onDone: () => void;
}) {
  const [date, setDate] = useState(today()),
    [time, setTime] = useState(localTime());
  const sum = summary(d, [w]);
  return (
    <Modal title="Завершить тренировку" onClose={onClose}>
      <p className="muted">
        Невыполненные подходы останутся в записи, но не попадут в показатели
        нагрузки.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            if (
              !d.sets.some(
                (s) =>
                  itemsFor(d, w.id).some((e) => e.id === s.workoutExerciseId) &&
                  s.isCompleted,
              )
            )
              throw new Error(
                "Сначала отметьте хотя бы один выполненный подход.",
              );
            if (
              new Date(`${date}T${time}`) < new Date(`${w.date}T${w.startTime}`)
            )
              throw new Error("Окончание должно быть не раньше начала.");
            await db.workouts.update(w.id, {
              status: "completed",
              endTime: time,
              endDate: date,
              updatedAt: new Date().toISOString(),
            });
            await setSetting("restEnd", null);
            onDone();
          });
        }}
      >
        <div className="form-row">
          <label>
            Дата окончания
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label>
            Время окончания
            <input
              type="time"
              required
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </label>
        </div>
        <div className="mini-summary">
          <span>{sum.sets} рабочих подходов</span>
          <span>{numberRu(sum.volume)} кг·повт.</span>
        </div>
        <button className="primary full" type="submit">
          <Check size={18} /> Завершить и посмотреть итог
        </button>
      </form>
    </Modal>
  );
}
export function RestSettings({
  d,
  run,
  onClose,
}: {
  d: Data;
  run: Run;
  onClose: () => void;
}) {
  const sec = setting(d, "restSeconds", 90);
  return (
    <Modal title="Таймер отдыха" onClose={onClose}>
      <p className="muted">
        Сделайте паузу между подходами. Таймер пересчитывается при возвращении в
        приложение.
      </p>
      <div className="preset-row">
        {[60, 90, 120, 180].map((n) => (
          <button
            key={n}
            className={"pill " + (sec === n ? "selected" : "")}
            onClick={() => run(() => setSetting("restSeconds", n))}
          >
            {n} с
          </button>
        ))}
      </div>
      <label>
        Свой интервал, секунды
        <NumberInput
          integer
          label="Длительность отдыха в секундах"
          value={sec}
          onChange={(n) => {
            if (n !== null && n >= 1 && n <= 3600)
              run(() => setSetting("restSeconds", n));
          }}
        />
      </label>
      <label className="switch-row">
        <span>Запуск после выполненного подхода</span>
        <input
          type="checkbox"
          checked={setting(d, "autoRest", false)}
          onChange={(e) => run(() => setSetting("autoRest", e.target.checked))}
        />
      </label>
      <button
        className="primary full"
        onClick={() =>
          run(async () => {
            await setSetting("restEnd", Date.now() + sec * 1000);
            onClose();
          })
        }
      >
        <Timer size={18} /> Начать отдых
      </button>
      <p className="hint">
        На iPhone фоновый сигнал не гарантируется. Оставьте приложение открытым,
        чтобы видеть окончание отдыха.
      </p>
    </Modal>
  );
}
export function WorkoutDetail({
  d,
  w,
  run,
  onEdit,
  onRepeat,
  onTemplate,
  onBack,
}: {
  d: Data;
  w: Workout;
  run: Run;
  onEdit: () => void;
  onRepeat: () => void;
  onTemplate: () => void;
  onBack: () => void;
}) {
  const es = itemsFor(d, w.id),
    sum = summary(d, [w]);
  const previous = completed(d).filter(
    (x) => `${x.date}${x.startTime}` < `${w.date}${w.startTime}`,
  )[0];
  const canCompare = previous && comparable(es, itemsFor(d, previous.id));
  const prev = canCompare ? summary(d, [previous]) : null;
  return (
    <>
      <button className="text-button back" onClick={onBack}>
        <ArrowLeft size={16} /> К истории
      </button>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            {dateRu(w.date)} · {w.startTime}–{w.endTime}
          </span>
          <h1>{w.name || "Тренировка"}</h1>
          <p>Каждый подход — вклад в ваш прогресс.</p>
        </div>
        <button className="secondary" onClick={onEdit}>
          Редактировать
        </button>
      </div>
      <div className="stats-grid">
        <div className="metric">
          <span>Продолжительность</span>
          <div className="metric-value">
            {sum.minutes}
            <span>мин</span>
          </div>
        </div>
        <div className="metric">
          <span>Упражнения</span>
          <div className="metric-value">{es.length}</div>
        </div>
        <div className="metric">
          <span>Рабочие подходы</span>
          <div className="metric-value">{sum.sets}</div>
        </div>
        <div className="metric">
          <span>Объём с отягощением</span>
          <div className="metric-value">
            {numberRu(sum.volume)}
            <span>кг·повт.</span>
          </div>
        </div>
      </div>
      {(sum.bodyReps > 0 || sum.seconds > 0) && (
        <p className="muted">
          {sum.bodyReps > 0
            ? `Собственный вес: ${sum.bodyReps} повторений. `
            : ""}
          {sum.seconds > 0 ? `Упражнения на время: ${sum.seconds} секунд.` : ""}
        </p>
      )}
      {prev && prev.volume > 0 && (
        <p className="comparison">
          Объём {sum.volume >= prev.volume ? "+" : ""}
          {Math.round(((sum.volume - prev.volume) / prev.volume) * 100)}% к
          предыдущей тренировке с тем же набором упражнений. Это изменение
          нагрузки, а не оценка силы.
        </p>
      )}
      <div className="action-row">
        <button className="primary" onClick={onRepeat}>
          <Copy size={17} /> Повторить тренировку
        </button>
        <button className="secondary" onClick={onTemplate}>
          Сохранить как шаблон
        </button>
      </div>
      {es.map((e) => (
        <div className="card detail-exercise" key={e.id}>
          <span className="eyebrow">{e.muscleGroup}</span>
          <h3>{e.name}</h3>
          <div className="detail-sets">
            {setsFor(d, e.id).map((s, i) => (
              <div key={s.id} className={!s.isCompleted ? "muted" : ""}>
                <span>{i + 1}</span>
                <strong>
                  {e.exerciseType === "weighted"
                    ? `${numberRu(s.weight || 0)} кг × `
                    : ""}
                  {s.reps ?? "—"}{" "}
                  {e.exerciseType === "duration"
                    ? "сек."
                    : e.exerciseType === "bodyweight"
                      ? "повт."
                      : ""}
                </strong>
                <small>{s.isWarmup ? "Разминка" : "Рабочий"}</small>
                {s.isCompleted ? <Check size={16} /> : <span>—</span>}
              </div>
            ))}
          </div>
        </div>
      ))}
      {w.notes && (
        <div className="card detail-exercise">
          <h3>Заметки</h3>
          <p className="preserve">{w.notes}</p>
        </div>
      )}
    </>
  );
}
