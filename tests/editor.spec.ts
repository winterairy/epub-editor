import { test, expect } from '@playwright/test'
test('일반 편집과 로컬 Monaco 코드 편집이 연결된다', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  const editor = page.getByRole('textbox', { name: '본문 편집' })
  await expect(editor).toContainText('새로운 책')
  await editor.fill('한글 원고 테스트')
  await page.getByRole('button', { name: '코드 편집', exact: true }).click()
  await expect(page.locator('.monaco-editor')).toBeVisible()
  await expect(page.locator('.view-lines')).toContainText('한글 원고 테스트')
  await page.getByRole('button', { name: '일반 편집', exact: true }).click()
  await expect(editor).toContainText('한글 원고 테스트')
  expect(errors).toEqual([])
})
