import { test, expect } from "@playwright/test";

test("서식 버튼은 선택한 글에 적용·해제되고 눌림 상태를 표시한다", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "서식 지우기", exact: true })).toHaveCount(0);
  const editor = page.getByRole("textbox", { name: "본문 편집" });
  await editor.fill("서식을 적용할 문장");
  await editor.locator("h1").selectText();
  await expect.poll(() => page.evaluate(() => window.getSelection()?.toString())).toBe("서식을 적용할 문장");
  for (const [name, tag] of [["굵게", "strong"], ["기울임", "em"], ["밑줄", "u"], ["취소선", "s"], ["인라인 코드", "code"]]) {
    const button = page.getByRole("button", { name, exact: true });
    const inactiveBackground = await button.evaluate((element) => getComputedStyle(element).backgroundColor);
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect(editor.locator(tag)).toHaveText("서식을 적용할 문장");
    await expect.poll(() => button.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe(inactiveBackground);
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "false");
    await expect(editor.locator(tag)).toHaveCount(0);
  }
});

test("제목·목록·인용을 다시 누르면 해제되고 다른 서식은 유지된다", async ({ page }) => {
  await page.goto("/");
  const editor = page.getByRole("textbox", { name: "본문 편집" });
  await editor.fill("여러 서식이 있는 문장");
  await editor.locator("h1").selectText();
  await expect.poll(() => page.evaluate(() => window.getSelection()?.toString())).toBe("여러 서식이 있는 문장");
  for (const [name, tag] of [["소제목", "h2"], ["작은 소제목", "h3"], ["목록", "ul"], ["번호 목록", "ol"], ["인용", "blockquote"]]) {
    const button = page.getByRole("button", { name, exact: true });
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect(editor.locator(tag)).toContainText("여러 서식이 있는 문장");
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "false");
    await expect(editor.locator(tag)).toHaveCount(0);
  }
  const bold = page.getByRole("button", { name: "굵게", exact: true });
  const italic = page.getByRole("button", { name: "기울임", exact: true });
  await editor.locator("p").filter({ hasText: "여러 서식이 있는 문장" }).first().selectText();
  await bold.click();
  await italic.click();
  await bold.click();
  await expect(editor.locator("strong")).toHaveCount(0);
  await expect(editor.locator("em")).toHaveText("여러 서식이 있는 문장");
  await expect(italic).toHaveAttribute("aria-pressed", "true");
  await editor.press("ArrowRight");
  await editor.press("Enter");
  await expect(page.getByRole("button", { name: "소제목", exact: true })).toHaveAttribute("aria-pressed", "false");
});
