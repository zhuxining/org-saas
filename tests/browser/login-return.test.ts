import { test, expect } from "../fixtures/browser";
import { submitSignIn } from "../helpers/sign-in";

test("登录回到原组织页面，退出后刷新不能继续访问", async ({ page, account }) => {
  const target = `/org/${account.organization.slug}`;
  await page.goto(target);
  await expect(page).toHaveURL(
    (url) => url.pathname === "/login" && url.searchParams.get("redirect") === target,
  );

  await submitSignIn(page, account);

  await expect(page).toHaveURL((url) => url.pathname === target);
  await expect(
    page.getByRole("heading", { name: account.organization.name, exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: account.organization.name, exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: account.name }).click();
  await expect(page.getByRole("menuitem", { name: "退出登录" })).toBeVisible();
  await page.getByRole("menuitem", { name: "退出登录" }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/");

  await page.goto(target);
  await page.reload();
  await expect(page).toHaveURL(
    (url) => url.pathname === "/login" && url.searchParams.get("redirect") === target,
  );
  await expect(
    page.getByRole("heading", { name: account.organization.name, exact: true }),
  ).toHaveCount(0);
});
