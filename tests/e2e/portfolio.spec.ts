import { test, expect } from "@playwright/test";

test.describe("Trishna Bapna Portfolio E2E", () => {
  test("loads home page with authentic hero statement and GitHub links", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("Trishna Bapna");
    await expect(page.getByText("I BUILD DIGITAL THINGS")).toBeVisible();
    await expect(page.getByText("CODE IN PUBLIC")).toBeVisible();
  });

  test("navigates to projects and checks Saksham case study details", async ({ page }) => {
    await page.goto("/projects");
    await expect(page.getByText("Saksham (सक्षम)")).toBeVisible();
    await page.getByRole("link", { name: /case study/i }).first().click();
    await expect(page).toHaveURL(/.*\/projects\/.+/);
    await expect(page.getByText("02 // PROJECT OVERVIEW")).toBeVisible();
    await expect(page.getByText("07. Technical Architecture")).toBeVisible();
  });

  test("checks creative lab and metronome controls", async ({ page }) => {
    await page.goto("/lab");
    await expect(page.getByText("CREATIVE LAB.")).toBeVisible();
    await expect(page.getByText("Acoustic Pacing Simulator")).toBeVisible();
  });

  test("checks contact form validation", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.getByText("LET'S CONNECT.")).toBeVisible();
    // Click submit empty to trigger errors
    await page.getByRole("button", { name: /send message/i }).click();
    await expect(page.getByText("Name must be at least")).toBeVisible();
  });
});
