import os
import subprocess
import time
import webbrowser

BASE = os.path.dirname(os.path.abspath(__file__))
NO_WIN = subprocess.CREATE_NO_WINDOW


def kill_port(port):
    try:
        result = subprocess.run(
            f'netstat -ano | findstr :{port}',
            shell=True, capture_output=True, text=True, creationflags=NO_WIN,
        )
        pids = set()
        for line in result.stdout.splitlines():
            parts = line.strip().split()
            if parts and parts[-1].isdigit():
                pids.add(parts[-1])
        for pid in pids:
            subprocess.run(
                f'taskkill /F /PID {pid}',
                shell=True, capture_output=True, creationflags=NO_WIN,
            )
    except Exception:
        pass


kill_port(8000)
kill_port(5173)
time.sleep(1)

subprocess.Popen(
    'py -3 -m uvicorn main:app --port 8000',
    cwd=os.path.join(BASE, 'backend'),
    shell=True,
    creationflags=NO_WIN,
)

subprocess.Popen(
    'npm run dev',
    cwd=os.path.join(BASE, 'frontend'),
    shell=True,
    creationflags=NO_WIN,
)

time.sleep(5)
webbrowser.open('http://localhost:5173')
