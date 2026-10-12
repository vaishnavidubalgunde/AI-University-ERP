# AI-Integrated University Student Support ERP — Setup & Execution Guide

This document explains how to set up, configure, and run the frontend and backend applications locally in development mode.

---

## Prerequisites

- **Node.js**: v18.0.0 or newer (v22+ recommended)
- **Python**: v3.10 or newer (v3.11/v3.12/v3.13 supported)
- **Git**: For version control

---

## 1. Backend Setup

1. Open a terminal in the project root:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   - **Windows (PowerShell)**:
     ```powershell
     python -m venv venv
     .\venv\Scripts\Activate.ps1
     ```
   - **Linux / macOS**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. Install required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables:
   ```bash
   cp .env.example .env
   ```

5. Run the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   The backend API will be live at: `http://localhost:8000`
   Interactive API docs (Swagger UI): `http://localhost:8000/api/v1/docs`
   Health check endpoint: `http://localhost:8000/api/health`

---

## 2. Frontend Setup

1. Open a terminal in the `frontend` directory:
   ```bash
   cd frontend
   ```

2. Install Node dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The frontend application will be live at: `http://localhost:5173`

---

## 3. Running Automated Tests

To verify backend health check and environment status:
```bash
cd backend
pytest ../tests/ -v
```

To run TypeScript verification on the frontend:
```bash
cd frontend
npm run build
```
