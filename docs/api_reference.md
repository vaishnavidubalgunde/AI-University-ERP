# AI-Integrated University ERP — API Reference Documentation
## Complete Specification for REST APIs (FastAPI v1)

Base URL: `/api/v1`

---

## 1. Authentication & Identity (`/api/v1/auth`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/auth/login` | Authenticate user with email and password. Returns JWT access token and user payload. | No |
| `POST` | `/auth/register` | Register student / faculty / admin account with institutional role validation. | No |
| `GET` | `/auth/me` | Fetch authenticated user's profile, role, and active session status. | Yes (Bearer) |

---

## 2. Core ERP Endpoints

### Academic Management (`/api/v1/academics`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/academics/courses` | List enrolled courses with credit weightage and syllabus summaries. | Yes |
| `GET` | `/academics/attendance` | Course-by-course attendance logs with 75% shortage calculation. | Yes |
| `GET` | `/academics/marks` | Continuous Internal Evaluation (CIE) test and assignment marks. | Yes |

### Examinations & Timetable (`/api/v1/exams`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/exams/schedules` | Semester End Examination (SEE) timetables with classroom & seat allocations. | Yes |
| `GET` | `/exams/hall-ticket` | Digital hall ticket with cryptographically secure QR code verification stamp. | Yes |
| `GET` | `/exams/eligibility` | Deterministic clearance checks (Attendance >= 75%, CIE >= 40%, Fee Dues = 0). | Yes |

### Finance & Notices (`/api/v1/finance`, `/api/v1/notices`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/finance/fees` | Fee structure breakdown, dues, late fee fine slabs, and payment receipts. | Yes |
| `GET` | `/notices` | Institutional announcements, circulars, and departmental notifications. | Yes |

### Placements & Grievances (`/api/v1/placements`, `/api/v1/grievances`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/placements/drives` | Active campus recruitment drives, CTC tiers, and eligibility criteria. | Yes |
| `POST` | `/placements/apply/{drive_id}` | Apply for campus drive with 1.5x CTC upgrade rule enforcement. | Yes |
| `POST` | `/grievances` | Submit confidential academic or administrative grievance ticket. | Yes |

---

## 3. Generative AI Subsystem (`/api/v1/ai`)

### Intelligent Multi-Agent Chat & RAG
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/ai/chat` | Main conversational endpoint. Supports conversational memory sliding window, anaphoric reference resolution, dynamic student personalization, trilingual NLP (`en`, `kn`, `hi`), and safety guardrails. |
| `POST` | `/ai/intent/classify` | Deterministic query intent classification and entity extraction. |
| `GET` | `/ai/rag/search` | Semantic similarity search against indexed university policy PDFs via FAISS. |
| `POST` | `/ai/rag/ingest` | Admin endpoint to trigger PDF parsing, semantic chunking, and vector index rebuilds. |

### Specialized Deterministic Domain Agents
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/ai/agents/academic` | Academic Advisor Agent for attendance recovery and CIE marks trajectory. |
| `POST` | `/ai/agents/examination` | Examination Officer Agent for multi-criteria clearance and hall ticket QR verification. |
| `POST` | `/ai/agents/placement` | Placement Coordinator Agent for drive eligibility matching and CTC upgrade rules. |

### Proactive AI Analytics & Insights (Phase 20)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/ai/analytics/briefing` | Synthesizes Weekly Academic Briefing with KPI health, highlights, and urgent actions. |
| `GET` | `/ai/analytics/risk-radar` | Multi-dimensional institutional risk radar (Attendance + CIE + Fees + Backlogs). |
| `GET` | `/ai/analytics/study-schedule`| Synthesizes AI revision timetable based on subject credits and upcoming exam dates. |
