/// <reference types="bun-types" />
/// <reference lib="dom" />

import { describe, expect, it, mock } from "bun:test";
import { render } from "@testing-library/react";
import { LoginForm } from "./LoginForm";

const renderLoginForm = (selectedRole: string) => render(
  <LoginForm
    selectedRole={selectedRole}
    onSubmit={mock(async () => {})}
    onSwitchToRegister={mock(() => {})}
    isLoading={false}
    error={null}
  />,
);

describe("LoginForm", () => {
  it("shows the register prompt for students", () => {
    const view = renderLoginForm("student");

    expect(view.getByRole("button", { name: "还没有账号？立即注册" })).not.toBeNull();
  });

  it.each([
    ["teacher"],
    ["assistant"],
    ["admin"],
  ])("hides the register prompt for %s login", (role) => {
    const view = renderLoginForm(role);

    expect(view.queryByRole("button", { name: "还没有账号？立即注册" })).toBeNull();
  });
});
