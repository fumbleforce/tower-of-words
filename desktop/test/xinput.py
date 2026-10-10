"""Send keys and clicks to an X display through XTest (libXtst), for driving a release build that has no debugging
port (desktop/test/app-run.mjs). Nothing here touches a real screen: the display is the test's own Xvfb.

  python3 desktop/test/xinput.py :91 key Return
  python3 desktop/test/xinput.py :91 click 640 400
  python3 desktop/test/xinput.py :91 hold w 1.5      (hold a key for 1.5 s)
"""
import ctypes, sys, time

x11 = ctypes.cdll.LoadLibrary('libX11.so.6')
xt = ctypes.cdll.LoadLibrary('libXtst.so.6')
x11.XOpenDisplay.restype = ctypes.c_void_p
x11.XStringToKeysym.restype = ctypes.c_ulong
x11.XKeysymToKeycode.argtypes = [ctypes.c_void_p, ctypes.c_ulong]
x11.XFlush.argtypes = [ctypes.c_void_p]
x11.XCloseDisplay.argtypes = [ctypes.c_void_p]
x11.XStringToKeysym.argtypes = [ctypes.c_char_p]
xt.XTestFakeKeyEvent.argtypes = [ctypes.c_void_p, ctypes.c_uint, ctypes.c_int, ctypes.c_ulong]
xt.XTestFakeButtonEvent.argtypes = [ctypes.c_void_p, ctypes.c_uint, ctypes.c_int, ctypes.c_ulong]
xt.XTestFakeMotionEvent.argtypes = [ctypes.c_void_p, ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_ulong]

dpy = x11.XOpenDisplay(sys.argv[1].encode())
if not dpy:
    sys.exit('cannot open display ' + sys.argv[1])
cmd = sys.argv[2]


def code(name):
    sym = x11.XStringToKeysym(name.encode())
    if not sym:
        sys.exit('unknown key ' + name)
    return x11.XKeysymToKeycode(dpy, sym)


if cmd in ('key', 'hold'):
    kc = code(sys.argv[3])
    xt.XTestFakeKeyEvent(dpy, kc, 1, 0)
    x11.XFlush(dpy)
    time.sleep(float(sys.argv[4]) if cmd == 'hold' else 0.05)
    xt.XTestFakeKeyEvent(dpy, kc, 0, 0)
elif cmd == 'click':
    xt.XTestFakeMotionEvent(dpy, -1, int(sys.argv[3]), int(sys.argv[4]), 0)
    x11.XFlush(dpy)
    time.sleep(0.05)
    xt.XTestFakeButtonEvent(dpy, 1, 1, 0)
    x11.XFlush(dpy)
    time.sleep(0.05)
    xt.XTestFakeButtonEvent(dpy, 1, 0, 0)
else:
    sys.exit('key|hold|click')
x11.XFlush(dpy)
x11.XCloseDisplay(dpy)
