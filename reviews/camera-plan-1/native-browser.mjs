// Pointer-lock regression checks need real relative mouse motion. Headless/CDP
// mouse moves generate cancelling recenter events, and lose held Shift state.
// Use a private Xvfb display, still under the standard browser job/GPU lifecycle.
import fs from "node:fs";
import { spawn, execFileSync } from "node:child_process";
import { chromium } from "playwright";
import { withBrowserJob } from "../../tools/lib/browser-job.mjs";

const input = `import ctypes as C,sys
x=C.CDLL('libX11.so.6');t=C.CDLL('libXtst.so.6')
x.XOpenDisplay.restype=C.c_void_p;d=x.XOpenDisplay(None)
if not d: raise RuntimeError('Cannot open the private test display')
x.XFlush.argtypes=[C.c_void_p]
x.XKeysymToKeycode.argtypes=[C.c_void_p,C.c_ulong];x.XKeysymToKeycode.restype=C.c_uint
if sys.argv[1]=='move':
 t.XTestFakeRelativeMotionEvent.argtypes=[C.c_void_p,C.c_int,C.c_int,C.c_ulong]
 t.XTestFakeRelativeMotionEvent(d,int(sys.argv[2]),int(sys.argv[3]),0)
elif sys.argv[1]=='absolute':
 t.XTestFakeMotionEvent.argtypes=[C.c_void_p,C.c_int,C.c_int,C.c_int,C.c_ulong]
 t.XTestFakeMotionEvent(d,-1,int(sys.argv[2]),int(sys.argv[3]),0)
elif sys.argv[1]=='button':
 t.XTestFakeButtonEvent.argtypes=[C.c_void_p,C.c_uint,C.c_int,C.c_ulong]
 t.XTestFakeButtonEvent(d,int(sys.argv[2]),int(sys.argv[3]),0)
else:
 t.XTestFakeKeyEvent.argtypes=[C.c_void_p,C.c_uint,C.c_int,C.c_ulong]
 t.XTestFakeKeyEvent(d,x.XKeysymToKeycode(d,int(sys.argv[2])),int(sys.argv[3]),0)
x.XFlush(d)
`;
export async function withNativeBrowser(name, run) {
  let number = 100 + (process.pid % 10000);
  while (
    fs.existsSync(`/tmp/.X11-unix/X${number}`) ||
    fs.existsSync(`/tmp/.X${number}-lock`)
  )
    number++;
  const display = `:${number}`;
  const env = { ...process.env, DISPLAY: display };
  const xvfb = spawn(
    "Xvfb",
    [display, "-screen", "0", "1600x1000x24", "-nolisten", "tcp"],
    { stdio: "ignore" },
  );
  const cleanupDisplay = () => {
    if (xvfb.pid && xvfb.exitCode === null && xvfb.signalCode === null)
      xvfb.kill("SIGTERM");
  };
  process.once("exit", cleanupDisplay);
  let startupError;
  xvfb.on("error", (error) => {
    startupError = error;
  });
  const launch = chromium.launch.bind(chromium);
  try {
    for (
      let i = 0;
      i < 50 && !fs.existsSync(`/tmp/.X11-unix/X${number}`);
      i++
    ) {
      if (startupError) throw startupError;
      if (xvfb.exitCode !== null)
        throw Error(`Xvfb exited with ${xvfb.exitCode}`);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (!fs.existsSync(`/tmp/.X11-unix/X${number}`))
      throw Error("Private test display did not start");
    chromium.launch = (options) =>
      launch({
        ...options,
        headless: false,
        env,
        args: [...options.args, "--window-size=1400,950"],
      });
    const send = (kind, a, b) =>
      execFileSync("python3", ["-c", input, kind, String(a), String(b)], {
        env,
      });
    const keys = {
      Shift: 65505,
      Escape: 65307,
      ArrowUp: 65362,
      ArrowDown: 65364,
      ArrowLeft: 65361,
      ArrowRight: 65363,
    };
    const key = (name, down) =>
      send("key", keys[name] || name.toLowerCase().charCodeAt(0), down ? 1 : 0);
    return await withBrowserJob(
      name,
      (browser) =>
        run(browser, {
          move: (x, y = 0) => send("move", x, y),
          async clickElement(page, locator) {
            const rect = await locator.boundingBox();
            if (!rect) throw Error("Native click target is not visible");
            const window = await page.evaluate(() => ({
              x: globalThis.screenX,
              y: globalThis.screenY,
              chrome: globalThis.outerHeight - globalThis.innerHeight,
            }));
            send(
              "absolute",
              Math.round(window.x + rect.x + rect.width / 2),
              Math.round(window.y + window.chrome + rect.y + rect.height / 2),
            );
            send("button", 1, 1);
            send("button", 1, 0);
          },
          down: (name) => key(name, true),
          up: (name) => key(name, false),
          press: (name) => {
            key(name, true);
            key(name, false);
          },
        }),
      { timeoutMs: 285000 },
    );
  } finally {
    chromium.launch = launch;
    cleanupDisplay();
    process.removeListener("exit", cleanupDisplay);
  }
}
