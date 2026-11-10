import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";
import { db } from "../db";
beforeEach(async () => {
  await db.delete();
  await db.open();
  window.matchMedia = vi
    .fn()
    .mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  window.scrollTo = vi.fn();
});
afterEach(async () => {
  await db.delete();
});
it("открывает все разделы без записей, создаёт черновик за одно нажатие и возвращается к нему", async () => {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByText("Всё начинается с движения");
  const nav = screen.getByRole("navigation", { name: "Основная навигация" });
  for (const [label, heading] of [
    ["История", "История тренировок"],
    ["Прогресс", "Ваш прогресс"],
    ["Упражнения", "Упражнения"],
    ["Настройки", "Настройки"],
  ]) {
    await user.click(within(nav).getByText(label));
    expect(
      screen.getByRole("heading", { level: 1, name: heading }),
    ).toBeTruthy();
  }
  await user.click(within(nav).getByText("Тренировка"));
  await user.click(screen.getByText("Начать тренировку"));
  await screen.findByText("Ваша тренировка");
  await waitFor(async () => expect(await db.workouts.count()).toBe(1));
  await user.click(screen.getByText("На главную"));
  expect(await screen.findByText("Продолжить тренировку")).toBeTruthy();
  await user.click(within(nav).getByText("Настройки"));
  await user.click(screen.getByText("Тёмная"));
  await waitFor(() =>
    expect(document.documentElement.dataset.theme).toBe("dark"),
  );
  await user.click(
    screen.getByRole("button", { name: /Есть незавершённая тренировка/ }),
  );
  await screen.findByText("Ваша тренировка");
  expect(await db.workouts.count()).toBe(1);
});
