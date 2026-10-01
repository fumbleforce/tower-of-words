"""Take / release the shared GPU lock (GUIDE: GPU lock) for the mio-ref-clean round.
python3 gpulock.py take [max_wait_s]   -> waits (20 s steps) until the lock is free, then takes it
python3 gpulock.py release             -> frees ComfyUI VRAM, removes the lock only if it is ours"""
import os, sys, time, json, shutil, urllib.request
LOCK, ME = '/tmp/claude-1000/gpu.lock', 'claude-agent:mio-ref-clean'

def take(max_wait=900):
    t0 = time.time()
    while True:
        try:
            os.mkdir(LOCK)
            open(f'{LOCK}/owner', 'w').write(ME)
            print('lock taken'); return
        except FileExistsError:
            if time.time() - t0 > max_wait:
                sys.exit('lock still held by ' + open(f'{LOCK}/owner').read())
            time.sleep(20)

def release():
    req = urllib.request.Request('http://127.0.0.1:8188/free', data=json.dumps({'unload_models': True, 'free_memory': True}).encode(),
                                 headers={'Content-Type': 'application/json'})
    urllib.request.urlopen(req).read()
    if os.path.exists(f'{LOCK}/owner') and ME in open(f'{LOCK}/owner').read():
        shutil.rmtree(LOCK); print('lock released')

if __name__ == '__main__':
    take(int(sys.argv[2]) if len(sys.argv) > 2 else 900) if sys.argv[1] == 'take' else release()
