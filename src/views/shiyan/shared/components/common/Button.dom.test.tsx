/// <reference types="bun-types" />
/// <reference lib="dom" />

import { describe, expect, it, mock } from "bun:test";
import { fireEvent, render } from "@testing-library/react";
import Button from "./Button";

describe("Button DOM", () => {
  it("renders children and triggers clicks in the DOM environment", () => {
    const onClick = mock(() => {});

    const view = render(<Button onClick={onClick}>开始实验</Button>);

    const button = view.getByRole("button", { name: "开始实验" });

    fireEvent.click(button);

    expect(button.textContent).toBe("开始实验");
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("shows the loading state text and disables the button", () => {
    const view = render(
      <Button isLoading onClick={() => {}}>
        开始实验
      </Button>,
    );

    const button = view.getByRole("button", { name: "处理中..." });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(view.queryByText("开始实验")).toBeNull();
  });
});