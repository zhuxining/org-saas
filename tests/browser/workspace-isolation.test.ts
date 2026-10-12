import { randomUUID } from "node:crypto";

import { test, expect, createBrowserAccount } from "../fixtures/browser";
import { signIn } from "../helpers/sign-in";

test("两个标签页分别操作不同组织，刷新和切换后团队数据仍保持隔离", async ({
  page,
  context,
  request,
  account,
}) => {
  const suffix = randomUUID();
  const secondSlug = `browser-second-${suffix}`;
  const secondResponse = await request.post("/api/auth/organization/create", {
    data: { name: `Second organization ${suffix}`, slug: secondSlug },
  });
  await expect(secondResponse).toBeOK();
  const second = (await secondResponse.json()) as { id: string };
  const firstTeam = `Team A ${suffix}`;
  const secondTeam = `Team B ${suffix}`;
  for (const [organizationId, name] of [
    [account.organization.id, firstTeam],
    [second.id, secondTeam],
  ]) {
    const response = await request.post("/api/auth/organization/create-team", {
      data: { organizationId, name },
    });
    await expect(response).toBeOK();
  }

  const firstPath = `/org/${account.organization.slug}/teams`;
  const secondPath = `/org/${secondSlug}/teams`;
  await signIn(page, account, firstPath);
  await expect(page.getByText(firstTeam, { exact: true })).toBeVisible();
  await expect(page.getByText(secondTeam, { exact: true })).toHaveCount(0);

  const secondPage = await context.newPage();
  await secondPage.goto(secondPath);
  await expect(secondPage.getByText(secondTeam, { exact: true })).toBeVisible();
  await expect(secondPage.getByText(firstTeam, { exact: true })).toHaveCount(0);

  await page.reload();
  const newTeam = `Created in A ${suffix}`;
  await page.getByRole("button", { name: "创建团队", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "创建团队" });
  await dialog.getByLabel("团队名称").fill(newTeam);
  await dialog.getByRole("button", { name: "创建团队", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText(newTeam, { exact: true })).toBeVisible();

  await secondPage.reload();
  await expect(secondPage.getByText(secondTeam, { exact: true })).toBeVisible();
  await expect(secondPage.getByText(newTeam, { exact: true })).toHaveCount(0);

  await page.goto(secondPath);
  await expect(page.getByText(secondTeam, { exact: true })).toBeVisible();
  await expect(page.getByText(newTeam, { exact: true })).toHaveCount(0);
  await page.goto(firstPath);
  await expect(page.getByText(newTeam, { exact: true })).toBeVisible();
  await expect(page.getByText(secondTeam, { exact: true })).toHaveCount(0);
});

test("退出并换账号后，旧组织数据不能通过缓存或直接地址继续访问", async ({ page, account }) => {
  const secondAccount = await createBrowserAccount();
  const secondSlug = secondAccount.organization.slug;
  const secondName = secondAccount.organization.name;

  const firstPath = `/org/${account.organization.slug}`;
  await signIn(page, account, firstPath);
  await expect(
    page.getByRole("heading", { name: account.organization.name, exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: account.name }).click();
  await page.getByRole("menuitem", { name: "退出登录" }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/");

  await signIn(page, secondAccount, "/me/organizations");
  await expect(page.getByText(secondName, { exact: true })).toBeVisible();
  await expect(page.getByText(account.organization.name, { exact: true })).toHaveCount(0);

  await page.goto(firstPath);
  await expect(
    page.getByText("You are not a member of this organization.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: account.organization.name, exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByText("You are not a member of this organization.", { exact: true }),
  ).toBeVisible();

  await page.goto(`/org/${secondSlug}`);
  await expect(page.getByRole("heading", { name: secondName, exact: true })).toBeVisible();
});
