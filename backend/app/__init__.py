import sys
import os

# Ensure backend root is always in python path regardless of where uvicorn is launched
_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)
