import os
import sys
import warnings

# Ensure backend directory is in sys.path for all pytest runs
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

warnings.filterwarnings("ignore", category=DeprecationWarning)
warnings.filterwarnings("ignore", message=".*Using `httpx` with `starlette.testclient`.*")
