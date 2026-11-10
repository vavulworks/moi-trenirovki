import { useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Dumbbell,
  FileJson,
  Flame,
  FolderOpen,
  HardDrive,
  History as HistoryIcon,
  Leaf,
  LockKeyhole,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Timer,
  Trash2,
  TrendingUp,
  Upload,
  WifiOff,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  Data,
  Workout,
  WorkoutTemplate,
  Exercise,
  ExerciseType,
  groups,
  uid,
  today,
  dateRu,
  localDate,
  numberRu,
  typeLabel,
} from "./types";
import { db, setting, setSetting, deleteWorkout } from "./db";
import {
  completed,
  summary,
  itemsFor,
  setsFor,
  duration,
  within,
  rangeStart,
  exercisePoints,
} from "./stats";
import { Run, Empty, Metric, Modal, Pill, MoveButtons } from "./ui";
import { Backup } from "./types";
import {
  backupNow,
  copy,
  download,
  restoreBackup,
  validateBackup,
} from "./backup";
import { csv, report, reportJson } from "./export";
export function Home({
  d,
  start,
  onOpen,
  onTemplates,
  onHistory,
  onExport,
}: {
  d: Data;
  start: (w?: Workout, t?: WorkoutTemplate) => void;
  onOpen: (w: Workout) => void;
  onTemplates: () => void;
  onHistory: () => void;
  onExport: () => void;
}) {
  const ws = completed(d),
    last = ws[0],
    draft = d.workouts.find((w) => w.status === "draft"),
    month = summary(d, within(ws, rangeStart(30), today()));
  const now = new Date(),
    monday = new Date(`${today()}T12:00:00`);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const week = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(day.getDate() + i);
    return localDate(day);
  });
  const weekCount = ws.filter(
    (w) => w.date >= week[0] && w.date <= week[6],
  ).length;
  return (
    <>
      <div className="page-heading home-heading">
        <div>
          <p className="today-label">
            {new Intl.DateTimeFormat("ru-RU", {
              weekday: "long",
              day: "numeric",
              month: "long",
            }).format(now)}
          </p>
          <h1>
            Всё начинается с движения<span className="heading-dot">.</span>
          </h1>
          <p>Ваш темп. Ваши цели. Ваш прогресс.</p>
        </div>
        <button className="secondary export-top" onClick={onExport}>
          <Sparkles size={17} /> Скопировать для ChatGPT
        </button>
      </div>
      <div className="home-top">
        <section className="hero">
          <div className="hero-content">
            <span className="hero-label">
              <span /> ВАШ ЛИЧНЫЙ ДНЕВНИК
            </span>
            <h2>
              Сильнее с каждой
              <br />
              тренировкой.
            </h2>
            <p>
              Записывайте подходы.
              <br />
              Замечайте, как растёте.
            </p>
            <button
              className="hero-button"
              onClick={() => (draft ? onOpen(draft) : start())}
            >
              {draft ? <ArrowRight size={19} /> : <Plus size={20} />}{" "}
              {draft ? "Продолжить тренировку" : "Начать тренировку"}
            </button>
            <small>
              <ShieldCheck size={13} />{" "}
              {draft
                ? "Черновик сохранён · можно продолжить"
                : "Без регистрации. Всё на вашем устройстве."}
            </small>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="orbit orbit-three" />
            <Dumbbell />
            <span className="art-star star-one">✳</span>
            <span className="art-star star-two">+</span>
            <span className="art-caption">КАЖДЫЙ ПОДХОД ИМЕЕТ ЗНАЧЕНИЕ</span>
          </div>
        </section>
        <section className="rhythm card">
          <div className="section-header">
            <h3>Ваш ритм</h3>
            <span className="tiny-label">ЭТА НЕДЕЛЯ</span>
          </div>
          <div className="rhythm-count">
            <b>{weekCount}</b>
            <span>из 3 тренировок</span>
            <div className="leaf-badge">
              <Leaf size={22} />
            </div>
          </div>
          <div className="week-row">
            {week.map((date, i) => {
              const trained = ws.some((w) => w.date === date);
              return (
                <div
                  key={date}
                  className={
                    "week-day " +
                    (date === today() ? "is-today" : "") +
                    (trained ? " trained" : "")
                  }
                >
                  <span>{["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"][i]}</span>
                  <div>
                    {trained ? <Check size={17} /> : Number(date.slice(-2))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="rhythm-note">
            <span className="status-dot" />
            {weekCount === 0
              ? "Хороший день, чтобы начать"
              : weekCount >= 3
                ? "Отличный ритм! Не забывайте об отдыхе."
                : "Продолжайте в своём темпе"}
          </div>
        </section>
      </div>
      <div className="section-header stats-title">
        <h2>В цифрах</h2>
        <span className="muted">За последние 30 дней</span>
      </div>
      <div className="stats-grid">
        <Metric
          label="Тренировки"
          value={month.count}
          icon={<CalendarDays size={18} />}
        />
        <Metric
          label="Время в зале"
          value={numberRu(month.minutes / 60)}
          unit="ч"
          icon={<Clock3 size={18} />}
        />
        <Metric
          label="Рабочие подходы"
          value={month.sets}
          icon={<Dumbbell size={18} />}
        />
        <Metric
          label="Объём с отягощением"
          value={numberRu(month.volume)}
          unit="кг·повт."
          icon={<TrendingUp size={18} />}
        />
      </div>
      <div className="home-bottom">
        <section className="card last-section">
          <div className="section-header">
            <h2>Последняя тренировка</h2>
            <button className="text-button" onClick={onHistory}>
              Вся история <ChevronRight size={15} />
            </button>
          </div>
          {last ? (
            <>
              <button className="last-workout" onClick={() => onOpen(last)}>
                <div className="workout-icon">
                  <Dumbbell size={23} />
                </div>
                <div className="grow">
                  <h3>{last.name}</h3>
                  <p>
                    {dateRu(last.date)} · {duration(last)} мин ·{" "}
                    {itemsFor(d, last.id).length} упражнений
                  </p>
                  <div className="tags">
                    {[
                      ...new Set(
                        itemsFor(d, last.id).map((e) => e.muscleGroup),
                      ),
                    ]
                      .slice(0, 3)
                      .map((g) => (
                        <span key={g}>{g}</span>
                      ))}
                  </div>
                </div>
                <ChevronRight size={20} />
              </button>
              <button className="secondary full" onClick={() => start(last)}>
                <Copy size={16} /> Повторить тренировку
              </button>
            </>
          ) : (
            <Empty
              icon={<HistoryIcon size={25} />}
              title="Здесь начинается ваша история"
              description="Завершите первую тренировку — и все упражнения, подходы и результаты появятся здесь."
            />
          )}
        </section>
        <section className="card templates-section">
          <div className="section-header">
            <div>
              <h2>Готовый план</h2>
              <p className="muted">Меньше подготовки. Больше движения.</p>
            </div>
            <button
              className="icon-button"
              aria-label="Все шаблоны"
              onClick={onTemplates}
            >
              <ArrowRight size={20} />
            </button>
          </div>
          <div className="template-preview">
            {d.templates.slice(0, 3).map((t, i) => (
              <button
                key={t.id}
                className="template-item"
                onClick={() => start(undefined, t)}
              >
                <span className={"template-symbol color-" + i}>
                  <Dumbbell size={19} />
                </span>
                <span className="grow">
                  <strong>{t.name}</strong>
                  <small>{t.exercises.length} упражнений</small>
                </span>
                <Plus size={19} />
              </button>
            ))}
          </div>
          <button className="text-button template-link" onClick={onTemplates}>
            <Plus size={16} /> Свой шаблон
          </button>
        </section>
      </div>
      <div className="privacy-strip">
        <span className="privacy-icon">
          <LockKeyhole size={17} />
        </span>
        <div>
          <strong>Ваши данные — только ваши.</strong>
          <span>
            {" "}
            Записи хранятся на этом устройстве. Сохраняйте резервные копии в
            настройках.
          </span>
        </div>
        <WifiOff size={19} />
      </div>
    </>
  );
}
export function HistoryPage({
  d,
  onOpen,
  start,
  run,
}: {
  d: Data;
  onOpen: (w: Workout) => void;
  start: (w?: Workout) => void;
  run: Run;
}) {
  const [month, setMonth] = useState(today().slice(0, 7)),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [selected, setSelected] = useState("");
  const ws = completed(d),
    filtered = within(ws, selected || from, selected || to);
  const first = new Date(`${month}-01T12:00:00`),
    days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate(),
    offset = (first.getDay() + 6) % 7;
  const move = (n: number) => {
    const next = new Date(first);
    next.setMonth(next.getMonth() + n);
    setMonth(localDate(next).slice(0, 7));
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ВАШ ДНЕВНИК</span>
          <h1>История тренировок</h1>
          <p>Все усилия остаются с вами.</p>
        </div>
        <span className="count-badge">{ws.length} тренировок</span>
      </div>
      <div className="history-layout">
        <aside className="card calendar">
          <div className="section-header">
            <button
              className="icon-button"
              aria-label="Предыдущий месяц"
              onClick={() => move(-1)}
            >
              <ChevronLeft size={18} />
            </button>
            <h3>
              {new Intl.DateTimeFormat("ru-RU", {
                month: "long",
                year: "numeric",
              }).format(first)}
            </h3>
            <button
              className="icon-button"
              aria-label="Следующий месяц"
              onClick={() => move(1)}
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="calendar-grid">
            {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((x) => (
              <span className="calendar-weekday" key={x}>
                {x}
              </span>
            ))}
            {Array.from({ length: offset }, (_, i) => (
              <span key={"blank" + i} />
            ))}
            {Array.from({ length: days }, (_, i) => {
              const date = `${month}-${String(i + 1).padStart(2, "0")}`;
              return (
                <button
                  key={date}
                  className={
                    (date === today() ? "today " : "") +
                    (selected === date ? "selected " : "") +
                    (ws.some((w) => w.date === date) ? "has-workout" : "")
                  }
                  aria-label={dateRu(date)}
                  aria-pressed={selected === date}
                  onClick={() => setSelected(selected === date ? "" : date)}
                >
                  {i + 1}
                  <i />
                </button>
              );
            })}
          </div>
          <div className="calendar-legend">
            <span className="status-dot" /> День тренировки
          </div>
          {selected && (
            <button className="text-button" onClick={() => setSelected("")}>
              Сбросить выбранный день
            </button>
          )}
          <div className="date-filter">
            <label>
              Период с
              <input
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => {
                  setSelected("");
                  setFrom(e.target.value);
                }}
              />
            </label>
            <label>
              по
              <input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => {
                  setSelected("");
                  setTo(e.target.value);
                }}
              />
            </label>
            {(from || to) && (
              <button
                className="text-button"
                onClick={() => {
                  setFrom("");
                  setTo("");
                }}
              >
                Весь период
              </button>
            )}
          </div>
        </aside>
        <div className="history-list">
          {filtered.length === 0 ? (
            <div className="card">
              <Empty
                icon={<CalendarDays size={28} />}
                title="Пока нет записей"
                description={
                  ws.length
                    ? "В выбранном периоде нет завершённых тренировок. Выберите другие даты."
                    : "Начните первую тренировку — история сохранится автоматически."
                }
              />
            </div>
          ) : (
            filtered.map((w) => {
              const s = summary(d, [w]);
              return (
                <article className="card history-card" key={w.id}>
                  <button
                    className="workout-list-main"
                    onClick={() => onOpen(w)}
                  >
                    <div className="date-tile">
                      <strong>{Number(w.date.slice(-2))}</strong>
                      <span>
                        {new Intl.DateTimeFormat("ru-RU", {
                          month: "short",
                        }).format(new Date(`${w.date}T12:00:00`))}
                      </span>
                    </div>
                    <div className="grow">
                      <span className="eyebrow">
                        {dateRu(w.date)} · {w.startTime}
                      </span>
                      <h3>{w.name}</h3>
                      <p>
                        {s.minutes} мин · {itemsFor(d, w.id).length} упражнений
                        · {s.sets} подходов
                      </p>
                    </div>
                    <ChevronRight size={20} />
                  </button>
                  <div className="history-card-bottom">
                    <span>
                      {s.volume > 0 ? (
                        <>
                          {numberRu(s.volume)}{" "}
                          <small>кг·повт. с отягощением</small>
                        </>
                      ) : s.bodyReps > 0 ? (
                        <>
                          {s.bodyReps} <small>повт. со своим весом</small>
                        </>
                      ) : s.seconds > 0 ? (
                        <>
                          {s.seconds} <small>сек. на время</small>
                        </>
                      ) : (
                        <small>Нет рабочих подходов с отягощением</small>
                      )}
                    </span>
                    <div>
                      <button
                        className="icon-button"
                        aria-label="Повторить тренировку"
                        onClick={() => start(w)}
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        className="icon-button danger"
                        aria-label="Удалить тренировку"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Удалить тренировку от ${dateRu(w.date)}? Это действие нельзя отменить.`,
                            )
                          )
                            run(async () => {
                              await deleteWorkout(w.id);
                            }, "Тренировка удалена");
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
export function ProgressPage({
  d,
  selectedExercise,
  onSelect,
  onOpen,
}: {
  d: Data;
  selectedExercise: string;
  onSelect: (id: string) => void;
  onOpen: (w: Workout) => void;
}) {
  const [period, setPeriod] = useState(selectedExercise ? "all" : "30"),
    [from, setFrom] = useState(rangeStart(30)),
    [to, setTo] = useState(today()),
    [chart, setChart] = useState("weight");
  const ws = within(
      completed(d),
      period === "all"
        ? ""
        : period === "custom"
          ? from
          : rangeStart(Number(period)),
      period === "custom" ? to : today(),
    ),
    s = summary(d, ws);
  const ps = selectedExercise ? exercisePoints(d, ws, selectedExercise) : [],
    ex = d.exercises.find((e) => e.id === selectedExercise),
    weighted = ex?.exerciseType === "weighted";
  const end = period === "custom" ? to : today(),
    begin =
      period === "all"
        ? completed(d).at(-1)?.date || today()
        : period === "custom"
          ? from
          : rangeStart(Number(period));
  const dayCount = Math.max(
    1,
    Math.round(
      (new Date(`${end}T12:00:00`).getTime() -
        new Date(`${begin}T12:00:00`).getTime()) /
        86400000,
    ) + 1,
  );
  const prevEnd = rangeStart(2, begin),
    prevBegin = rangeStart(dayCount, prevEnd),
    prev = summary(d, within(completed(d), prevBegin, prevEnd));
  const actualChart = weighted ? chart : "totalReps";
  const points = ps.map((p) => ({ ...p, label: dateRu(p.date) }));
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">КАЖДЫЙ ПОДХОД СЧИТАЕТСЯ</span>
          <h1>Ваш прогресс</h1>
          <p>Замечайте изменения. Продолжайте двигаться.</p>
        </div>
        <div className="heading-icon">
          <TrendingUp size={26} />
        </div>
      </div>
      <div className="period-pills">
        {[
          ["7", "7 дней"],
          ["30", "30 дней"],
          ["90", "90 дней"],
          ["365", "1 год"],
          ["all", "Всё время"],
          ["custom", "Свой период"],
        ].map(([v, l]) => (
          <Pill key={v} active={period === v} onClick={() => setPeriod(v)}>
            {l}
          </Pill>
        ))}
      </div>
      {period === "custom" && (
        <div className="form-row range-row">
          <label>
            С
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => {
                if (e.target.value) setFrom(e.target.value);
              }}
            />
          </label>
          <label>
            По
            <input
              type="date"
              value={to}
              min={from}
              onChange={(e) => {
                if (e.target.value) setTo(e.target.value);
              }}
            />
          </label>
        </div>
      )}
      <div className="stats-grid">
        <Metric label="Тренировки" value={s.count} />
        <Metric label="Общее время" value={s.minutes} unit="мин" />
        <Metric label="Среднее время" value={s.average} unit="мин" />
        <Metric label="Рабочие подходы" value={s.sets} />
      </div>
      <div className="analytics-grid">
        <section className="card panel">
          <div className="section-header">
            <h2>Тренировочный объём</h2>
            <Activity size={19} />
          </div>
          <div className="volume-value">
            {numberRu(s.volume)} <span>кг·повт.</span>
          </div>
          <p className="muted">Выполненные рабочие подходы с отягощением</p>
          {period !== "all" &&
          s.count > 0 &&
          prev.count > 0 &&
          prev.volume > 0 ? (
            <p className="comparison">
              {s.volume >= prev.volume ? "+" : ""}
              {Math.round(((s.volume - prev.volume) / prev.volume) * 100)}% к
              предыдущему периоду той же длины ({dateRu(prevBegin)}–
              {dateRu(prevEnd)}). Изменение нагрузки зависит и от числа
              тренировок, и от набора упражнений.
            </p>
          ) : (
            <p className="hint">
              {period === "all"
                ? "Общий объём за всю историю."
                : "Для сравнения нужен объём в предыдущем сопоставимом периоде."}
            </p>
          )}
          <div className="bodyweight-stats">
            <span>
              Собственный вес <b>{s.bodyReps} повт.</b>
            </span>
            <span>
              Упражнения на время <b>{s.seconds} сек.</b>
            </span>
          </div>
        </section>
        <section className="card panel">
          <h2>Баланс мышечных групп</h2>
          <p className="muted">Выполненные рабочие подходы</p>
          {s.sets ? (
            Object.entries(s.muscle)
              .filter(([, v]) => v)
              .map(([g, n]) => (
                <div className="muscle-bar" key={g}>
                  <span>{g}</span>
                  <div>
                    <i
                      style={{
                        width: `${(n / Math.max(...Object.values(s.muscle))) * 100}%`,
                      }}
                    />
                  </div>
                  <b>{n}</b>
                </div>
              ))
          ) : (
            <Empty
              icon={<Activity size={24} />}
              title="Нагрузка появится здесь"
              description="Выполните рабочие подходы, чтобы увидеть распределение."
            />
          )}
        </section>
      </div>
      <section className="card panel exercise-analytics">
        <div className="section-header">
          <div>
            <h2>Динамика упражнения</h2>
            <p className="muted">
              Сравнивайте свои результаты в одном упражнении
            </p>
          </div>
          <select
            aria-label="Упражнение для аналитики"
            value={selectedExercise}
            onChange={(e) => onSelect(e.target.value)}
          >
            <option value="">Выберите упражнение</option>
            {d.exercises.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
        {!selectedExercise ? (
          <Empty
            icon={<TrendingUp size={25} />}
            title="Каждое упражнение — своя история"
            description="Выберите упражнение, чтобы увидеть рабочие веса, объём и личную динамику."
          />
        ) : ps.length === 0 ? (
          <Empty
            title="Пока недостаточно данных"
            description="В выбранном периоде нет выполненных рабочих подходов этого упражнения."
          />
        ) : (
          <>
            <div className="exercise-records">
              {weighted ? (
                <>
                  <Metric
                    label="Макс. рабочий вес / вес подхода"
                    value={numberRu(Math.max(...ps.map((p) => p.weight || 0)))}
                    unit="кг"
                  />
                  <Metric
                    label="Макс. объём за тренировку"
                    value={numberRu(Math.max(...ps.map((p) => p.volume || 0)))}
                    unit="кг·повт."
                  />
                </>
              ) : (
                <Metric
                  label={
                    ex?.exerciseType === "duration"
                      ? "Максимум за тренировку"
                      : "Повторов за тренировку, макс."
                  }
                  value={Math.max(...ps.map((p) => p.totalReps))}
                  unit={ex?.exerciseType === "duration" ? "сек." : "повт."}
                />
              )}
              <Metric
                label={
                  ex?.exerciseType === "duration"
                    ? "Самый долгий подход"
                    : "Макс. повторений в подходе"
                }
                value={Math.max(...ps.map((p) => p.reps))}
                unit={ex?.exerciseType === "duration" ? "сек." : "повт."}
              />
            </div>
            {weighted && (
              <div className="period-pills">
                {[
                  ["weight", "Рабочий вес"],
                  ["volume", "Объём"],
                  ["e1rm", "Расчётный e1RM"],
                ].map(([v, l]) => (
                  <Pill
                    key={v}
                    active={chart === v}
                    onClick={() => setChart(v)}
                  >
                    {l}
                  </Pill>
                ))}
              </div>
            )}
            {ps.length < 2 ? (
              <div className="chart-empty">
                График появится после двух тренировок с этим упражнением.
              </div>
            ) : actualChart === "e1rm" &&
              ps.filter((p) => p.e1rm !== null).length < 2 ? (
              <div className="chart-empty">
                Для графика e1RM нужны две тренировки с рабочими подходами на
                1–10 повторений.
              </div>
            ) : (
              <div
                className="chart"
                role="img"
                aria-label={`Динамика ${ex?.name}. Точные значения в таблице ниже.`}
              >
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart
                    data={points}
                    margin={{ top: 20, right: 24, left: 0, bottom: 10 }}
                  >
                    <CartesianGrid
                      strokeDasharray="4 4"
                      vertical={false}
                      stroke="var(--border)"
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "var(--muted)" }}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={35}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--muted)" }}
                      axisLine={false}
                      tickLine={false}
                      width={55}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        color: "var(--text)",
                      }}
                      formatter={(v: number) => [
                        numberRu(v),
                        actualChart === "weight"
                          ? "кг"
                          : actualChart === "volume"
                            ? "кг·повт."
                            : actualChart === "e1rm"
                              ? "e1RM, кг"
                              : ex?.exerciseType === "duration"
                                ? "сек."
                                : "повт.",
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey={actualChart}
                      stroke="var(--accent)"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "var(--surface)", strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                      connectNulls={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            {weighted && chart === "e1rm" && (
              <p className="hint">
                e1RM — расчётная оценка по формуле Эпли: вес × (1 + повторы /
                30). Только выполненные рабочие подходы с отягощением на 1–10
                повторений. Это не фактически выполненный максимум.
              </p>
            )}
            <div className="exercise-history-table">
              <div className="eh-row eh-head">
                <span>Дата</span>
                <span>
                  {weighted
                    ? "Вес, кг"
                    : ex?.exerciseType === "duration"
                      ? "Секунды"
                      : "Повторы"}
                </span>
                <span>{weighted ? "Объём" : "Всего"}</span>
                {weighted && <span>e1RM</span>}
              </div>
              {[...ps].reverse().map((p) => (
                <button
                  className="eh-row"
                  key={p.id}
                  onClick={() => onOpen(d.workouts.find((w) => w.id === p.id)!)}
                >
                  <span>
                    {dateRu(p.date)}
                    <small>{p.time}</small>
                  </span>
                  <span>{numberRu(weighted ? p.weight || 0 : p.reps)}</span>
                  <span>
                    {numberRu(weighted ? p.volume || 0 : p.totalReps)}
                  </span>
                  {weighted && (
                    <span>{p.e1rm === null ? "—" : numberRu(p.e1rm)}</span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </section>
    </>
  );
}
export function ExerciseList({
  d,
  picker,
  onPick,
  onEdit,
}: {
  d: Data;
  picker?: boolean;
  onPick?: (e: Exercise) => void;
  onEdit: (e?: Exercise) => void;
}) {
  const [query, setQuery] = useState(""),
    [group, setGroup] = useState("Все"),
    [archived, setArchived] = useState(false),
    [picked, setPicked] = useState<string[]>([]);
  const list = d.exercises.filter(
    (e) =>
      (archived || !e.isArchived) &&
      (group === "Все" || e.muscleGroup === group) &&
      e.name
        .toLocaleLowerCase("ru")
        .replaceAll("ё", "е")
        .includes(query.toLocaleLowerCase("ru").replaceAll("ё", "е")),
  );
  return (
    <>
      {!picker && (
        <div className="page-heading">
          <div>
            <span className="eyebrow">ОСНОВА ВАШЕЙ ПРОГРАММЫ</span>
            <h1>Упражнения</h1>
            <p>
              {d.exercises.filter((e) => !e.isArchived).length} упражнений для
              вашего следующего шага
            </p>
          </div>
          <button className="primary" onClick={() => onEdit()}>
            <Plus size={18} /> Своё упражнение
          </button>
        </div>
      )}
      <div className="search-field">
        <Search size={18} />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Найти упражнение…"
          aria-label="Поиск упражнений"
        />
      </div>
      <div className="group-pills">
        {["Все", ...groups].map((g) => (
          <Pill key={g} active={group === g} onClick={() => setGroup(g)}>
            {g}
          </Pill>
        ))}
      </div>
      {!picker && (
        <label className="archive-toggle">
          <input
            type="checkbox"
            checked={archived}
            onChange={(e) => setArchived(e.target.checked)}
          />{" "}
          Показывать архивные
        </label>
      )}
      {picker && (
        <p className="hint">
          Нажмите на упражнение, чтобы добавить. Можно выбрать несколько подряд.
        </p>
      )}
      <div className={"catalog-grid " + (picker ? "picker-grid" : "")}>
        {list.map((e) => (
          <button
            key={e.id}
            className={"catalog-item card " + (e.isArchived ? "archived" : "")}
            onClick={() => {
              if (picker) {
                onPick?.(e);
                setPicked([...picked, e.id]);
              } else onEdit(e);
            }}
          >
            <div
              className={"catalog-icon group-" + groups.indexOf(e.muscleGroup)}
            >
              <Dumbbell size={21} />
            </div>
            <div className="grow">
              <span className="eyebrow">{e.muscleGroup}</span>
              <h3>{e.name}</h3>
              <p>
                {typeLabel(e.exerciseType)}
                {e.isCustom ? " · своё" : ""}
                {e.isArchived ? " · архив" : ""}
              </p>
            </div>
            {picker ? (
              picked.includes(e.id) ? (
                <Check className="green" size={20} />
              ) : (
                <Plus size={20} />
              )
            ) : (
              <Pencil size={16} />
            )}
          </button>
        ))}
      </div>
      {list.length === 0 && (
        <Empty
          icon={<Search size={25} />}
          title="Ничего не найдено"
          description="Попробуйте другое название или создайте своё упражнение."
        />
      )}
      {picker && (
        <button className="add-exercise" onClick={() => onEdit()}>
          <Plus size={18} /> Создать своё упражнение
        </button>
      )}
    </>
  );
}
export function ExerciseForm({
  d,
  exercise,
  run,
  onClose,
  onCreated,
}: {
  d: Data;
  exercise?: Exercise;
  run: Run;
  onClose: () => void;
  onCreated?: (e: Exercise) => void;
}) {
  const [name, setName] = useState(exercise?.name || ""),
    [group, setGroup] = useState(exercise?.muscleGroup || groups[0]),
    [type, setType] = useState<ExerciseType>(
      exercise?.exerciseType || "weighted",
    );
  return (
    <Modal
      title={exercise ? "Редактировать упражнение" : "Своё упражнение"}
      onClose={onClose}
    >
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          run(
            async () => {
              if (!name.trim()) throw new Error("Укажите название упражнения.");
              const value: Exercise = {
                id: exercise?.id || uid(),
                name: name.trim(),
                muscleGroup: group,
                exerciseType: type,
                isCustom: exercise?.isCustom ?? true,
                isArchived: exercise?.isArchived ?? false,
              };
              await db.exercises.put(value);
              onClose();
              if (!exercise) onCreated?.(value);
            },
            exercise ? "Упражнение обновлено" : "Упражнение создано",
          );
        }}
      >
        <label>
          Название
          <input
            required
            maxLength={200}
            autoComplete="off"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Например, тяга в тренажёре"
          />
        </label>
        <label>
          Мышечная группа
          <select
            value={group}
            onChange={(e) => setGroup(e.target.value as typeof group)}
          >
            {groups.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </label>
        <label>
          Тип нагрузки
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ExerciseType)}
          >
            <option value="weighted">Внешнее отягощение</option>
            <option value="bodyweight">Собственный вес</option>
            <option value="duration">На время (секунды)</option>
          </select>
        </label>
        {exercise && (
          <p className="hint">
            Изменения применяются к новым тренировкам. Названия, категории и
            типы нагрузки в старых записях сохраняются.
          </p>
        )}
        <button className="primary full" type="submit">
          <Check size={17} />{" "}
          {exercise ? "Сохранить изменения" : "Создать упражнение"}
        </button>
      </form>
      {exercise && (
        <div className="form-bottom-actions">
          <button
            className="secondary"
            onClick={() =>
              run(async () => {
                await db.exercises.update(exercise.id, {
                  isArchived: !exercise.isArchived,
                });
                onClose();
              })
            }
          >
            {exercise.isArchived ? "Вернуть из архива" : "Архивировать"}
          </button>
          {exercise.isCustom && (
            <button
              className="text-button danger"
              onClick={() => {
                const used =
                  d.workoutExercises.some(
                    (e) => e.exerciseId === exercise.id,
                  ) ||
                  d.templates.some((t) => t.exercises.includes(exercise.id));
                if (
                  window.confirm(
                    used
                      ? "Упражнение используется в истории или шаблонах. Архивировать его?"
                      : "Удалить упражнение?",
                  )
                )
                  run(async () => {
                    if (used)
                      await db.exercises.update(exercise.id, {
                        isArchived: true,
                      });
                    else await db.exercises.delete(exercise.id);
                    onClose();
                  });
              }}
            >
              <Trash2 size={16} /> Удалить
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}
export function Templates({
  d,
  run,
  start,
  onClose,
}: {
  d: Data;
  run: Run;
  start: (w?: Workout, t?: WorkoutTemplate) => void;
  onClose: () => void;
}) {
  const [edit, setEdit] = useState<WorkoutTemplate | null>(null);
  return (
    <Modal
      title={edit ? "Редактировать шаблон" : "Шаблоны тренировок"}
      onClose={onClose}
      wide
    >
      {edit ? (
        <TemplateForm
          d={d}
          template={edit}
          run={run}
          onDone={() => setEdit(null)}
        />
      ) : (
        <>
          <p className="muted">
            Выберите план — упражнения появятся в новой тренировке. Подходы
            нужно отметить самостоятельно.
          </p>
          <div className="template-list">
            {d.templates.map((t) => (
              <div className="template-row" key={t.id}>
                <div className="grow">
                  <h3>{t.name}</h3>
                  <p>
                    {t.exercises
                      .map((id) => d.exercises.find((e) => e.id === id)?.name)
                      .join(" · ")}
                  </p>
                </div>
                <div className="template-row-actions">
                  <button
                    className="icon-button"
                    aria-label={`Изменить ${t.name}`}
                    onClick={() => setEdit(t)}
                  >
                    <Pencil size={17} />
                  </button>
                  <button
                    className="primary"
                    onClick={() => {
                      start(undefined, t);
                      onClose();
                    }}
                  >
                    Начать <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            className="add-exercise"
            onClick={() => setEdit({ id: uid(), name: "", exercises: [] })}
          >
            <Plus size={18} /> Создать шаблон
          </button>
        </>
      )}
    </Modal>
  );
}
export function TemplateForm({
  d,
  template,
  run,
  onDone,
}: {
  d: Data;
  template: WorkoutTemplate;
  run: Run;
  onDone: () => void;
}) {
  const [name, setName] = useState(template.name),
    [ids, setIds] = useState(template.exercises);
  return (
    <form
      className="form-stack"
      onSubmit={(e) => {
        e.preventDefault();
        run(async () => {
          if (!name.trim() || !ids.length)
            throw new Error(
              "Укажите название и добавьте хотя бы одно упражнение.",
            );
          await db.templates.put({
            ...template,
            name: name.trim(),
            exercises: ids,
          });
          onDone();
        }, "Шаблон сохранён");
      }}
    >
      <label>
        Название шаблона
        <input
          required
          maxLength={200}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Например, спина и плечи"
        />
      </label>
      <div className="template-edit-list">
        {ids.map((id, i) => (
          <div key={i}>
            <span>
              {i + 1}.{" "}
              {d.exercises.find((e) => e.id === id)?.name || "Упражнение"}
            </span>
            <MoveButtons
              index={i}
              length={ids.length}
              label="Упражнение"
              onMove={(n) => {
                const list = [...ids];
                [list[i], list[i + n]] = [list[i + n], list[i]];
                setIds(list);
              }}
            />
            <button
              type="button"
              className="icon-button danger"
              aria-label="Убрать упражнение из шаблона"
              onClick={() => setIds(ids.filter((_, j) => i !== j))}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
      <label>
        Добавить упражнение
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) setIds([...ids, e.target.value]);
          }}
        >
          <option value="">Выберите из каталога</option>
          {d.exercises
            .filter((e) => !e.isArchived)
            .map((e) => (
              <option value={e.id} key={e.id}>
                {e.name}
              </option>
            ))}
        </select>
      </label>
      <div className="action-row">
        <button type="submit" className="primary">
          <Check size={17} /> Сохранить шаблон
        </button>
        <button type="button" className="secondary" onClick={onDone}>
          Назад
        </button>
        {d.templates.some((t) => t.id === template.id) && (
          <button
            className="icon-button danger"
            type="button"
            aria-label="Удалить шаблон"
            onClick={() => {
              if (window.confirm("Удалить шаблон? Тренировки сохранятся."))
                run(async () => {
                  await db.templates.delete(template.id);
                  onDone();
                });
            }}
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>
    </form>
  );
}
export function ExportModal({
  d,
  run,
  onClose,
}: {
  d: Data;
  run: Run;
  onClose: () => void;
}) {
  const [period, setPeriod] = useState("last"),
    [from, setFrom] = useState(rangeStart(30)),
    [to, setTo] = useState(today()),
    [exerciseId, setExerciseId] = useState(""),
    [format, setFormat] = useState("text");
  const all = completed(d);
  const eid = period === "exercise" ? exerciseId : "";
  const ws =
    period === "last"
      ? all.slice(0, 1)
      : period === "all"
        ? all
        : period === "exercise"
          ? all.filter((w) =>
              itemsFor(d, w.id).some((e) => e.exerciseId === eid),
            )
          : within(
              all,
              period === "custom" ? from : rangeStart(Number(period)),
              period === "custom" ? to : today(),
            );
  const fromLabel =
    period === "last"
      ? ws[0]?.date || today()
      : period === "all" || period === "exercise"
        ? ws.at(-1)?.date || today()
        : period === "custom"
          ? from
          : rangeStart(Number(period));
  const toLabel =
    period === "last"
      ? ws[0]?.date || today()
      : period === "custom"
        ? to
        : today();
  const text =
    format === "text"
      ? report(d, ws, fromLabel, toLabel, eid)
      : reportJson(d, ws, eid);
  return (
    <Modal title="Скопировать для ChatGPT" onClose={onClose} wide>
      <p className="muted">
        Отчёт формируется на устройстве. Вы сами выбираете, куда его отправить.
      </p>
      <div className="form-row">
        <label>
          Что включить
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="last">Последняя тренировка</option>
            <option value="30">Последние 30 дней</option>
            <option value="90">Последние 90 дней</option>
            <option value="all">Весь период</option>
            <option value="custom">Свой период</option>
            <option value="exercise">История упражнения</option>
          </select>
        </label>
        <label>
          Формат
          <select value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="text">Читаемый текст</option>
            <option value="json">Машиночитаемый JSON</option>
          </select>
        </label>
      </div>
      {period === "custom" && (
        <div className="form-row">
          <label>
            С
            <input
              required
              type="date"
              value={from}
              max={to}
              onChange={(e) => {
                if (e.target.value) setFrom(e.target.value);
              }}
            />
          </label>
          <label>
            По
            <input
              required
              type="date"
              value={to}
              min={from}
              onChange={(e) => {
                if (e.target.value) setTo(e.target.value);
              }}
            />
          </label>
        </div>
      )}
      {period === "exercise" && (
        <label>
          Упражнение
          <select
            value={exerciseId}
            onChange={(e) => setExerciseId(e.target.value)}
          >
            <option value="">Выберите упражнение</option>
            {d.exercises.map((e) => (
              <option value={e.id} key={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="report-label">
        <span>
          {ws.length} тренировок ·{" "}
          {format === "text" ? "текстовый отчёт" : "точные записи в JSON"}
        </span>
        <small>{text.length.toLocaleString("ru-RU")} знаков</small>
      </div>
      <textarea
        className="report-preview"
        aria-label="Предпросмотр отчёта"
        readOnly
        value={text}
      />
      <div className="export-actions">
        <button
          className="primary"
          disabled={!ws.length || (period === "exercise" && !exerciseId)}
          onClick={() => run(() => copy(text), "Отчёт скопирован")}
        >
          <Copy size={17} /> Скопировать отчёт
        </button>
        <button
          className="secondary"
          disabled={!ws.length}
          onClick={() =>
            run(async () => {
              if (navigator.share) {
                try {
                  await navigator.share({ title: "Мои тренировки", text });
                } catch (e) {
                  if ((e as Error).name !== "AbortError") throw e;
                }
              } else {
                await copy(text);
                window.alert(
                  "Отчёт скопирован. Вставьте его в приложение, где хотите поделиться.",
                );
              }
            })
          }
        >
          <Upload size={17} /> Поделиться
        </button>
        <button
          className="secondary"
          disabled={!ws.length}
          onClick={() =>
            download(
              text,
              `тренировки-${today()}.${format === "json" ? "json" : "txt"}`,
              format === "json"
                ? "application/json"
                : "text/plain;charset=utf-8",
            )
          }
        >
          <ArrowDownToLine size={17} /> Скачать
        </button>
      </div>
      <p className="hint">
        JSON отчёта предназначен для анализа. Для полного восстановления
        используйте резервную копию из настроек.
      </p>
    </Modal>
  );
}
export function SettingsPage({
  d,
  run,
  onExport,
  onRest,
  onInstall,
}: {
  d: Data;
  run: Run;
  onExport: () => void;
  onRest: () => void;
  onInstall: () => void;
}) {
  const [pending, setPending] = useState<Backup | null>(null),
    [busy, setBusy] = useState(false),
    [persisted, setPersisted] = useState<boolean | null>(null);
  const last = setting(d, "lastBackup", "");
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ПОД ВАШ РИТМ</span>
          <h1>Настройки</h1>
          <p>Простое приложение. Всё необходимое.</p>
        </div>
        <div className="heading-icon">
          <ShieldCheck size={25} />
        </div>
      </div>
      <div className="settings-grid">
        <section className="card settings-section">
          <div className="section-header">
            <h2>Внешний вид</h2>
            <Sparkles size={19} />
          </div>
          <p className="muted">Выберите комфортную тему</p>
          <div className="theme-options">
            {[
              ["light", "Светлая"],
              ["dark", "Тёмная"],
              ["system", "Как на устройстве"],
            ].map(([v, l]) => (
              <button
                key={v}
                className={
                  "theme-option " +
                  (setting(d, "theme", "system") === v ? "active" : "")
                }
                onClick={() => run(() => setSetting("theme", v))}
              >
                <div className={"theme-thumbnail " + v}>
                  <i />
                  <i />
                  <i />
                </div>
                <span>{l}</span>
                {setting(d, "theme", "system") === v && <Check size={15} />}
              </button>
            ))}
          </div>
          <button className="settings-link" onClick={onRest}>
            <Timer size={20} />
            <span>
              Таймер отдыха
              <small>
                {setting(d, "restSeconds", 90)} сек. · автозапуск{" "}
                {setting(d, "autoRest", false) ? "включён" : "выключен"}
              </small>
            </span>
            <ChevronRight size={18} />
          </button>
        </section>
        <section className="card settings-section">
          <div className="section-header">
            <h2>Резервная копия</h2>
            <HardDrive size={19} />
          </div>
          <p className="muted">
            Сохраните всю историю, черновик, каталог, шаблоны и настройки одним
            файлом JSON.
          </p>
          <div className="backup-status">
            <ShieldCheck size={18} />
            <span>
              Последняя копия:{" "}
              <strong>
                {last
                  ? `${dateRu(localDate(new Date(last)))} · ${new Date(last).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", hour12: false })}`
                  : "ещё не создавалась"}
              </strong>
            </span>
          </div>
          <button
            disabled={busy}
            className="primary full"
            onClick={() =>
              run(async () => {
                setBusy(true);
                try {
                  const b = await backupNow();
                  const at = new Date().toISOString();
                  b.settings = b.settings.filter((s) => s.key !== "lastBackup");
                  b.settings.push({ key: "lastBackup", value: at });
                  download(
                    JSON.stringify(b, null, 2),
                    `мои-тренировки-${today()}.backup.json`,
                    "application/json",
                  );
                  await setSetting("lastBackup", at);
                } finally {
                  setBusy(false);
                }
              }, "Копия подготовлена. Проверьте файл в загрузках.")
            }
          >
            <ArrowDownToLine size={17} /> Скачать резервную копию
          </button>
          <label className="file-button secondary full">
            <Upload size={17} /> Восстановить из копии
            <input
              aria-label="Выбрать резервную копию"
              type="file"
              accept=".json,application/json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                run(async () => {
                  if (file.size > 50 * 1024 * 1024)
                    throw new Error(
                      "Файл больше 50 МБ. Откройте его на компьютере для проверки.",
                    );
                  let value;
                  try {
                    value = JSON.parse(await file.text());
                  } catch {
                    throw new Error(
                      "Не удалось прочитать JSON. Выберите резервную копию приложения.",
                    );
                  }
                  setPending(validateBackup(value));
                });
              }}
            />
          </label>
          <p className="hint">
            Дата показывает запуск скачивания. Приложение не может проверить,
            сохранили ли вы файл. Автоматической синхронизации с iCloud нет.
          </p>
        </section>
        <section className="card settings-section">
          <h2>Ваши данные</h2>
          <button className="settings-link" onClick={onExport}>
            <Sparkles size={20} />
            <span>
              Отчёт для ChatGPT<small>Текст или JSON за выбранный период</small>
            </span>
            <ChevronRight size={18} />
          </button>
          <button
            className="settings-link"
            onClick={() =>
              download(
                csv(d),
                `тренировки-${today()}.csv`,
                "text/csv;charset=utf-8",
              )
            }
          >
            <FolderOpen size={20} />
            <span>
              Экспорт тренировок в CSV
              <small>Для таблиц и собственного анализа</small>
            </span>
            <ArrowDownToLine size={18} />
          </button>
          <button
            className="settings-link"
            onClick={() =>
              run(async () => {
                if (!navigator.storage?.persist)
                  throw new Error(
                    "Браузер не поддерживает запрос постоянного хранения. Создавайте резервные копии.",
                  );
                const ok = await navigator.storage.persist();
                setPersisted(ok);
              }, undefined)
            }
          >
            <ShieldCheck size={20} />
            <span>
              Запросить постоянное хранение
              <small>
                {persisted === null
                  ? "Если браузер поддерживает"
                  : persisted
                    ? "Браузер разрешил хранение"
                    : "Браузер не предоставил разрешение"}
              </small>
            </span>
            <ChevronRight size={18} />
          </button>
          <p className="hint">
            Очистка данных сайта или удаление приложения может удалить историю.
            Регулярно сохраняйте копию вне браузера.
          </p>
        </section>
        <section className="card settings-section about-section">
          <div className="about-logo">
            <Dumbbell size={28} />
          </div>
          <h2>Мои тренировки</h2>
          <span className="tiny-label">ВЕРСИЯ 1.0.0</span>
          <p className="muted">
            Тихое место для большого прогресса.
            <br />
            Бесплатно. Без регистрации. Без сервера.
          </p>
          <button className="secondary" onClick={onInstall}>
            <Plus size={17} /> Установить на iPhone
          </button>
          <p className="hint">
            <WifiOff size={13} /> После первой загрузки — доступно офлайн.
          </p>
        </section>
      </div>
      {pending && (
        <Modal
          title="Восстановить резервную копию?"
          onClose={() => setPending(null)}
        >
          <div className="restore-info">
            <FileJson size={28} />
            <p>
              Копия от {dateRu(pending.exportedAt.slice(0, 10))}
              <br />
              <strong>
                {pending.workouts.length} тренировок ·{" "}
                {pending.exercises.length} упражнений
              </strong>
            </p>
          </div>
          <p>
            Текущая база будет полностью заменена. Сначала сохраните её
            резервную копию, если хотите сохранить текущие записи.
          </p>
          <p className="hint">
            Структура, версия и связи проверены. При ошибке записи исходная база
            сохранится.
          </p>
          <button
            className="primary full"
            disabled={busy}
            onClick={() =>
              run(async () => {
                setBusy(true);
                try {
                  await restoreBackup(pending);
                  setPending(null);
                } finally {
                  setBusy(false);
                }
              }, "Данные восстановлены")
            }
          >
            <Check size={17} /> Заменить базу и восстановить
          </button>
        </Modal>
      )}
    </>
  );
}
