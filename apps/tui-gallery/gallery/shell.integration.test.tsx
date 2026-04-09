import { afterEach, describe, expect, test } from "bun:test";

import { RuntimeProvider as RuntimeTestProvider } from "@bunli/runtime/app";
import { testRender } from "@opentui/react/test-utils";
import { act } from "react";

import { GalleryShell } from "./shell.js";

type TestSetup = Awaited<ReturnType<typeof testRender>>;

const activeSetups: TestSetup[] = [];

async function flushFrames(renderOnce: () => Promise<void>, count = 4): Promise<void> {
  for (let index = 0; index < count; index += 1) {
    await renderOnce();
    await Promise.resolve();
  }
}

async function setup(width: number, height: number) {
  const rendered = await testRender(
    <RuntimeTestProvider>
      <GalleryShell initialTheme="dark" />
    </RuntimeTestProvider>,
    {
      width,
      height,
      useConsole: false,
      useAlternateScreen: false,
      useMouse: true,
      enableMouseMovement: true,
      exitOnCtrlC: false,
    },
  );
  activeSetups.push(rendered);
  await act(async () => {
    await flushFrames(rendered.renderOnce);
  });
  return rendered;
}

afterEach(async () => {
  while (activeSetups.length > 0) {
    const rendered = activeSetups.pop();
    if (!rendered) continue;
    if (!rendered.renderer.isDestroyed) {
      await act(async () => {
        rendered.renderer.destroy();
      });
    }
  }
});

describe("tui gallery shell", () => {
  test("renders default component example in wide layout", async () => {
    const rendered = await setup(150, 32);
    const frame = rendered.captureCharFrame();

    expect(frame).toContain("TUI Gallery");
    expect(frame).toContain("Credentials Form");
    expect(frame).toContain("Info / Help");
  });

  test("renders pane selector in narrow layout", async () => {
    const rendered = await setup(88, 28);
    const frame = rendered.captureCharFrame();

    expect(frame).toContain("Browse");
    expect(frame).toContain("[Preview]");
    expect(frame).toContain("Info");
  });
});
