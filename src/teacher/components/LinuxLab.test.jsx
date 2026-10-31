import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "@/api/client";
import LinuxLab from "./LinuxLab";

const terminalMock = vi.hoisted(() => ({ instances: [] }));

vi.mock("@/api/client", () => ({ default: { post: vi.fn() } }));
vi.mock("@xterm/xterm", () => ({
  Terminal: class {
    constructor() {
      this.writes = [];
      terminalMock.instances.push(this);
    }
    loadAddon() {}
    open() {}
    fit() {}
    write(value) { this.writes.push(value); }
    writeln(value) { this.writes.push(`${value}\n`); }
    onData(callback) { this.onDataCallback = callback; }
    dispose() {}
    clear() {}
  },
}));
vi.mock("@xterm/addon-fit", () => ({
  FitAddon: class { fit() {} },
}));

const question = { _id: "question-1" };
const startedSession = {
  data: {
    data: {
      sessionId: "session-1",
      welcome: "Sandbox ready",
    },
  },
};

describe("Linux exam terminal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    terminalMock.instances.length = 0;
  });

  it("sends typed commands to the session and renders the real command output", async () => {
    api.post
      .mockResolvedValueOnce(startedSession)
      .mockResolvedValueOnce({
        data: {
          data: {
            stdout: "/home/student\n",
            stderr: "",
            exitCode: 0,
            cwd: "/home/student",
          },
        },
      });
    const onSessionReady = vi.fn();

    render(
      <LinuxLab
        question={question}
        examId="exam-1"
        onSessionReady={onSessionReady}
      />,
    );

    await screen.findByText("● Connected");
    expect(onSessionReady).toHaveBeenCalledWith("session-1");
    for (const char of "pwd\r") {
      await terminalMock.instances[0].onDataCallback(char);
    }

    await waitFor(() => expect(api.post).toHaveBeenLastCalledWith(
      "/api/labs/terminal/exec",
      { sessionId: "session-1", command: "pwd" },
    ));
    expect(terminalMock.instances[0].writes.join("")).toContain("/home/student\r\n");
  });

  it("shows an unavailable sandbox error without fabricating a connected session", async () => {
    api.post.mockRejectedValueOnce({
      response: { data: { message: "Terminal service is unavailable." } },
    });

    render(<LinuxLab question={question} examId="exam-1" />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Terminal service is unavailable.",
    );
    expect(screen.getByText("● Error")).toBeInTheDocument();
  });

  it("reconnects to a live session instead of starting a duplicate container", async () => {
    api.post.mockResolvedValueOnce({
      data: { data: { output: "__ping_ok__\n" } },
    });
    const onSessionReady = vi.fn();

    render(
      <LinuxLab
        question={question}
        examId="exam-1"
        initialSessionId="session-1"
        onSessionReady={onSessionReady}
      />,
    );

    await screen.findByText("● Connected");
    expect(api.post).toHaveBeenCalledOnce();
    expect(api.post).toHaveBeenCalledWith("/api/labs/terminal/exec", {
      sessionId: "session-1",
      command: "echo __ping_ok__",
    });
    expect(onSessionReady).toHaveBeenCalledWith("session-1");
  });
});
