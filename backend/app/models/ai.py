import enum
from datetime import datetime, timezone
# pyrefly: ignore [missing-import]
from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, Boolean, ForeignKey, Float
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import relationship
from app.core.database import Base


class SenderType(str, enum.Enum):
    USER = "user"
    AI_AGENT = "ai_agent"
    SYSTEM = "system"


class QueryIntent(str, enum.Enum):
    ACADEMIC = "academic"
    EXAMINATION = "examination"
    PLACEMENT = "placement"
    POLICY_RAG = "policy_rag"
    GENERAL = "general"
    PDF_DOCUMENT = "pdf_document"
    UNIVERSITY_KNOWLEDGE = "university_knowledge"
    PERSONAL_ERP = "personal_erp"
    MIXED = "mixed"
    UNSUPPORTED = "unsupported"


class DocumentProcessingStatus(str, enum.Enum):
    UPLOADING = "UPLOADING"
    PROCESSING = "PROCESSING"
    EXTRACTING = "EXTRACTING"
    CHUNKING = "CHUNKING"
    EMBEDDING = "EMBEDDING"
    READY = "READY"
    FAILED = "FAILED"


class DocumentCategory(str, enum.Enum):
    ACADEMIC = "Academic Regulations"
    EXAMINATION = "Examination Guidelines"
    STUDENT_HANDBOOK = "Student Handbook"
    SCHOLARSHIP = "Scholarship Guidelines"
    SYLLABUS = "Curriculum & Syllabus"
    FACULTY = "Faculty Document"
    GENERAL = "General Document"


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    doc_uuid = Column(String(64), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    stored_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size_bytes = Column(Integer, default=0, nullable=False)
    mime_type = Column(String(100), default="application/pdf", nullable=False)
    category = Column(Enum(DocumentCategory), default=DocumentCategory.GENERAL, nullable=False)
    
    total_pages = Column(Integer, default=0, nullable=False)
    pages_processed = Column(Integer, default=0, nullable=False)
    status = Column(Enum(DocumentProcessingStatus), default=DocumentProcessingStatus.UPLOADING, nullable=False)
    error_message = Column(Text, nullable=True)
    is_scanned = Column(Boolean, default=False, nullable=False)
    ocr_performed = Column(Boolean, default=False, nullable=False)
    ocr_confidence = Column(Float, default=1.0, nullable=False)
    
    summary = Column(Text, nullable=True)
    overview_json = Column(Text, nullable=True)  # Legacy overview summary
    analysis_json = Column(Text, nullable=True)  # Full comprehensive document intelligence JSON
    version = Column(String(32), default="1.0", nullable=False)
    academic_year = Column(String(32), default="2025-26", nullable=False)
    content_hash = Column(String(64), nullable=True, index=True)
    is_public = Column(Boolean, default=False, nullable=False)  # If true, university-wide verified public document
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")
    jobs = relationship("DocumentProcessingJob", back_populates="document", cascade="all, delete-orphan")


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False)
    chunk_uuid = Column(String(100), unique=True, index=True, nullable=False)
    page_number = Column(Integer, nullable=False, default=1)
    section_title = Column(String(255), nullable=False, default="General")
    text = Column(Text, nullable=False)
    word_count = Column(Integer, default=0, nullable=False)
    has_table = Column(Boolean, default=False, nullable=False)
    metadata_json = Column(Text, nullable=True)  # JSON metadata (tags, dates, rules found)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    document = relationship("Document", back_populates="chunks")


class DocumentProcessingJob(Base):
    __tablename__ = "document_processing_jobs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    job_uuid = Column(String(64), unique=True, index=True, nullable=False)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(Enum(DocumentProcessingStatus), default=DocumentProcessingStatus.UPLOADING, nullable=False)
    progress_percentage = Column(Integer, default=0, nullable=False)
    current_step = Column(String(100), default="Initializing upload", nullable=False)
    total_pages = Column(Integer, default=0, nullable=False)
    pages_completed = Column(Integer, default=0, nullable=False)
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime(timezone=True), nullable=True)

    document = relationship("Document", back_populates="jobs")


class DocumentComparison(Base):
    __tablename__ = "document_comparisons"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    comparison_uuid = Column(String(64), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    doc_a_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    doc_b_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    comparison_json = Column(Text, nullable=False)  # Complete structured comparison JSON
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    doc_a = relationship("Document", foreign_keys=[doc_a_id])
    doc_b = relationship("Document", foreign_keys=[doc_b_id])


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_uuid = Column(String(100), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    active_document_id = Column(Integer, ForeignKey("documents.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False, default="New Conversation")
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan", order_by="ChatMessage.created_at")
    active_document = relationship("Document", foreign_keys=[active_document_id])


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"), nullable=False, index=True)
    sender = Column(Enum(SenderType), default=SenderType.USER, nullable=False)
    agent_name = Column(String(100), nullable=True)  # e.g., "Document Intelligence Agent", "Academic Advisor"
    intent = Column(Enum(QueryIntent), default=QueryIntent.GENERAL, nullable=True)
    content = Column(Text, nullable=False)
    sources_json = Column(Text, nullable=True)  # JSON array of citations & document page excerpts
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="SET NULL"), nullable=True)
    page_references_json = Column(Text, nullable=True)  # List of referenced page numbers e.g. [1, 12, 14]
    feedback = Column(String(20), nullable=True)  # 'like', 'dislike', None
    language = Column(String(10), default="en", nullable=False)  # "en", "kn", "hi"
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    session = relationship("ChatSession", back_populates="messages")
    document = relationship("Document", foreign_keys=[document_id])


