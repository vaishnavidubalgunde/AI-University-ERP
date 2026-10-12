# AI-Integrated University Student Support ERP — Architecture Overview

## 1. System Vision & Objective
The system is an enterprise-grade University Student Support ERP designed around a modern student lifecycle management portal coupled with a specialized multi-agent Generative AI & Retrieval-Augmented Generation (RAG) subsystem.

The architecture is rooted in research principles for academic AI agents:
- Grounded responses backed strictly by university policy documents (anti-hallucination).
- Deterministic intent classification and role-scoped agent routing.
- Contextual multi-turn conversational memory isolated by student session.
- Multilingual natural language understanding (English, Kannada, Hindi).

---

## 2. Monorepo Structure

```
AI-University-ERP/
├── backend/                  # FastAPI Python backend
│   ├── app/
│   │   ├── core/             # Settings, Database engine, JWT Security
│   │   ├── api/              # Modular API endpoints (V1)
│   │   ├── models/           # SQLAlchemy 2.0 ORM schemas
│   │   ├── schemas/          # Pydantic v2 input/output DTOs
│   │   ├── services/         # Business logic services
│   │   └── ai/               # Multi-agent orchestrator & RAG pipeline
│   ├── data/                 # SQLite database, PDF documents, FAISS indexes
│   ├── requirements.txt
│   └── .env.example
├── frontend/                 # React + Vite + TypeScript web application
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/       # ERP Layout, Sidebar, Topbar
│   │   │   └── ui/           # Reusable design primitives (Button, Card, Table, Modal, etc.)
│   │   ├── services/         # Axios API client
│   │   ├── types/            # TypeScript interfaces
│   │   ├── App.tsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.ts
├── docs/                     # Project technical documentation
│   ├── architecture.md
│   └── setup.md
├── tests/                    # Backend smoke & unit tests
└── .env.example
```

---

## 3. Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend UI** | React 18, Vite, TypeScript | Modern, high-performance Single Page Application |
| **Styling** | Tailwind CSS | University ERP design tokens, sleek typography |
| **Icons & Visuals** | Lucide React, Recharts | Consistent iconography and academic analytics |
| **Backend Framework** | FastAPI (ASGI / Uvicorn) | High-concurrency RESTful API with automated OpenAPI docs |
| **Data Validation** | Pydantic v2 | Strict serialization and request/response validation contracts |
| **ORM & Database** | SQLAlchemy 2.0, SQLite / PostgreSQL | Database-agnostic schema with relational integrity |
| **Vector Engine (RAG)** | FAISS & Sentence Transformers | Dense vector similarity search with page-level citations |
| **Security** | JWT (PyJWT/python-jose), Passlib (Bcrypt) | Secure student/admin authentication and RBAC |

---

## 4. Foundational Design Principles
1. **Incremental Modular Build**: Each phase is independently testable before moving to the next.
2. **Zero-Trust Student Isolation**: Students can only access their own academic records. All database queries are scoped by authenticated student ID.
3. **Deterministic Business Calculations**: CGPA, attendance percentages, and examination eligibility are calculated strictly by backend business logic, not inferred by LLMs.
