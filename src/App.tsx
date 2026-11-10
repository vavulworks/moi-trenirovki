import {
  useCallback,
  useEffect,
  useRef,
  useState,
  Component,
  ReactNode,
} from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useRegisterSW } from "virtual:pwa-register/react";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  Dumbbell,
  History,
  LayoutGrid,
  Leaf,
  LoaderCircle,
  Plus,
  Settings,
  ShieldCheck,
  Sparkles,
  Timer,
  TrendingUp,
  WifiOff,
  X,
} from "lucide-react";
import {
  Data,
  Exercise,
  Workout,
  WorkoutTemplate,
  dateRu,
  localTime,
  today,
  uid,
} from "./types";
import {
  db,
  readData,
  setting,
  setSetting,
  startWorkout,
  addExercise,
} from "./db";
import { itemsFor } from "./stats";
import { Modal, Run } from "./ui";
import {
  Home,
  HistoryPage,
  ProgressPage,
  ExerciseList,
  ExerciseForm,
  Templates,
  TemplateForm,
  ExportModal,
  SettingsPage,
} from "./pages";
import { WorkoutEditor, WorkoutDetail, RestSettings } from "./WorkoutEditor";
type Page = "workout" | "history" | "progress" | "exercises" | "settings";
const nav = [
  { id: "workout", name: "Тренировка", icon: Dumbbell },
  { id: "history", name: "История", icon: CalendarDays },
  { id: "progress", name: "Прогресс", icon: TrendingUp },
  { id: "exercises", name: "Упражнения", icon: LayoutGrid },
  { id: "settings", name: "Настройки", icon: Settings },
] as const;
class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="fatal">
        <Dumbbell size={40} />
        <h1>Не удалось открыть приложение</h1>
        <p>
          Проверьте, что Safari разрешает локальное хранение, и перезагрузите
          страницу. Не очищайте данные сайта: в них хранится история.
        </p>
        <button className="primary" onClick={() => location.reload()}>
          Перезагрузить
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function App() {
  return (
    <ErrorBoundary>
      <Tracker />
    </ErrorBoundary>
  );
}
function Tracker() {
  const d = useLiveQuery(() => readData(), []);
  const [page, setPage] = useState<Page>("workout"),
    [editorId, setEditorId] = useState(""),
    [detailId, setDetailId] = useState(""),
    [exerciseId, setExerciseId] = useState("");
  const [sheet, setSheet] = useState<
      | ""
      | "picker"
      | "templates"
      | "export"
      | "rest"
      | "install"
      | "template-save"
    >(""),
    [exerciseEdit, setExerciseEdit] = useState<Exercise | null | undefined>(
      undefined,
    ),
    [toast, setToast] = useState(""),
    [error, setError] = useState(""),
    [online, setOnline] = useState(navigator.onLine),
    [now, setNow] = useState(Date.now());
  const [saving, setSaving] = useState(0);
  const pending = useRef(0);
  const {
    offlineReady: [offlineReady],
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError: () =>
      setError(
        "Не удалось подготовить офлайн-режим. Подключитесь к интернету и перезагрузите приложение.",
      ),
  });
  const run: Run = useCallback(async (fn, success) => {
    pending.current++;
    setSaving(pending.current);
    try {
      await fn();
      if (success) setToast(success);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Не удалось сохранить данные. Проверьте свободное место.",
      );
    } finally {
      pending.current--;
      setSaving(pending.current);
    }
  }, []);
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 500);
    const yes = () => setOnline(true),
      no = () => setOnline(false);
    window.addEventListener("online", yes);
    window.addEventListener("offline", no);
    return () => {
      clearInterval(interval);
      window.removeEventListener("online", yes);
      window.removeEventListener("offline", no);
    };
  }, []);
  useEffect(() => {
    if (toast) {
      const i = setTimeout(() => setToast(""), 4500);
      return () => clearTimeout(i);
    }
  }, [toast]);
  const theme = d ? setting(d, "theme", "system") : "system";
  useEffect(() => {
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme =
        theme === "system" ? (mq.matches ? "dark" : "light") : theme;
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);
  const restEnd = d ? setting<number | null>(d, "restEnd", null) : null;
  const remaining =
    restEnd === null ? null : Math.max(0, Math.ceil((restEnd - now) / 1000));
  const navigate = (p: Page) => {
    setPage(p);
    setEditorId("");
    setDetailId("");
    window.scrollTo({ top: 0 });
  };
  const begin = (w?: Workout, t?: WorkoutTemplate) =>
    run(async () => {
      const had = d?.workouts.some((w) => w.status === "draft");
      const id = await startWorkout(w, t);
      setPage("workout");
      setEditorId(id);
      setDetailId("");
      setSheet("");
      window.scrollTo({ top: 0 });
      if (had && (w || t))
        setToast(
          "Открыт текущий черновик. Завершите его, чтобы начать следующую тренировку.",
        );
    });
  const open = (w: Workout) => {
    if (w.status === "draft") {
      setEditorId(w.id);
      setDetailId("");
      setPage("workout");
    } else {
      setDetailId(w.id);
      setEditorId("");
      setPage("history");
    }
    window.scrollTo({ top: 0 });
  };
  if (!d)
    return (
      <div className="loading">
        <Dumbbell size={36} />
        <h2>Мои тренировки</h2>
        <LoaderCircle className="spin" size={22} />
        <p>Открываем ваш дневник…</p>
      </div>
    );
  const w = d.workouts.find((w) => w.id === editorId),
    detail = d.workouts.find((w) => w.id === detailId),
    draft = d.workouts.find((w) => w.status === "draft");
  const exerciseHistory = (id: string) => {
    setExerciseId(id);
    setPage("progress");
    setEditorId("");
  };
  return (
    <>
      <aside className="sidebar">
        <button className="brand" onClick={() => navigate("workout")}>
          <span className="brand-mark">
            <Dumbbell size={26} />
          </span>
          <span>
            Мои
            <br />
            тренировки<span className="brand-period">.</span>
          </span>
        </button>
        <span className="sidebar-caption">ВАШЕ ПРОСТРАНСТВО</span>
        <nav aria-label="Основная навигация">
          {nav.map((n) => (
            <button
              key={n.id}
              aria-current={page === n.id ? "page" : undefined}
              className={"nav-item " + (page === n.id ? "active" : "")}
              onClick={() => navigate(n.id)}
            >
              <n.icon size={20} />
              {n.name}
              {page === n.id && <span />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-badge">
            <span className="status-dot" />
            <strong>
              {online ? "Всё на вашем устройстве" : "Вы работаете офлайн"}
            </strong>
            <p>Только вы и ваш прогресс.</p>
          </div>
          <div className="sidebar-version">
            СДЕЛАНО ДЛЯ ВАШЕГО РИТМА <Leaf size={12} />
          </div>
        </div>
      </aside>
      <div className="app-area">
        <header className="topbar">
          <div className="mobile-brand">
            <span className="brand-mark">
              <Dumbbell size={20} />
            </span>
            Мои тренировки
          </div>
          <div className="desktop-breadcrumb">
            Ваш дневник <ChevronRight size={13} />
            <strong>{nav.find((n) => n.id === page)?.name}</strong>
          </div>
          <div className="topbar-right">
            <span className="save-status">
              {!online ? (
                <>
                  <WifiOff size={14} /> Офлайн
                </>
              ) : saving ? (
                <>
                  <LoaderCircle size={14} className="spin" /> Сохраняем…
                </>
              ) : (
                <>
                  <ShieldCheck size={14} /> На устройстве
                </>
              )}
            </span>
            <button
              className="topbar-install"
              aria-label="Как установить приложение"
              onClick={() => setSheet("install")}
            >
              <Plus size={16} />
              <span>Установить приложение</span>
            </button>
          </div>
        </header>
        {needRefresh && (
          <div className="update-banner">
            <span>Новая версия готова. Записи останутся на устройстве.</span>
            <button
              disabled={saving > 0}
              onClick={() =>
                run(async () => {
                  if (pending.current)
                    throw new Error("Дождитесь сохранения изменений.");
                  await updateServiceWorker(true);
                })
              }
            >
              Обновить
            </button>
          </div>
        )}
        {error && (
          <div className="error-banner" role="alert">
            <span>{error}</span>
            <button
              className="icon-button"
              aria-label="Закрыть сообщение"
              onClick={() => setError("")}
            >
              <X size={18} />
            </button>
          </div>
        )}
        {draft && page !== "workout" && (
          <button className="draft-banner" onClick={() => open(draft)}>
            <span className="status-dot" /> Есть незавершённая тренировка{" "}
            <span>
              Продолжить <ArrowRight size={15} />
            </span>
          </button>
        )}
        <main id="main">
          {w ? (
            <WorkoutEditor
              d={d}
              w={w}
              run={run}
              onBack={() => {
                if (w.status === "completed") {
                  setDetailId(w.id);
                  setPage("history");
                }
                setEditorId("");
              }}
              onAdd={() => setSheet("picker")}
              onFinish={() => {
                setDetailId(w.id);
                setPage("history");
                setEditorId("");
                setToast("Тренировка завершена. Хорошая работа!");
              }}
              onExerciseHistory={exerciseHistory}
            />
          ) : detail ? (
            <WorkoutDetail
              d={d}
              w={detail}
              run={run}
              onEdit={() => {
                setEditorId(detail.id);
                setDetailId("");
              }}
              onRepeat={() => begin(detail)}
              onTemplate={() => setSheet("template-save")}
              onBack={() => setDetailId("")}
            />
          ) : page === "workout" ? (
            <Home
              d={d}
              start={begin}
              onOpen={open}
              onTemplates={() => setSheet("templates")}
              onHistory={() => navigate("history")}
              onExport={() => setSheet("export")}
            />
          ) : page === "history" ? (
            <HistoryPage d={d} onOpen={open} start={begin} run={run} />
          ) : page === "progress" ? (
            <ProgressPage
              d={d}
              selectedExercise={exerciseId}
              onSelect={setExerciseId}
              onOpen={open}
            />
          ) : page === "exercises" ? (
            <ExerciseList d={d} onEdit={(e) => setExerciseEdit(e || null)} />
          ) : (
            <SettingsPage
              d={d}
              run={run}
              onExport={() => setSheet("export")}
              onRest={() => setSheet("rest")}
              onInstall={() => setSheet("install")}
            />
          )}
        </main>
        <footer className="desktop-footer">
          <span>
            Мои тренировки <span>© {new Date().getFullYear()}</span>
          </span>
          <span>
            <LockIcon /> Лично. Локально. В вашем темпе.
          </span>
        </footer>
      </div>
      <nav className="bottom-nav" aria-label="Мобильная навигация">
        {nav.map((n) => (
          <button
            key={n.id}
            aria-current={page === n.id ? "page" : undefined}
            className={page === n.id ? "active" : ""}
            onClick={() => navigate(n.id)}
          >
            <n.icon size={21} />
            <span>{n.name}</span>
          </button>
        ))}
      </nav>
      {remaining !== null && (
        <div
          className={"rest-floating " + (remaining === 0 ? "finished" : "")}
          role="status"
        >
          <button onClick={() => setSheet("rest")}>
            <Timer size={19} />
            <span>
              {remaining === 0
                ? "Отдых завершён"
                : `Отдых ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`}
            </span>
          </button>
          {remaining > 0 && (
            <button
              className="text-button"
              onClick={() =>
                run(() =>
                  setSetting("restEnd", (restEnd || Date.now()) + 30000),
                )
              }
            >
              +30 с
            </button>
          )}
          <button
            className="icon-button"
            aria-label="Закрыть таймер"
            onClick={() => run(() => setSetting("restEnd", null))}
          >
            <X size={17} />
          </button>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
          <button aria-label="Закрыть уведомление" onClick={() => setToast("")}>
            <X size={15} />
          </button>
        </div>
      )}
      {sheet === "picker" && w && (
        <Modal title="Добавить упражнения" onClose={() => setSheet("")} wide>
          <ExerciseList
            d={d}
            picker
            onEdit={(e) => setExerciseEdit(e || null)}
            onPick={(e) =>
              run(async () => {
                await addExercise(w, e, await readData());
              }, "Упражнение добавлено")
            }
          />
          <button
            className="primary full sticky-modal-bottom"
            onClick={() => setSheet("")}
          >
            Готово <Check size={17} />
          </button>
        </Modal>
      )}
      {exerciseEdit !== undefined && (
        <ExerciseForm
          d={d}
          exercise={exerciseEdit || undefined}
          run={run}
          onClose={() => setExerciseEdit(undefined)}
          onCreated={
            sheet === "picker" && w
              ? (e) =>
                  run(async () => {
                    await addExercise(w, e, await readData());
                  })
              : undefined
          }
        />
      )}
      {sheet === "templates" && (
        <Templates d={d} run={run} start={begin} onClose={() => setSheet("")} />
      )}
      {sheet === "template-save" && detail && (
        <Modal title="Сохранить как шаблон" onClose={() => setSheet("")} wide>
          <TemplateForm
            d={d}
            template={{
              id: uid(),
              name: detail.name,
              exercises: itemsFor(d, detail.id).map((e) => e.exerciseId),
            }}
            run={run}
            onDone={() => setSheet("")}
          />
        </Modal>
      )}
      {sheet === "export" && (
        <ExportModal d={d} run={run} onClose={() => setSheet("")} />
      )}
      {sheet === "rest" && (
        <RestSettings d={d} run={run} onClose={() => setSheet("")} />
      )}
      {sheet === "install" && (
        <Modal
          title="Ваш дневник на главном экране"
          onClose={() => setSheet("")}
        >
          <div className="install-art">
            <Dumbbell size={40} />
          </div>
          <p>
            Откройте приложение в Safari на iPhone, чтобы установить его как
            обычное приложение.
          </p>
          <ol className="install-steps">
            <li>
              Нажмите <strong>«Поделиться»</strong> в панели Safari.
            </li>
            <li>
              Выберите <strong>«На экран Домой»</strong>.
            </li>
            <li>
              Нажмите <strong>«Добавить»</strong> и откройте дневник с нового
              значка.
            </li>
          </ol>
          <div className="offline-note">
            <WifiOff size={20} />
            <p>
              {offlineReady
                ? "Приложение готово к работе офлайн."
                : "Для офлайн-работы дождитесь полной первой загрузки. Затем проверьте открытие в авиарежиме."}
            </p>
          </div>
          <p className="hint">
            Записи хранятся на этом устройстве и в этом адресе сайта. Перед
            сменой адреса, браузера или переустановкой сохраните резервную
            копию.
          </p>
          <button className="primary full" onClick={() => setSheet("")}>
            Понятно <Check size={17} />
          </button>
        </Modal>
      )}
    </>
  );
}
function LockIcon() {
  return <ShieldCheck size={13} />;
}
