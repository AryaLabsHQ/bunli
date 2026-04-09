import { describe, expect, test } from "bun:test";

import type { RuntimeEvent } from "../src/events.js";
import {
  detectImageCapability,
  renderImage,
  resolveImageRenderMode,
  shouldFailOnImageMiss,
} from "../src/image/index.js";

function createCaptureStdout(isTTY: boolean): { stdout: NodeJS.WriteStream; output: () => string } {
  let buffer = "";
  const stdout = {
    isTTY,
    write(chunk: string, callback?: (error?: Error | null) => void) {
      buffer += String(chunk);
      callback?.(null);
      return true;
    },
    once(_event: string, callback: () => void) {
      callback();
      return this;
    },
  } as unknown as NodeJS.WriteStream;

  return {
    stdout,
    output: () => buffer,
  };
}

describe("@bunli/runtime image mode", () => {
  test("resolves mode with flag > config > default precedence", () => {
    expect(resolveImageRenderMode({ defaultMode: "off" })).toBe("off");
    expect(resolveImageRenderMode({ defaultMode: "off", configMode: "on" })).toBe("on");
    expect(resolveImageRenderMode({ defaultMode: "off", configMode: "on", flagMode: "auto" })).toBe(
      "auto",
    );
  });

  test("strict failure guard only applies to on mode", () => {
    expect(shouldFailOnImageMiss("off")).toBe(false);
    expect(shouldFailOnImageMiss("auto")).toBe(false);
    expect(shouldFailOnImageMiss("on")).toBe(true);
  });
});

describe("@bunli/runtime image capability", () => {
  test("returns not-interactive when stdout is not tty", () => {
    const { stdout } = createCaptureStdout(false);
    const capability = detectImageCapability({
      env: { TERM_PROGRAM: "kitty" },
      stdout,
    });
    expect(capability.supported).toBe(false);
    expect(capability.protocol).toBe("none");
    expect(capability.reason).toBe("not-interactive");
  });

  test("detects kitty protocol when TERM_PROGRAM=kitty", () => {
    const { stdout } = createCaptureStdout(true);
    const capability = detectImageCapability({
      env: { TERM_PROGRAM: "kitty", TERM: "xterm-256color" },
      stdout,
    });
    expect(capability.supported).toBe(true);
    expect(capability.protocol).toBe("kitty");
  });
});

describe("@bunli/runtime renderImage", () => {
  test("off mode always skips rendering", async () => {
    const { stdout } = createCaptureStdout(true);
    const result = await renderImage(
      {
        kind: "bytes",
        bytes: new Uint8Array([137, 80, 78, 71]),
        mimeType: "image/png",
      },
      {
        mode: "off",
        stdout,
      },
    );

    expect(result.rendered).toBe(false);
    expect(result.reason).toBe("mode-off");
  });

  test("auto mode returns non-fatal miss on unsupported terminal", async () => {
    const { stdout } = createCaptureStdout(true);
    const result = await renderImage(
      {
        kind: "bytes",
        bytes: new Uint8Array([137, 80, 78, 71]),
        mimeType: "image/png",
      },
      {
        mode: "auto",
        env: { TERM_PROGRAM: "iTerm.app" },
        stdout,
      },
    );

    expect(result.rendered).toBe(false);
    expect(result.reason).toBe("capability-missing");
  });

  test("on mode throws structured error when unsupported terminal", async () => {
    const { stdout } = createCaptureStdout(true);

    await expect(
      renderImage(
        {
          kind: "bytes",
          bytes: new Uint8Array([137, 80, 78, 71]),
          mimeType: "image/png",
        },
        {
          mode: "on",
          env: { TERM_PROGRAM: "iTerm.app" },
          stdout,
        },
      ),
    ).rejects.toMatchObject({
      name: "ImageRenderError",
      code: "capability-missing",
    });
  });

  test("writes kitty escape payload for supported terminals", async () => {
    const { stdout, output } = createCaptureStdout(true);
    const result = await renderImage(
      {
        kind: "bytes",
        bytes: new Uint8Array([137, 80, 78, 71]),
        mimeType: "image/png",
      },
      {
        mode: "on",
        env: { TERM_PROGRAM: "kitty", TERM: "xterm-kitty" },
        stdout,
      },
    );

    expect(result.rendered).toBe(true);
    expect(result.protocol).toBe("kitty");
    expect((result.bytesWritten ?? 0) > 0).toBe(true);
    expect(output()).toContain("\x1b_G");
  });

  test("rejects non-png input in auto mode without throwing", async () => {
    const { stdout } = createCaptureStdout(true);
    const result = await renderImage(
      {
        kind: "bytes",
        bytes: new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
        mimeType: "image/jpeg",
      },
      {
        mode: "auto",
        env: { TERM_PROGRAM: "kitty", TERM: "xterm-kitty" },
        stdout,
      },
    );

    expect(result.rendered).toBe(false);
    expect(result.reason).toBe("unsupported-format");
  });

  test("rejects non-png input in on mode with structured error", async () => {
    const { stdout } = createCaptureStdout(true);
    await expect(
      renderImage(
        {
          kind: "bytes",
          bytes: new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
          mimeType: "image/jpeg",
        },
        {
          mode: "on",
          env: { TERM_PROGRAM: "kitty", TERM: "xterm-kitty" },
          stdout,
        },
      ),
    ).rejects.toMatchObject({
      name: "ImageRenderError",
      code: "unsupported-format",
    });
  });

  test("sends kitty metadata only on first chunk", async () => {
    const { stdout, output } = createCaptureStdout(true);
    const largePngBytes = new Uint8Array(4000);
    largePngBytes.fill(1);

    const result = await renderImage(
      {
        kind: "bytes",
        bytes: largePngBytes,
        mimeType: "image/png",
      },
      {
        mode: "on",
        env: { TERM_PROGRAM: "kitty", TERM: "xterm-kitty" },
        stdout,
        width: 32,
        height: 16,
      },
    );

    expect(result.rendered).toBe(true);

    const chunks = output()
      .split("\x1b_G")
      .slice(1)
      .map((segment) => segment.split(";")[0] ?? "");
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]).toContain("a=T");
    expect(chunks[0]).toContain("f=100");
    expect(chunks[0]).toContain("c=32");
    expect(chunks[0]).toContain("r=16");
    for (let i = 1; i < chunks.length; i += 1) {
      expect(chunks[i]).toMatch(/^m=[01]$/);
      expect(chunks[i]).not.toContain("a=");
      expect(chunks[i]).not.toContain("f=");
      expect(chunks[i]).not.toContain("c=");
      expect(chunks[i]).not.toContain("r=");
    }
  });

  test("aborted signals throw immediately", async () => {
    const { stdout } = createCaptureStdout(true);
    const controller = new AbortController();
    controller.abort();

    await expect(
      renderImage(
        {
          kind: "bytes",
          bytes: new Uint8Array([137, 80, 78, 71]),
          mimeType: "image/png",
        },
        {
          mode: "on",
          env: { TERM_PROGRAM: "kitty", TERM: "xterm-kitty" },
          stdout,
          signal: controller.signal,
        },
      ),
    ).rejects.toMatchObject({
      name: "ImageRenderError",
      code: "aborted",
    });
  });

  test("emits runtime image attempt/result events when transport is provided", async () => {
    const { stdout } = createCaptureStdout(true);
    const sent: RuntimeEvent[] = [];
    await renderImage(
      {
        kind: "bytes",
        bytes: new Uint8Array([137, 80, 78, 71]),
        mimeType: "image/png",
      },
      {
        mode: "auto",
        env: { TERM_PROGRAM: "iTerm.app" },
        stdout,
        transport: {
          send(event) {
            sent.push(event);
          },
        },
      },
    );

    expect(sent).toHaveLength(2);
    expect(sent[0]?.type).toBe("runtime.image.render.attempt");
    expect(sent[1]?.type).toBe("runtime.image.render.result");
  });
});
