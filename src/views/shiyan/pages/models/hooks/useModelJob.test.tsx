/// <reference types="bun-types" />

import { describe, expect, it, mock } from "bun:test";
import { fireEvent, render, waitFor } from "@testing-library/react";
import React from "react";
import { useModelJob } from "./useModelJob";

const createDeferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((nextResolve) => {
    resolve = nextResolve;
  });

  return { promise, resolve };
};

interface HarnessProps {
  request: (signal: AbortSignal) => Promise<unknown>;
  onSuccess?: (result: unknown) => Promise<void> | void;
  setTrainingLock: (isLocked: boolean, lockPath?: string | null) => void;
  getErrorMessage?: (error: unknown) => string;
}

const Harness: React.FC<HarnessProps> = ({ request, onSuccess, setTrainingLock, getErrorMessage }) => {
  const { isLoading, error, retryCount, runJob } = useModelJob();

  return (
    <div>
      <div data-testid="loading">{String(isLoading)}</div>
      <div data-testid="error">{error ?? ""}</div>
      <div data-testid="retry-count">{String(retryCount)}</div>
      <button
        type="button"
        onClick={() => {
          void runJob({
            request,
            onSuccess,
            setTrainingLock,
            lockPath: "/model/test",
            getErrorMessage,
          });
        }}
      >
        run
      </button>
    </div>
  );
};

describe("useModelJob", () => {
  it("keeps loading and the training lock active until async success work completes", async () => {
    const deferred = createDeferred();
    const request = mock(async () => ({ status: "success" }));
    const onSuccess = mock(async () => {
      await deferred.promise;
    });
    const setTrainingLock = mock(() => {});

    const view = render(
      <Harness
        request={request}
        onSuccess={onSuccess}
        setTrainingLock={setTrainingLock}
      />,
    );

    fireEvent.click(view.getByRole("button", { name: "run" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));

    expect(view.getByTestId("loading").textContent).toBe("true");
    expect(setTrainingLock).toHaveBeenCalledWith(true, "/model/test");
    expect(setTrainingLock).not.toHaveBeenCalledWith(false, null);

    deferred.resolve();

    await waitFor(() => expect(view.getByTestId("loading").textContent).toBe("false"));
    expect(setTrainingLock).toHaveBeenLastCalledWith(false, null);
  });

  it("surfaces errors thrown during async success work through the shared error flow", async () => {
    const request = mock(async () => ({ status: "success" }));
    const setTrainingLock = mock(() => {});

    const view = render(
      <Harness
        request={request}
        onSuccess={async () => {
          throw new Error("sync failed");
        }}
        setTrainingLock={setTrainingLock}
        getErrorMessage={(error) => error instanceof Error ? error.message : "fallback"}
      />,
    );

    fireEvent.click(view.getByRole("button", { name: "run" }));

    await waitFor(() => expect(view.getByTestId("error").textContent).toBe("sync failed"));
    expect(view.getByTestId("retry-count").textContent).toBe("1");
    expect(view.getByTestId("loading").textContent).toBe("false");
    expect(setTrainingLock).toHaveBeenLastCalledWith(false, null);
  });

  it("does not count backend busy responses toward the retry limit", async () => {
    const busyError = Object.assign(
      new Error("HTTP 429 Too Many Requests - 模型服务繁忙，请稍后再试"),
      { status: 429, payload: { error: "模型服务繁忙，请稍后再试" } },
    );
    const request = mock(async () => {
      throw busyError;
    });
    const setTrainingLock = mock(() => {});

    const view = render(
      <Harness
        request={request}
        setTrainingLock={setTrainingLock}
      />,
    );

    fireEvent.click(view.getByRole("button", { name: "run" }));

    await waitFor(() =>
      expect(view.getByTestId("error").textContent).toContain("模型服务繁忙"),
    );
    expect(view.getByTestId("retry-count").textContent).toBe("0");
    expect(view.getByTestId("loading").textContent).toBe("false");
    expect(setTrainingLock).toHaveBeenLastCalledWith(false, null);
  });

  it("ignores a duplicate start while the current job is still in flight", async () => {
    const deferred = createDeferred();
    const request = mock(async () => {
      await deferred.promise;
      return { status: "success" };
    });
    const setTrainingLock = mock(() => {});
    const view = render(
      <Harness
        request={request}
        setTrainingLock={setTrainingLock}
      />,
    );

    const runButton = view.getByRole("button", { name: "run" });
    fireEvent.click(runButton);
    fireEvent.click(runButton);

    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));

    deferred.resolve();

    await waitFor(() => expect(view.getByTestId("loading").textContent).toBe("false"));
  });
});
