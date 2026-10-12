import { randomUUID } from "node:crypto";

import { test, expect } from "../fixtures/browser";
import { signIn } from "../helpers/sign-in";

test("创建组织并邀请新账号加入，刷新后成员关系仍然存在", async ({
  page,
  request,
  browser,
  account,
  baseURL,
}) => {
  const slug = `browser-invite-${randomUUID()}`;
  const organizationName = `Browser invite ${slug}`;
  const invitee = {
    name: `Invited user ${randomUUID()}`,
    email: `invited-${randomUUID()}@example.test`,
    password: `Invited-${randomUUID()}!`,
  };

  await signIn(page, account, "/me/organizations/new");
  await page.getByLabel("组织名称", { exact: true }).fill(organizationName);
  await page.getByLabel("Slug", { exact: true }).fill(slug);
  await page.getByRole("button", { name: "创建组织" }).click();
  await expect(page).toHaveURL((url) => url.pathname === `/org/${slug}`);
  await expect(page.getByRole("heading", { name: organizationName, exact: true })).toBeVisible();

  const organizationsResponse = await request.get("/api/auth/organization/list");
  await expect(organizationsResponse).toBeOK();
  const organizations = (await organizationsResponse.json()) as Array<{ id: string; slug: string }>;
  const organization = organizations.find((item) => item.slug === slug);
  if (!organization) throw new Error("The created organization is missing from the owner's list.");

  await page.getByRole("link", { name: "成员", exact: true }).click();
  await page.getByRole("button", { name: "邀请成员" }).click();
  await page.getByLabel("邮箱", { exact: true }).fill(invitee.email);
  await page.getByRole("button", { name: "发送邀请" }).click();
  await expect(page.getByRole("cell", { name: invitee.email, exact: true })).toBeVisible();

  const fullResponse = await request.get("/api/auth/organization/get-full-organization", {
    params: { organizationId: organization.id },
  });
  await expect(fullResponse).toBeOK();
  const full = (await fullResponse.json()) as {
    invitations: Array<{ id: string; email: string; status: string }>;
  };
  const invitation = full.invitations.find(
    (item) => item.email === invitee.email && item.status === "pending",
  );
  if (!invitation) throw new Error("The invitation created through the UI is missing.");

  const invitePath = `/invite/${invitation.id}`;
  const inviteeContext = await browser.newContext({ baseURL });
  try {
    const invitedPage = await inviteeContext.newPage();
    await invitedPage.goto(invitePath);
    await invitedPage.getByRole("link", { name: "登录或注册以继续" }).click();
    await expect(invitedPage).toHaveURL(
      (url) => url.pathname === "/login" && url.searchParams.get("redirect") === invitePath,
    );
    await invitedPage.getByLabel("Name", { exact: true }).fill(invitee.name);
    await invitedPage.getByLabel("Email", { exact: true }).fill(invitee.email);
    await invitedPage.getByLabel("Password", { exact: true }).fill(invitee.password);
    await invitedPage.getByRole("button", { name: "Sign Up", exact: true }).click();
    await expect(invitedPage).toHaveURL((url) => url.pathname === invitePath);
    await invitedPage.getByRole("button", { name: "接受邀请" }).click();
    await expect(invitedPage).toHaveURL((url) => url.pathname === `/org/${slug}`);
    await invitedPage.reload();
    await expect(
      invitedPage.getByRole("heading", { name: organizationName, exact: true }),
    ).toBeVisible();
  } finally {
    await inviteeContext.close();
  }

  await page.reload();
  await expect(page.getByRole("row").filter({ hasText: invitee.email })).toContainText(
    invitee.name,
  );
  await expect(page.getByText("待处理邀请")).toHaveCount(0);
});
