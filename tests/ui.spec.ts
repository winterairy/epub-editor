import { test, expect } from "@playwright/test";

test("메뉴와 하단 탭을 키보드로 이동한다", async ({ page }) => {
  await page.goto("/");
  const file = page.getByRole("menuitem", { name: "파일", exact: true });
  await file.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: "새 책…", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(file).toBeFocused();
  const changes = page.getByRole("tab", { name: /변경 내용/ });
  await changes.click();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "검증 결과" })).toBeFocused();
  await expect(page.getByRole("region", { name: "하단 패널", exact: true }).getByRole("tabpanel")).toContainText("책 검증");
});

test("새 책 삭제 확인을 취소하면 원고와 입력값을 보존한다", async ({ page }) => {
  await page.goto("/");
  const editor = page.getByRole("textbox", { name: "본문 편집" });
  await editor.fill("보존해야 할 원고");
  await page.getByRole("menuitem", { name: "파일", exact: true }).click();
  await page.getByRole("menuitem", { name: "새 책…", exact: true }).click();
  await page.getByLabel("책 제목", { exact: true }).fill("다음 책");
  await page.getByRole("button", { name: "책 만들기 (데모)" }).click();
  const confirm = page.getByRole("alertdialog");
  await expect(confirm).toContainText("편집 내용과 기록");
  await confirm.getByRole("button", { name: "취소", exact: true }).click();
  await expect(page.getByLabel("책 제목", { exact: true })).toHaveValue("다음 책");
  await page.getByRole("button", { name: "대화상자 닫기" }).click();
  await expect(editor).toContainText("보존해야 할 원고");
  await page.getByRole("menuitem", { name: "파일", exact: true }).click();
  await page.getByRole("menuitem", { name: "새 책…", exact: true }).click();
  await page.getByLabel("책 제목", { exact: true }).fill("확정한 책");
  await page.getByRole("button", { name: "책 만들기 (데모)" }).click();
  await confirm.getByRole("button", { name: "지우고 새 책 만들기" }).click();
  await expect(editor).toContainText("확정한 책");
  await expect(editor).not.toContainText("보존해야 할 원고");
});

test("설정 Select와 Dialog를 키보드로 조작하고 툴팁을 표시한다", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const settings = page.getByRole("button", { name: "책 설정", exact: true });
  await settings.focus();
  await expect(page.getByRole("tooltip")).toContainText("책 설정");
  await settings.click();
  const dialog = page.getByRole("dialog", { name: "책 설정" });
  await dialog.getByLabel("책 제목", { exact: true }).fill("설정한 제목");
  const language = dialog.getByRole("combobox", { name: "언어", exact: true });
  await language.focus();
  await page.keyboard.press("Space");
  await expect(page.getByRole("option", { name: "한국어", exact: true })).toBeFocused();
  await page.keyboard.press("End");
  await expect(page.getByRole("option", { name: "영어", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(language).toContainText("영어");
  await dialog.getByRole("button", { name: "적용 (데모)" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(settings).toBeFocused();
  await expect(page.locator(".book-title")).toContainText("설정한 제목");
  expect(errors).toEqual([]);
});

test("파일 탭과 편집 모드를 방향키로 전환한다", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: /1장.xhtml/ }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: /스타일.css/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".monaco-editor")).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("textbox", { name: "본문 편집" })).toBeVisible();
  await page.getByRole("radio", { name: "일반 편집", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio", { name: "코드 편집", exact: true })).toBeFocused();
  await page.keyboard.press("Space");
  await expect(page.getByRole("radio", { name: "코드 편집", exact: true })).toBeChecked();
  await expect(page.locator(".monaco-editor")).toBeVisible();
});
