/// <reference types="bun-types" />
/// <reference lib="dom" />

import { describe, expect, it, mock } from "bun:test";
import { render } from "@testing-library/react";
import { RoleSelector } from "./RoleSelector";

describe("RoleSelector", () => {
  it("shows all roles in login mode", () => {
    const view = render(
      <RoleSelector selectedRole="student" onRoleSelect={mock(() => {})} mode="login" />,
    );

    expect(view.getByRole("button", { name: /学生/ })).not.toBeNull();
    expect(view.getByRole("button", { name: /教师/ })).not.toBeNull();
    expect(view.getByRole("button", { name: /助教/ })).not.toBeNull();
    expect(view.getByRole("button", { name: /管理员/ })).not.toBeNull();
  });

  it("only shows the student role in register mode", () => {
    const view = render(
      <RoleSelector selectedRole="student" onRoleSelect={mock(() => {})} mode="register" />,
    );

    expect(view.getByRole("button", { name: /学生/ })).not.toBeNull();
    expect(view.queryByRole("button", { name: /教师/ })).toBeNull();
    expect(view.queryByRole("button", { name: /助教/ })).toBeNull();
    expect(view.queryByRole("button", { name: /管理员/ })).toBeNull();
  });
});
