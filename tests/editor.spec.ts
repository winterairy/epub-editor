import { test, expect } from "@playwright/test";
test("일반 편집과 로컬 Monaco 코드 편집이 연결된다", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const editor = page.getByRole("textbox", { name: "본문 편집" });
  await expect(editor).toContainText("새로운 책");
  await editor.fill("한글 원고 테스트");
  await page.getByRole("button", { name: "코드 편집", exact: true }).click();
  await expect(page.locator(".monaco-editor")).toBeVisible();
  await expect(page.locator(".view-lines")).toContainText("한글 원고 테스트");
  await page.getByRole("button", { name: "일반 편집", exact: true }).click();
  await expect(editor).toContainText("한글 원고 테스트");
  expect(errors).toEqual([]);
});

test("하단 패널 전환·접기와 형식별 출력 데모", async ({ page }) => {
  await page.goto("/");
  const changes = page.getByRole("tab", { name: "변경 내용" });
  await changes.click();
  await expect(page.getByRole("tabpanel")).toContainText("첫 내보내기");
  await page.getByRole("button", { name: "확인 후 내보내기 (데모)" }).click();
  await expect(page.getByRole("tabpanel")).toContainText("파일 생성 없음");
  await changes.click();
  await expect(page.getByRole("tabpanel")).toContainText(
    "변경된 내용이 없습니다",
  );
  await page.getByLabel("출력 형식").selectOption("PDF");
  await expect(page.getByRole("tabpanel")).toContainText("첫 내보내기");
  await changes.click();
  await expect(page.getByRole("tabpanel")).toHaveCount(0);
  await page.getByRole("tab", { name: "검증 결과" }).click();
  await page.getByRole("button", { name: "검증 실행 (데모)" }).click();
  await expect(page.getByRole("tabpanel")).toContainText("샘플 안내");
  const separator = page.getByRole("separator", { name: "하단 패널 높이" });
  const before = await separator.getAttribute("aria-valuenow");
  await separator.focus();
  await page.keyboard.press("ArrowUp");
  expect(await separator.getAttribute("aria-valuenow")).not.toEqual(before);
});

test("파일별 편집 내용과 탭 닫기·다시 열기", async ({ page }) => {
  await page.goto("/");
  const editor = page.getByRole("textbox", { name: "본문 편집" });
  await editor.fill("첫 장에 남길 내용");
  await page.getByRole("button", { name: "2장.xhtml", exact: true }).click();
  await expect(editor).toContainText("다음 페이지");
  await editor.fill("두 번째 장의 내용");
  await page.getByRole("tab", { name: /1장.xhtml/ }).click();
  await expect(editor).toContainText("첫 장에 남길 내용");
  await page.getByRole("button", { name: "1장.xhtml 닫기" }).click();
  await page
    .getByRole("button", { name: /1장.xhtml/, exact: false })
    .first()
    .click();
  await expect(editor).toContainText("첫 장에 남길 내용");
  await page.getByRole("button", { name: /미리보기/ }).click();
  await expect(
    page.getByRole("complementary", { name: "책 미리보기" }),
  ).toContainText("첫 장에 남길 내용");
});

test("브라우저 메뉴, 새 책과 검색, 레이아웃 설정 유지", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "파일", exact: true }).click();
  await page.getByRole("button", { name: "새 책…", exact: true }).click();
  await page.getByLabel("책 제목", { exact: true }).fill("나의 에세이");
  await page.getByLabel("기본 템플릿").selectOption("에세이");
  await page.getByRole("button", { name: "책 만들기 (데모)" }).click();
  await expect(page.getByRole("textbox", { name: "본문 편집" })).toContainText(
    "나의 에세이",
  );
  await page.getByRole("button", { name: "전체 검색", exact: true }).click();
  await page
    .getByRole("textbox", { name: "책 전체 검색어" })
    .fill("나의 에세이");
  await expect(page.locator(".search-result")).toContainText("1장.xhtml");
  const size = page.getByRole("separator", { name: "사이드바 너비" });
  await size.focus();
  await page.keyboard.press("ArrowRight");
  const width = await size.getAttribute("aria-valuenow");
  await page.reload();
  await expect(size).toHaveAttribute("aria-valuenow", width!);
  await page.keyboard.press("Control+b");
  await expect(size).toHaveCount(0);
});

test('작은 창에서 패널 높이가 편집 영역과 상태바를 가리지 않는다', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 600 });
  await page.goto('/');
  await page.getByRole('tab', { name: '변경 내용' }).click();
  const separator = page.getByRole('separator', { name: '하단 패널 높이' });
  await separator.focus();
  for (let i = 0; i < 15; i++) await page.keyboard.press('ArrowUp');
  const max = Number(await separator.getAttribute('aria-valuemax'));
  expect(Number(await separator.getAttribute('aria-valuenow'))).toBeLessThanOrEqual(max);
  const status = await page.locator('.statusbar').boundingBox();
  expect(status!.y + status!.height).toBeLessThanOrEqual(600);
  const content = await page.getByRole('textbox', { name: '본문 편집' }).boundingBox();
  expect(content!.height).toBeGreaterThan(0);
});
