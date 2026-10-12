import os
import uuid
import json
import shutil
from datetime import datetime, timezone
from typing import Any, List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status, BackgroundTasks
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User, UserRole
from app.models.ai import (
    ChatSession,
    ChatMessage,
    SenderType,
    QueryIntent,
    Document,
    DocumentChunk,
    DocumentProcessingJob,
    DocumentProcessingStatus,
    DocumentCategory,
    DocumentComparison,
)
from app.ai.rag.vector_store import VectorStore
from app.ai.rag.chunker import SemanticChunker
from app.ai.rag.pdf_processor import PDFProcessor
from app.ai.rag.document_comparator import DocumentComparator
from app.ai.rag.ingest import ingest_knowledge_base
from app.ai.intent_router import DeterministicIntentRouter
from app.ai.question_router import QuestionRouter
from app.ai.agents.academic_agent import AcademicAgent
from app.ai.agents.examination_agent import ExaminationAgent
from app.ai.agents.placement_agent import PlacementAgent
from app.ai.memory.conversation_memory import ConversationMemoryManager
from app.ai.personalization import PersonalizationEngine
from app.ai.multilingual.language_detector import LanguageDetector
from app.ai.multilingual.multilingual_engine import MultilingualEngine
from app.ai.analytics.proactive_insights import ProactiveAnalyticsEngine
from app.ai.analytics.predictive_engine import PredictiveAnalyticsEngine, PlacementAIEngine
from app.ai.safety import SafetyGuardrails
from app.schemas.ai import (
    RAGSearchResultItem,
    RAGSearchResponse,
    RAGIngestResponse,
    ChatSessionItem,
    ChatMessageItem,
    SendMessageRequest,
    SendMessageResponse,
    CreateSessionResponse,
    DocumentItem,
    DocumentStatusResponse,
    DocumentUploadResponse,
    DocumentDetailResponse,
    DocumentSummaryRequest,
    DocumentSummaryResponse,
    DocumentAnalysisSchema,
    DocumentPageItem,
    DocumentComparisonRequest,
    DocumentComparisonResponse,
    ComparisonTableItem,
    MessageFeedbackRequest,
    IntentClassifyRequest,
    IntentClassifyResponse,
    ExtractedEntitiesSchema,
    SecondaryIntentSchema,
    AcademicAdvisoryRequest,
    AcademicAdvisoryResponse,
    AttendanceSummarySchema,
    CIEMarksSummarySchema,
    CourseAttendanceAnalysisSchema,
    CourseCIEMarksAnalysisSchema,
    CourseExamEligibilitySchema,
    ExamEligibilitySummarySchema,
    ExamScheduleItemSchema,
    HallTicketStatusSchema,
    ExamAdvisoryRequest,
    ExamAdvisoryResponse,
    PlacementDriveEligibilitySchema,
    PlacementAdvisoryRequest,
    PlacementAdvisoryResponse,
    WeeklyBriefingResponse,
    RiskRadarResponse,
    SmartStudyScheduleResponse,
    UpcomingExamBriefingSchema,
    AtRiskCourseSchema,
    StudySessionItemSchema,
    AttendanceRiskPredictionItem,
    AcademicRiskPredictionItem,
    PersonalizedStudyRecommendationItem,
    CourseRecommendationItem,
    ComprehensiveRecommendationsResponse,
    ResumeAnalysisRequest,
    ResumeAnalysisResponse,
    MockInterviewStartRequest,
    MockInterviewStartResponse,
    MockInterviewEvaluateRequest,
    MockInterviewEvaluateResponse,
    MockInterviewFinishRequest,
    MockInterviewFinishResponse,
    PlacementReadinessFactor,
    PlacementReadinessResponse,
)

router = APIRouter(prefix="/ai", tags=["ChatGPT-Style University AI Assistant & Document Intelligence"])

# Global Vector Store instance
_vector_store = VectorStore()
_vector_store.load_index()

MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt", ".csv", ".xlsx"}
STORAGE_BASE_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "user_documents")
)


def get_vector_store() -> VectorStore:
    """Helper to ensure vector store is loaded."""
    if not _vector_store.chunks:
        _vector_store.load_index()
    return _vector_store


def _get_target_student(current_user: User, db: Session) -> User:
    """Helper to resolve student context."""
    if current_user.role == UserRole.STUDENT:
        return current_user
    demo_student = db.query(User).filter(User.role == UserRole.STUDENT).first()
    return demo_student or current_user


def _format_file_size(size_bytes: int) -> str:
    """Format bytes into readable string (KB / MB)."""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    else:
        return f"{size_bytes / (1024 * 1024):.1f} MB"


def _process_document_pipeline(document_id: int, db: Session, vs: VectorStore):
    """
    Synchronously or background-executes the complete document ingestion pipeline:
    Extract all pages -> Detect scanned/OCR -> Extract structure, tables, rules, dates ->
    Chunk with page metadata -> Generate embeddings -> Update VectorStore -> Generate Complete Document Intelligence.
    """
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        return

    job = db.query(DocumentProcessingJob).filter(
        DocumentProcessingJob.document_id == document_id
    ).order_by(DocumentProcessingJob.id.desc()).first()

    try:
        if job:
            job.status = DocumentProcessingStatus.EXTRACTING
            job.progress_percentage = 15
            job.current_step = "Reading document and extracting every page..."
            db.commit()

        # Read stored file bytes
        with open(doc.file_path, "rb") as f:
            file_bytes = f.read()

        # Step 1: Complete page-by-page extraction
        pages_data, doc_meta = PDFProcessor.parse_document(file_bytes, doc.original_filename)

        doc.total_pages = len(pages_data)
        doc.pages_processed = len(pages_data)
        doc.is_scanned = doc_meta.get("is_scanned", False)
        doc.ocr_performed = doc_meta.get("ocr_performed", False)
        doc.ocr_confidence = doc_meta.get("ocr_confidence", 1.0)
        doc.content_hash = doc_meta.get("content_hash")
        
        if not doc.title or doc.title == doc.original_filename:
            doc.title = doc_meta.get("title") or os.path.splitext(doc.original_filename)[0].replace("_", " ").title()

        if job:
            job.total_pages = len(pages_data)
            job.pages_completed = len(pages_data)
            job.status = DocumentProcessingStatus.PROCESSING
            job.progress_percentage = 35
            job.current_step = f"Extracting sections, tables, rules & dates from {len(pages_data)} pages..."
            db.commit()

        # Step 2: Intelligent semantic chunking
        chunker = SemanticChunker(chunk_size_words=130, overlap_words=25)
        chunks = chunker.chunk_pages(
            pages=pages_data,
            document_id=doc.id,
            document_title=doc.title,
            filename=doc.original_filename,
            user_id=doc.user_id,
            is_public=doc.is_public,
            category=doc.category.value if hasattr(doc.category, "value") else str(doc.category),
        )

        # Clear any existing chunks for this document
        db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).delete()

        # Persist chunks to SQL DB
        for c in chunks:
            chunk_row = DocumentChunk(
                document_id=doc.id,
                chunk_index=int(c["chunk_id"].split("_")[-1]) if "_" in c["chunk_id"] else 1,
                chunk_uuid=c["chunk_uuid"],
                page_number=c["page_number"],
                section_title=c["section_title"],
                text=c["text"],
                word_count=c["word_count"],
                has_table=c["has_table"],
                metadata_json=json.dumps({"citation": c["citation"], "category": c["category"]}),
            )
            db.add(chunk_row)

        if job:
            job.status = DocumentProcessingStatus.EMBEDDING
            job.progress_percentage = 65
            job.current_step = f"Building AI knowledge & vector index for {len(chunks)} chunks..."
            db.commit()

        # Step 3: Embed & Store in VectorStore
        vs.add_chunks(chunks)
        vs.save_index()

        if job:
            job.status = DocumentProcessingStatus.PROCESSING
            job.progress_percentage = 85
            job.current_step = "Synthesizing full document intelligence, rules & summary..."
            db.commit()

        # Step 4: Generate complete Document Intelligence & Analysis
        category_str = doc.category.value if hasattr(doc.category, "value") else str(doc.category)
        intel = PDFProcessor.generate_complete_document_intelligence(pages_data, doc.original_filename, {
            "title": doc.title,
            "category": category_str,
        })
        overview = PDFProcessor.generate_document_overview(pages_data, doc.original_filename, {
            "title": doc.title,
            "category": category_str,
        })

        doc.summary = intel.get("summary_markdown", "")
        doc.analysis_json = json.dumps(intel)
        doc.overview_json = json.dumps(overview)
        doc.academic_year = intel.get("academic_year", "2025–26")
        doc.status = DocumentProcessingStatus.READY

        if job:
            job.status = DocumentProcessingStatus.READY
            job.progress_percentage = 100
            job.current_step = "Document ready ✓"
            job.completed_at = datetime.now(timezone.utc)

        db.commit()

    except Exception as e:
        doc.status = DocumentProcessingStatus.FAILED
        doc.error_message = str(e)
        if job:
            job.status = DocumentProcessingStatus.FAILED
            job.error_message = str(e)
            job.completed_at = datetime.now(timezone.utc)
        db.commit()


# =====================================================================
# Document Management & Ingestion Endpoints
# =====================================================================

@router.post("/documents/upload", response_model=DocumentUploadResponse)
def upload_document(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    category: Optional[str] = Form("General Document"),
    version: Optional[str] = Form("1.0"),
    is_public: Optional[bool] = Form(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Upload an academic PDF or document with integrity check, store securely,
    and process all pages through complete document intelligence pipeline.
    """
    filename = file.filename or "uploaded_document.pdf"
    ext = os.path.splitext(filename)[1].lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed extensions: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    try:
        content = file.file.read()
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Failed to read file: {str(e)}")

    if len(content) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")

    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB.",
        )

    doc_category = DocumentCategory.GENERAL
    for cat in DocumentCategory:
        if cat.value.lower() == (category or "").lower():
            doc_category = cat
            break

    user_storage_dir = os.path.join(STORAGE_BASE_DIR, str(current_user.id))
    os.makedirs(user_storage_dir, exist_ok=True)

    doc_uuid = f"doc_{uuid.uuid4().hex[:12]}"
    stored_filename = f"{doc_uuid}_{filename}"
    file_path = os.path.join(user_storage_dir, stored_filename)

    with open(file_path, "wb") as f:
        f.write(content)

    doc_title = title.strip() if title and title.strip() else os.path.splitext(filename)[0].replace("_", " ").title()
    doc_ver = version.strip() if version and version.strip() else ("2025" if "2025" in filename else "1.0")

    # Create Document record
    new_doc = Document(
        doc_uuid=doc_uuid,
        user_id=current_user.id,
        title=doc_title,
        original_filename=filename,
        stored_filename=stored_filename,
        file_path=file_path,
        file_size_bytes=len(content),
        mime_type=file.content_type or "application/pdf",
        category=doc_category,
        version=doc_ver,
        status=DocumentProcessingStatus.PROCESSING,
        is_public=bool(is_public and current_user.role == UserRole.ADMIN),
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    # Create Processing Job
    job = DocumentProcessingJob(
        job_uuid=f"job_{uuid.uuid4().hex[:12]}",
        document_id=new_doc.id,
        status=DocumentProcessingStatus.PROCESSING,
        progress_percentage=10,
        current_step="Validating file and initializing analysis pipeline...",
        started_at=datetime.now(timezone.utc),
    )
    db.add(job)
    db.commit()

    # Execute full extraction & vector indexing
    vs = get_vector_store()
    _process_document_pipeline(new_doc.id, db, vs)

    db.refresh(new_doc)

    overview_data = None
    if new_doc.overview_json:
        try:
            overview_data = json.loads(new_doc.overview_json)
        except Exception:
            overview_data = None

    analysis_data = None
    if new_doc.analysis_json:
        try:
            analysis_data = json.loads(new_doc.analysis_json)
        except Exception:
            analysis_data = None

    return DocumentUploadResponse(
        success=new_doc.status == DocumentProcessingStatus.READY,
        doc_id=new_doc.id,
        doc_uuid=new_doc.doc_uuid,
        title=new_doc.title,
        total_pages=new_doc.total_pages,
        status=new_doc.status.value,
        message=f"Document '{new_doc.title}' ({new_doc.total_pages} pages) analyzed and indexed successfully!",
        overview=overview_data,
        analysis=analysis_data,
    )


@router.get("/documents", response_model=List[DocumentItem])
def list_user_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Retrieve all uploaded documents belonging to the authenticated user plus public university documents.
    """
    docs = db.query(Document).filter(
        (Document.user_id == current_user.id) | (Document.is_public == True)
    ).order_by(Document.updated_at.desc()).all()

    result = []
    for d in docs:
        result.append(
            DocumentItem(
                id=d.id,
                doc_uuid=d.doc_uuid,
                title=d.title,
                original_filename=d.original_filename,
                file_size_formatted=_format_file_size(d.file_size_bytes),
                mime_type=d.mime_type,
                category=d.category.value if hasattr(d.category, "value") else str(d.category),
                total_pages=d.total_pages,
                pages_processed=d.pages_processed,
                status=d.status.value if hasattr(d.status, "value") else str(d.status),
                error_message=d.error_message,
                is_scanned=d.is_scanned,
                ocr_performed=d.ocr_performed,
                ocr_confidence=d.ocr_confidence,
                version=d.version or "1.0",
                academic_year=d.academic_year or "2025-26",
                is_public=d.is_public,
                created_at=d.created_at.strftime("%B %d, %Y") if d.created_at else "Today",
                updated_at=d.updated_at.strftime("%B %d, %Y %I:%M %p") if d.updated_at else "Now",
            )
        )
    return result


@router.get("/documents/{doc_id}", response_model=DocumentDetailResponse)
def get_document_details(
    doc_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Retrieve detailed metadata, section outlines, and structured document intelligence.
    """
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    if doc.user_id != current_user.id and not doc.is_public and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this document.")

    overview_data = None
    if doc.overview_json:
        try:
            overview_data = json.loads(doc.overview_json)
        except Exception:
            overview_data = None

    analysis_data = None
    if doc.analysis_json:
        try:
            analysis_data = json.loads(doc.analysis_json)
        except Exception:
            analysis_data = None

    return DocumentDetailResponse(
        id=doc.id,
        doc_uuid=doc.doc_uuid,
        title=doc.title,
        original_filename=doc.original_filename,
        file_size_formatted=_format_file_size(doc.file_size_bytes),
        category=doc.category.value if hasattr(doc.category, "value") else str(doc.category),
        total_pages=doc.total_pages,
        pages_processed=doc.pages_processed,
        status=doc.status.value if hasattr(doc.status, "value") else str(doc.status),
        is_scanned=doc.is_scanned,
        ocr_performed=doc.ocr_performed,
        ocr_confidence=doc.ocr_confidence,
        version=doc.version or "1.0",
        academic_year=doc.academic_year or "2025-26",
        summary=doc.summary,
        overview=overview_data,
        analysis=analysis_data,
        created_at=doc.created_at.strftime("%B %d, %Y") if doc.created_at else "Today",
    )


@router.get("/documents/{doc_id}/analysis", response_model=DocumentAnalysisSchema)
def get_document_analysis(
    doc_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Retrieve full structured Document Intelligence (Executive Summary, Structure, Rules, Dates, Requirements, Definitions, Changes).
    """
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    if doc.analysis_json:
        try:
            data = json.loads(doc.analysis_json)
            return DocumentAnalysisSchema(**data)
        except Exception as e:
            pass

    # Generate on the fly if not cached
    chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).all()
    pages = [{"text": c.text, "page_number": c.page_number, "headings": [c.section_title]} for c in chunks]
    intel = PDFProcessor.generate_complete_document_intelligence(pages, doc.original_filename, {
        "title": doc.title,
        "category": doc.category.value if hasattr(doc.category, "value") else str(doc.category),
    })
    doc.analysis_json = json.dumps(intel)
    db.commit()
    return DocumentAnalysisSchema(**intel)


@router.get("/documents/{doc_id}/pages", response_model=List[DocumentPageItem])
def get_document_pages(
    doc_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Retrieve page-by-page text content and extracted tables for deep inspection.
    """
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).order_by(DocumentChunk.page_number.asc()).all()

    # Group by page number
    page_dict: Dict[int, Dict[str, Any]] = {}
    for c in chunks:
        p = c.page_number
        if p not in page_dict:
            page_dict[p] = {
                "page_number": p,
                "text_parts": [],
                "headings": set(),
                "has_tables": c.has_table,
                "tables": [],
            }
        page_dict[p]["text_parts"].append(c.text)
        if c.section_title and c.section_title != "General":
            page_dict[p]["headings"].add(c.section_title)

    result = []
    for p_num in sorted(page_dict.keys()):
        p_info = page_dict[p_num]
        full_p_text = "\n\n".join(p_info["text_parts"])
        result.append(
            DocumentPageItem(
                page_number=p_num,
                text=full_p_text,
                word_count=len(full_p_text.split()),
                headings=list(p_info["headings"]),
                has_tables=p_info["has_tables"],
                tables=[],
            )
        )
    return result


@router.post("/documents/compare", response_model=DocumentComparisonResponse)
def compare_two_documents(
    payload: DocumentComparisonRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Deep document-level comparison between Document A (Baseline/Old) and Document B (Revised/New).
    Compares sections, rules, dates, requirements, additions, and deletions with dual-page references.
    """
    doc_a = db.query(Document).filter(Document.id == payload.doc_a_id).first()
    doc_b = db.query(Document).filter(Document.id == payload.doc_b_id).first()

    if not doc_a or not doc_b:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="One or both documents to compare were not found.")

    analysis_a = json.loads(doc_a.analysis_json) if doc_a.analysis_json else {}
    analysis_b = json.loads(doc_b.analysis_json) if doc_b.analysis_json else {}

    comp_result = DocumentComparator.compare_documents(
        doc_a_data={
            "id": doc_a.id,
            "title": doc_a.title,
            "version": doc_a.version or "2024",
            "analysis": analysis_a,
            "content_hash": doc_a.content_hash,
        },
        doc_b_data={
            "id": doc_b.id,
            "title": doc_b.title,
            "version": doc_b.version or "2025",
            "analysis": analysis_b,
            "content_hash": doc_b.content_hash,
        },
    )

    # Persist comparison record
    cmp_record = DocumentComparison(
        comparison_uuid=comp_result["comparison_uuid"],
        user_id=current_user.id,
        doc_a_id=doc_a.id,
        doc_b_id=doc_b.id,
        comparison_json=json.dumps(comp_result),
        created_at=datetime.now(timezone.utc),
    )
    db.add(cmp_record)
    db.commit()

    return DocumentComparisonResponse(**comp_result)


@router.delete("/documents/{doc_id}", response_model=dict)
def delete_document(
    doc_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Permanently delete a document, its database chunks, vector index embeddings, and stored physical file.
    """
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    if doc.user_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized to delete this document.")

    # 1. Remove from Vector Store
    vs = get_vector_store()
    vs.remove_document_chunks(doc.id)

    # 2. Remove physical file
    if os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception:
            pass

    # 3. Clean up active document references in chat sessions
    db.query(ChatSession).filter(ChatSession.active_document_id == doc.id).update(
        {"active_document_id": None}
    )

    # 4. Delete document record (cascade deletes chunks and jobs)
    db.delete(doc)
    db.commit()

    return {
        "success": True,
        "message": f"Document '{doc.title}' and all vector index records removed successfully.",
    }


@router.get("/documents/{doc_id}/status", response_model=DocumentStatusResponse)
def get_document_processing_status(
    doc_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Retrieve real-time processing status and progress percentage for a document.
    """
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    job = db.query(DocumentProcessingJob).filter(
        DocumentProcessingJob.document_id == doc_id
    ).order_by(DocumentProcessingJob.id.desc()).first()

    progress = 100 if doc.status == DocumentProcessingStatus.READY else 0
    step = "Ready ✓" if doc.status == DocumentProcessingStatus.READY else "Processing..."

    if job:
        progress = job.progress_percentage
        step = job.current_step

    return DocumentStatusResponse(
        doc_id=doc.id,
        doc_uuid=doc.doc_uuid,
        status=doc.status.value if hasattr(doc.status, "value") else str(doc.status),
        progress_percentage=progress,
        current_step=step,
        total_pages=doc.total_pages,
        pages_completed=doc.pages_processed,
        error_message=doc.error_message,
    )


@router.post("/documents/{doc_id}/reprocess", response_model=DocumentUploadResponse)
def reprocess_document(
    doc_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Re-extract all pages, re-chunk, re-embed, and rebuild overview for an existing document.
    """
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    if doc.user_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized.")

    vs = get_vector_store()
    _process_document_pipeline(doc.id, db, vs)
    db.refresh(doc)

    overview_data = None
    if doc.overview_json:
        try:
            overview_data = json.loads(doc.overview_json)
        except Exception:
            overview_data = None

    return DocumentUploadResponse(
        success=doc.status == DocumentProcessingStatus.READY,
        doc_id=doc.id,
        doc_uuid=doc.doc_uuid,
        title=doc.title,
        total_pages=doc.total_pages,
        status=doc.status.value,
        message=f"Document '{doc.title}' re-indexed successfully!",
        overview=overview_data,
    )


@router.post("/documents/{doc_id}/summary", response_model=DocumentSummaryResponse)
def get_document_summary(
    doc_id: int,
    payload: DocumentSummaryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Generate tailored summaries or study tools for an uploaded document.
    Modes: quick, detailed, sections, rules, dates, study_notes.
    """
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    overview = {}
    if doc.overview_json:
        try:
            overview = json.loads(doc.overview_json)
        except Exception:
            overview = {}

    summary_md = doc.summary or "Summary not yet available."
    questions = []
    mcqs = []

    if payload.summary_mode == "quick":
        key_pts = overview.get("key_points", [])
        pts_text = "\n".join([f"- {p}" for p in key_pts[:4]])
        summary_md = f"### ⚡ Quick Summary: {doc.title}\n\n**Total Pages:** {doc.total_pages}\n\n{pts_text}"

    elif payload.summary_mode == "rules":
        rules = overview.get("rules", [])
        rules_text = "\n".join([f"- {r}" for r in rules]) if rules else "No specific rules extracted."
        summary_md = f"### ⚖️ Rules & Regulations Extracted: {doc.title}\n\n{rules_text}"

    elif payload.summary_mode == "dates":
        dates = overview.get("dates", [])
        dates_text = "\n".join([f"- {d}" for d in dates]) if dates else "No specific dates found in document."
        summary_md = f"### 🗓️ Important Dates & Deadlines: {doc.title}\n\n{dates_text}"

    elif payload.summary_mode == "study_notes":
        chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).all()
        pages = [{"text": c.text, "page_number": c.page_number} for c in chunks]
        study = PDFProcessor.generate_study_notes(pages, doc.title)
        summary_md = study["notes_markdown"]
        questions = study["questions"]
        mcqs = study["mcqs"]

    return DocumentSummaryResponse(
        doc_id=doc.id,
        doc_title=doc.title,
        summary_mode=payload.summary_mode,
        summary_markdown=summary_md,
        questions=questions,
        mcqs=mcqs,
    )


@router.get("/documents/{doc_id}/sources", response_model=List[RAGSearchResultItem])
def get_document_sources(
    doc_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Retrieve indexed chunk excerpts and page references for an uploaded document.
    """
    chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == doc_id).all()
    doc = db.query(Document).filter(Document.id == doc_id).first()
    doc_title = doc.title if doc else "Document"
    doc_name = doc.original_filename if doc else "document.pdf"

    return [
        RAGSearchResultItem(
            chunk_id=c.chunk_uuid,
            document_title=doc_title,
            filename=doc_name,
            section_title=c.section_title,
            text=c.text,
            similarity_score=1.0,
            citation=f"{doc_title} (Page {c.page_number})",
            page_number=c.page_number,
            has_table=c.has_table,
        )
        for c in chunks
    ]


@router.post("/messages/{msg_id}/feedback", response_model=dict)
def submit_message_feedback(
    msg_id: int,
    payload: MessageFeedbackRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Record thumbs up / thumbs down feedback on an AI response message.
    """
    msg = db.query(ChatMessage).filter(ChatMessage.id == msg_id).first()
    if not msg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found.")

    msg.feedback = payload.feedback.lower()
    db.commit()
    return {"success": True, "message": "Feedback recorded."}


# =====================================================================
# Chat Sessions & Multi-Source Conversational Agent
# =====================================================================

@router.get("/sessions", response_model=List[ChatSessionItem])
def get_chat_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Retrieve all conversation sessions for the authenticated user.
    """
    sessions = db.query(ChatSession).filter(
        ChatSession.user_id == current_user.id,
        ChatSession.is_active == True,
    ).order_by(ChatSession.updated_at.desc()).all()

    result = []
    for s in sessions:
        msg_count = len(s.messages) if s.messages else 0
        doc_title = s.active_document.title if s.active_document else None
        result.append(
            ChatSessionItem(
                session_uuid=s.session_uuid,
                title=s.title,
                active_document_id=s.active_document_id,
                active_document_title=doc_title,
                created_at=s.created_at.strftime("%B %d, %Y") if s.created_at else "Today",
                updated_at=s.updated_at.strftime("%I:%M %p") if s.updated_at else "Now",
                message_count=msg_count,
            )
        )
    return result


@router.post("/sessions", response_model=CreateSessionResponse)
def create_chat_session(
    title: Optional[str] = Query(None, description="Optional custom session title"),
    active_document_id: Optional[int] = Query(None, description="Optional active document ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Create a new conversation session for the authenticated user with optional active document.
    """
    s_uuid = f"sess_{uuid.uuid4().hex[:12]}"
    session_title = title or "New Conversation"
    new_session = ChatSession(
        session_uuid=s_uuid,
        user_id=current_user.id,
        active_document_id=active_document_id,
        title=session_title,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    return CreateSessionResponse(
        session_uuid=new_session.session_uuid,
        title=new_session.title,
        active_document_id=new_session.active_document_id,
        created_at=new_session.created_at.strftime("%B %d, %Y %I:%M %p"),
    )


@router.delete("/sessions/{session_uuid}", response_model=dict)
def delete_chat_session(
    session_uuid: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Delete a conversation session and all its messages.
    """
    session = db.query(ChatSession).filter(
        ChatSession.session_uuid == session_uuid,
        ChatSession.user_id == current_user.id,
    ).first()

    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

    db.delete(session)
    db.commit()
    return {"success": True, "message": "Session deleted."}


@router.get("/sessions/{session_uuid}/messages", response_model=List[ChatMessageItem])
def get_session_messages(
    session_uuid: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Retrieve message history for a specific conversation session.
    """
    session = db.query(ChatSession).filter(
        ChatSession.session_uuid == session_uuid,
        ChatSession.user_id == current_user.id,
    ).first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found.",
        )

    messages = db.query(ChatMessage).filter(
        ChatMessage.session_id == session.id
    ).order_by(ChatMessage.created_at.asc()).all()

    result = []
    for m in messages:
        sources = None
        if m.sources_json:
            try:
                sources_data = json.loads(m.sources_json)
                sources = [RAGSearchResultItem(**s) for s in sources_data]
            except Exception:
                sources = None

        page_refs = None
        if m.page_references_json:
            try:
                page_refs = json.loads(m.page_references_json)
            except Exception:
                page_refs = None

        result.append(
            ChatMessageItem(
                id=m.id,
                sender=m.sender.value if hasattr(m.sender, "value") else str(m.sender),
                agent_name=m.agent_name,
                intent=m.intent.value if m.intent and hasattr(m.intent, "value") else str(m.intent or "general"),
                content=m.content,
                sources=sources,
                document_id=m.document_id,
                page_references=page_refs,
                feedback=m.feedback,
                language=m.language,
                created_at=m.created_at.strftime("%I:%M %p") if m.created_at else "Just now",
            )
        )
    return result


@router.post("/chat", response_model=SendMessageResponse)
def send_chat_message(
    payload: SendMessageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Process multi-source conversational queries with:
    - Role-aware authenticated ERP database querying (Faculty, Student, Admin)
    - Active Document RAG retrieval & page-level citations
    - University Knowledge Base search
    - Mixed query synthesis
    - Conversational multi-turn memory
    - Trilingual localization (Kannada/Hindi/English)
    """
    vs = get_vector_store()

    # 0. Safety Guardrails & Input Sanitization
    is_safe, safety_reason = SafetyGuardrails.check_prompt_safety(payload.message)
    if not is_safe:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=safety_reason or "Prompt flagged by AI safety filter.",
        )

    sanitized_message = SafetyGuardrails.sanitize_user_input(payload.message)

    # 1. Trilingual Language Detection
    detected_lang, _ = LanguageDetector.detect_language(sanitized_message)
    target_language = payload.language or detected_lang or "en"

    # 2. Find or create persistent session
    session = None
    if payload.session_uuid:
        session = db.query(ChatSession).filter(
            ChatSession.session_uuid == payload.session_uuid,
            ChatSession.user_id == current_user.id,
        ).first()

    # Resolve active document
    active_doc_id = payload.active_document_id
    if session and session.active_document_id and not active_doc_id:
        active_doc_id = session.active_document_id

    active_doc = None
    if active_doc_id:
        active_doc = db.query(Document).filter(Document.id == active_doc_id).first()

    if not session:
        title_summary = (sanitized_message[:35] + "...") if len(sanitized_message) > 35 else sanitized_message
        session = ChatSession(
            session_uuid=f"sess_{uuid.uuid4().hex[:12]}",
            user_id=current_user.id,
            active_document_id=active_doc.id if active_doc else None,
            title=title_summary.strip() or "University Advisory Session",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(session)
        db.commit()
        db.refresh(session)
    elif active_doc and session.active_document_id != active_doc.id:
        session.active_document_id = active_doc.id
        db.commit()

    # 3. Conversational Memory & Multi-turn Reference Resolution
    turns = ConversationMemoryManager.get_sliding_window(session.id, db, window_size=8)
    resolved_ctx = ConversationMemoryManager.extract_context_from_turns(turns)
    enriched_query = ConversationMemoryManager.enrich_query_with_context(sanitized_message, resolved_ctx)

    # 4. Save user message
    user_msg = ChatMessage(
        session_id=session.id,
        sender=SenderType.USER,
        content=sanitized_message,
        document_id=active_doc.id if active_doc else None,
        language=target_language,
        created_at=datetime.now(timezone.utc),
    )
    db.add(user_msg)
    db.commit()
    db.refresh(user_msg)

    # 5. Fetch all user documents
    all_user_docs = db.query(Document).filter(
        (Document.user_id == current_user.id) | (Document.is_public == True)
    ).all()

    # 6. Execute Question Router with multi-source priority and role context
    route_result = QuestionRouter.process_query(
        query=enriched_query,
        user=current_user,
        db=db,
        vector_store=vs,
        active_document=active_doc,
        all_user_documents=all_user_docs,
        conversation_history=turns,
    )

    ai_content = route_result["answer"]
    rag_citations = route_result["citations"]
    page_references = route_result["page_references"]
    route_name = route_result["route"]

    # 7. Localize AI response to requested language (Kannada/Hindi) if needed
    if target_language in ["kn", "hi"]:
        ai_content = MultilingualEngine.translate_to_target(ai_content, target_language)

    # Determine agent name and intent based on payload and routing
    agent_name = "University AI Advisor" if current_user.role != UserRole.FACULTY else "Faculty Academic Assistant"
    intent_enum = QueryIntent.GENERAL

    if payload.agent_type == "academic":
        agent_name = "Academic Advisor"
        intent_enum = QueryIntent.PERSONAL_ERP
    elif payload.agent_type == "exam":
        agent_name = "Examination Officer"
        intent_enum = QueryIntent.UNIVERSITY_KNOWLEDGE
    elif payload.agent_type == "placement":
        agent_name = "Placement Coordinator"
        intent_enum = QueryIntent.UNIVERSITY_KNOWLEDGE
    elif route_name == "PDF_DOCUMENT":
        agent_name = "Document Intelligence Agent"
        intent_enum = QueryIntent.PDF_DOCUMENT
    elif route_name == "PERSONAL_ERP":
        lower_q = sanitized_message.lower()
        if any(w in lower_q for w in ["exam", "hall ticket", "admit card", "seat", "schedule"]):
            agent_name = "Examination Officer"
        elif any(w in lower_q for w in ["placement", "company", "ctc"]):
            agent_name = "Placement Coordinator"
        else:
            agent_name = "Academic Advisor"
        intent_enum = QueryIntent.PERSONAL_ERP
    elif route_name == "UNIVERSITY_KNOWLEDGE":
        lower_q = sanitized_message.lower()
        if any(w in lower_q for w in ["placement", "company", "ctc", "lpa", "super dream", "offer"]):
            agent_name = "Placement Coordinator"
        elif any(w in lower_q for w in ["exam", "hall ticket", "schedule", "timetable", "see"]):
            agent_name = "Examination Officer"
        else:
            agent_name = "University Regulations Officer"
        intent_enum = QueryIntent.UNIVERSITY_KNOWLEDGE
    else:
        lower_q = sanitized_message.lower()
        if any(w in lower_q for w in ["exam", "hall ticket", "schedule"]):
            agent_name = "Examination Officer"
        elif any(w in lower_q for w in ["placement", "super dream"]):
            agent_name = "Placement Coordinator"

    # 8. Save AI response message
    ai_msg = ChatMessage(
        session_id=session.id,
        sender=SenderType.AI_AGENT,
        agent_name=agent_name,
        intent=intent_enum,
        content=ai_content,
        sources_json=json.dumps(rag_citations) if rag_citations else None,
        document_id=active_doc.id if active_doc else None,
        page_references_json=json.dumps(page_references) if page_references else None,
        language=target_language,
        created_at=datetime.now(timezone.utc),
    )
    db.add(ai_msg)
    session.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(ai_msg)

    # 9. Format response
    sources_items = [RAGSearchResultItem(**s) for s in rag_citations] if rag_citations else None

    return SendMessageResponse(
        session_uuid=session.session_uuid,
        user_message=ChatMessageItem(
            id=user_msg.id,
            sender="user",
            content=user_msg.content,
            created_at=user_msg.created_at.strftime("%I:%M %p"),
        ),
        ai_message=ChatMessageItem(
            id=ai_msg.id,
            sender=ai_msg.sender.value,
            agent_name=ai_msg.agent_name,
            intent=route_name,
            content=ai_msg.content,
            sources=sources_items,
            document_id=ai_msg.document_id,
            page_references=page_references,
            feedback=None,
            language=target_language,
            created_at=ai_msg.created_at.strftime("%I:%M %p"),
        ),
        active_document_id=active_doc.id if active_doc else None,
        active_document_title=active_doc.title if active_doc else None,
        detected_language=detected_lang,
        intent=route_name,
        confidence=route_result.get("confidence", 0.95),
    )



# =====================================================================
# Dedicated Domain Agents, Intent Classifier, and Analytics
# =====================================================================

@router.post("/intent/classify", response_model=IntentClassifyResponse)
def classify_user_intent(
    payload: IntentClassifyRequest,
    current_user: User = Depends(get_current_user),
) -> Any:
    """Classify natural language user queries deterministically and extract domain entities."""
    res = DeterministicIntentRouter.classify(payload.query)

    secondary_items = [
        SecondaryIntentSchema(
            intent=s["intent"],
            score=s["score"],
            agent=s["agent"],
        )
        for s in res.secondary_intents
    ]

    entities_schema = ExtractedEntitiesSchema(
        course_codes=res.extracted_entities.course_codes,
        companies=res.extracted_entities.companies,
        percentages=res.extracted_entities.percentages,
        semesters=res.extracted_entities.semesters,
        cgpa=res.extracted_entities.cgpa,
        dates=res.extracted_entities.dates,
    )

    return IntentClassifyResponse(
        query=res.query,
        primary_intent=res.primary_intent,
        confidence=res.confidence,
        secondary_intents=secondary_items,
        is_compound_query=res.is_compound_query,
        recommended_agent=res.recommended_agent,
        extracted_entities=entities_schema,
    )


@router.post("/agents/academic", response_model=AcademicAdvisoryResponse)
def run_academic_agent(
    payload: AcademicAdvisoryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """Run dedicated Academic Agent for attendance analysis, recovery simulations, and CIE breakdown."""
    student = _get_target_student(current_user, db)
    vs = get_vector_store()

    report = AcademicAgent.generate_advisory_report(
        user_id=student.id,
        db=db,
        query=payload.query,
        vector_store=vs,
    )

    att_courses = [CourseAttendanceAnalysisSchema(**c) for c in report["attendance_analysis"]["courses"]]
    att_summary = AttendanceSummarySchema(
        average_attendance=report["attendance_analysis"]["average_attendance"],
        total_courses=report["attendance_analysis"]["total_courses"],
        shortage_courses_count=report["attendance_analysis"]["shortage_courses_count"],
        condonation_eligible_count=report["attendance_analysis"]["condonation_eligible_count"],
        critical_shortage_count=report["attendance_analysis"]["critical_shortage_count"],
        is_overall_eligible_for_exams=report["attendance_analysis"]["is_overall_eligible_for_exams"],
        courses=att_courses,
    )

    cie_courses = [CourseCIEMarksAnalysisSchema(**m) for m in report["cie_marks_analysis"]["courses"]]
    cie_summary = CIEMarksSummarySchema(
        average_cie_marks=report["cie_marks_analysis"]["average_cie_marks"],
        total_evaluated_courses=report["cie_marks_analysis"]["total_evaluated_courses"],
        cie_cleared_count=report["cie_marks_analysis"]["cie_cleared_count"],
        cie_failed_count=report["cie_marks_analysis"]["cie_failed_count"],
        courses=cie_courses,
    )

    focused_c = CourseAttendanceAnalysisSchema(**report["focused_course"]) if report["focused_course"] else None
    citations = [RAGSearchResultItem(**c) for c in report["citations"]]

    return AcademicAdvisoryResponse(
        student_id=report["student_id"],
        student_name=report["student_name"],
        usn=report["usn"],
        department=report["department"],
        semester=report["semester"],
        cgpa=report["cgpa"],
        attendance_analysis=att_summary,
        cie_marks_analysis=cie_summary,
        focused_course=focused_c,
        advisory_markdown=report["advisory_markdown"],
        citations=citations,
    )


@router.post("/agents/examination", response_model=ExamAdvisoryResponse)
def run_examination_agent(
    payload: ExamAdvisoryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """Run dedicated Examination Agent for timetable retrieval and hall ticket status."""
    student = _get_target_student(current_user, db)
    vs = get_vector_store()

    report = ExaminationAgent.generate_advisory_report(
        user_id=student.id,
        db=db,
        query=payload.query,
        vector_store=vs,
    )

    elig_courses = [CourseExamEligibilitySchema(**c) for c in report["eligibility_summary"]["courses"]]
    elig_summary = ExamEligibilitySummarySchema(
        overall_status=report["eligibility_summary"]["overall_status"],
        is_overall_eligible=report["eligibility_summary"]["is_overall_eligible"],
        fee_balance_due=report["eligibility_summary"]["fee_balance_due"],
        fee_clearance_passed=report["eligibility_summary"]["fee_clearance_passed"],
        total_courses=report["eligibility_summary"]["total_courses"],
        eligible_courses_count=report["eligibility_summary"]["eligible_courses_count"],
        condonation_pending_count=report["eligibility_summary"]["condonation_pending_count"],
        ineligible_courses_count=report["eligibility_summary"]["ineligible_courses_count"],
        courses=elig_courses,
    )

    schedules = [ExamScheduleItemSchema(**s) for s in report["exam_schedules"]]
    hall_ticket = HallTicketStatusSchema(**report["hall_ticket"])
    citations = [RAGSearchResultItem(**c) for c in report["citations"]]

    return ExamAdvisoryResponse(
        student_id=report["student_id"],
        student_name=report["student_name"],
        usn=report["usn"],
        department=report["department"],
        semester=report["semester"],
        eligibility_summary=elig_summary,
        exam_schedules=schedules,
        hall_ticket=hall_ticket,
        advisory_markdown=report["advisory_markdown"],
        citations=citations,
    )


@router.post("/agents/placement", response_model=PlacementAdvisoryResponse)
def run_placement_agent(
    payload: PlacementAdvisoryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """Run dedicated Placement Agent for corporate drive eligibility matching."""
    student = _get_target_student(current_user, db)
    vs = get_vector_store()

    report = PlacementAgent.generate_advisory_report(
        user_id=student.id,
        db=db,
        query=payload.query,
        vector_store=vs,
    )

    drives = [PlacementDriveEligibilitySchema(**d) for d in report["drives"]]
    focused_d = PlacementDriveEligibilitySchema(**report["focused_drive"]) if report["focused_drive"] else None
    citations = [RAGSearchResultItem(**c) for c in report["citations"]]

    return PlacementAdvisoryResponse(
        student_id=report["student_id"],
        student_name=report["student_name"],
        usn=report["usn"],
        department=report["department"],
        semester=report["semester"],
        cgpa=report["cgpa"],
        placement_status=report["placement_status"],
        existing_offer_ctc=report["existing_offer_ctc"],
        total_active_drives=report["total_active_drives"],
        eligible_drives_count=report["eligible_drives_count"],
        super_dream_eligible_count=report["super_dream_eligible_count"],
        dream_eligible_count=report["dream_eligible_count"],
        core_eligible_count=report["core_eligible_count"],
        student_skills=report["student_skills"],
        focused_drive=focused_d,
        drives=drives,
        advisory_markdown=report["advisory_markdown"],
        citations=citations,
    )


@router.get("/rag/search", response_model=RAGSearchResponse)
def search_knowledge_base(
    query: str = Query(..., description="Natural language search query regarding institutional policies"),
    top_k: int = Query(3, ge=1, le=10, description="Maximum number of relevant chunks to retrieve"),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Perform semantic vector similarity search over university knowledge base chunks."""
    vs = get_vector_store()
    results = vs.search(query=query, top_k=top_k)

    items = [
        RAGSearchResultItem(
            chunk_id=r["chunk_id"],
            document_title=r["document_title"],
            filename=r["filename"],
            section_title=r["section_title"],
            text=r["text"],
            similarity_score=r["similarity_score"],
            citation=r["citation"],
            page_number=r.get("page_number", 1),
            has_table=r.get("has_table", False),
        )
        for r in results
    ]

    return RAGSearchResponse(
        query=query,
        results_count=len(items),
        results=items,
    )


@router.post("/rag/ingest", response_model=RAGIngestResponse)
def trigger_rag_ingestion(
    current_user: User = Depends(get_current_user),
) -> Any:
    """Re-ingest all university markdown policies and refresh vector store in memory and on disk."""
    stats = ingest_knowledge_base()
    _vector_store.load_index()

    return RAGIngestResponse(
        success=True,
        total_documents=stats["total_documents"],
        total_chunks=stats["total_chunks"],
        message=f"RAG Knowledge Base re-ingested successfully: {stats['total_chunks']} chunks from {stats['total_documents']} documents.",
    )


@router.get("/analytics/briefing", response_model=WeeklyBriefingResponse)
def get_weekly_academic_briefing(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """Generate proactive weekly academic briefing and priority action items."""
    student = _get_target_student(current_user, db)
    briefing = ProactiveAnalyticsEngine.generate_weekly_briefing(user_id=student.id, db=db)
    exam_items = [UpcomingExamBriefingSchema(**e) for e in briefing["upcoming_exams"]]

    return WeeklyBriefingResponse(
        student_id=briefing["student_id"],
        student_name=briefing["student_name"],
        usn=briefing["usn"],
        cgpa=briefing["cgpa"],
        overall_attendance=briefing["overall_attendance"],
        fee_balance=briefing["fee_balance"],
        upcoming_exams_count=briefing["upcoming_exams_count"],
        upcoming_exams=exam_items,
        highlights=briefing["highlights"],
        urgent_actions=briefing["urgent_actions"],
        briefing_markdown=briefing["briefing_markdown"],
        generated_at=briefing["generated_at"],
    )


@router.get("/analytics/risk-radar", response_model=RiskRadarResponse)
def get_student_risk_radar(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """Evaluate institutional multi-dimensional risk matrix across attendance, CIE marks, fees, and backlog vitals."""
    student = _get_target_student(current_user, db)
    radar = ProactiveAnalyticsEngine.generate_risk_radar(user_id=student.id, db=db)
    at_risk_courses = [AtRiskCourseSchema(**c) for c in radar["at_risk_courses"]]

    return RiskRadarResponse(
        student_id=radar["student_id"],
        overall_risk_level=radar["overall_risk_level"],
        risk_score=radar["risk_score"],
        critical_shortage_count=radar["critical_shortage_count"],
        warning_count=radar["warning_count"],
        fee_balance_due=radar["fee_balance_due"],
        active_backlogs=radar["active_backlogs"],
        at_risk_courses=at_risk_courses,
        radar_markdown=radar["radar_markdown"],
        evaluated_at=radar["evaluated_at"],
    )


@router.get("/analytics/study-schedule", response_model=SmartStudyScheduleResponse)
def get_smart_study_schedule(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """Generate AI-synthesized smart revision and study schedule aligned with upcoming semester exams."""
    student = _get_target_student(current_user, db)
    schedule = ProactiveAnalyticsEngine.generate_smart_study_schedule(user_id=student.id, db=db)
    sessions = [StudySessionItemSchema(**s) for s in schedule["study_sessions"]]

    return SmartStudyScheduleResponse(
        student_id=schedule["student_id"],
        total_study_days=schedule["total_study_days"],
        study_sessions=sessions,
        schedule_markdown=schedule["schedule_markdown"],
        generated_at=schedule["generated_at"],
    )


# --- Phase 2: Predictive Intelligence & Academic Recommendations ---

@router.get("/recommendations/comprehensive", response_model=ComprehensiveRecommendationsResponse)
def get_comprehensive_recommendations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """Generate predictive risk detection and personalized study/course recommendations based on live ERP data."""
    student = _get_target_student(current_user, db)

    att_risks = [AttendanceRiskPredictionItem(**r) for r in PredictiveAnalyticsEngine.predict_attendance_risks(student.id, db)]
    acad_risks = [AcademicRiskPredictionItem(**r) for r in PredictiveAnalyticsEngine.detect_academic_risks(student.id, db)]
    study_recs = [PersonalizedStudyRecommendationItem(**s) for s in PredictiveAnalyticsEngine.generate_personalized_study_recommendations(student.id, db)]
    course_recs = [CourseRecommendationItem(**c) for c in PredictiveAnalyticsEngine.recommend_courses_and_skills(student, db)]

    high_att = sum(1 for r in att_risks if r.risk_level == "High")
    high_acad = sum(1 for r in acad_risks if r.risk_level == "High")

    summary_md = f"""### 🎯 AI Academic Advisory & Predictive Insights for **{student.full_name}**
- **Attendance Risks Detected:** {high_att} critical shortage alert(s).
- **Academic Difficulties:** {high_acad} high-priority subject(s) requiring remediation.
- **Personalized Revision Focus:** {len(study_recs)} tailored study schedules generated.
- **Career Elective Recommendations:** {len(course_recs)} recommended career pathways.
"""

    return ComprehensiveRecommendationsResponse(
        student_id=student.id,
        student_name=student.full_name,
        attendance_risks=att_risks,
        academic_risks=acad_risks,
        study_recommendations=study_recs,
        course_recommendations=course_recs,
        summary_markdown=summary_md,
        generated_at=datetime.now(timezone.utc).strftime("%B %d, %Y %I:%M %p"),
    )


@router.get("/recommendations/attendance-risk", response_model=List[AttendanceRiskPredictionItem])
def get_attendance_risk_predictions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """Predict course-wise attendance shortage risks and calculate recovery trajectories."""
    student = _get_target_student(current_user, db)
    return [AttendanceRiskPredictionItem(**r) for r in PredictiveAnalyticsEngine.predict_attendance_risks(student.id, db)]


@router.get("/recommendations/academic-risk", response_model=List[AcademicRiskPredictionItem])
def get_academic_risk_predictions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """Detect academic subject difficulty and exam risk levels."""
    student = _get_target_student(current_user, db)
    return [AcademicRiskPredictionItem(**r) for r in PredictiveAnalyticsEngine.detect_academic_risks(student.id, db)]


@router.get("/recommendations/study", response_model=List[PersonalizedStudyRecommendationItem])
@router.get("/recommendations/study-topics", response_model=List[PersonalizedStudyRecommendationItem])
def get_personalized_study_recommendations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """Generate high-yield revision topics and hours per week based on syllabus & CIE performance."""
    student = _get_target_student(current_user, db)
    return [PersonalizedStudyRecommendationItem(**s) for s in PredictiveAnalyticsEngine.generate_personalized_study_recommendations(student.id, db)]


@router.get("/recommendations/courses", response_model=List[CourseRecommendationItem])
def get_course_and_skill_recommendations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """Recommend elective courses, certifications, and industry skills with explainable reasons."""
    student = _get_target_student(current_user, db)
    return [CourseRecommendationItem(**c) for c in PredictiveAnalyticsEngine.recommend_courses_and_skills(student, db)]


# --- Phase 4: Enhanced Placement AI Assistant Endpoints ---

@router.post("/placement/analyze-resume", response_model=ResumeAnalysisResponse)
@router.post("/placement/resume/analyze", response_model=ResumeAnalysisResponse)
def analyze_student_resume(
    payload: ResumeAnalysisRequest,
    current_user: User = Depends(get_current_user),
) -> Any:
    """Extract skills, analyze role match, provide ATS optimization tips and bullet point improvements."""
    result = PlacementAIEngine.analyze_resume(
        resume_text=payload.resume_text,
        target_role=payload.target_role or "Software Development Engineer (SDE-1)",
        target_company=payload.target_company_type or "Product Company",
    )
    return ResumeAnalysisResponse(**result)


@router.post("/placement/mock-interview/start", response_model=MockInterviewStartResponse)
@router.post("/placement/interview/start", response_model=MockInterviewStartResponse)
def start_mock_interview(
    payload: MockInterviewStartRequest,
    current_user: User = Depends(get_current_user),
) -> Any:
    """Initialize an interactive multi-turn AI mock interview session."""
    result = PlacementAIEngine.start_mock_interview(
        role=payload.target_role,
        company=payload.company_type,
        domain=payload.domain_tech,
        difficulty=payload.difficulty,
    )
    return MockInterviewStartResponse(**result)


@router.post("/placement/mock-interview/evaluate", response_model=MockInterviewEvaluateResponse)
@router.post("/placement/interview/evaluate", response_model=MockInterviewEvaluateResponse)
def evaluate_mock_interview_answer(
    payload: MockInterviewEvaluateRequest,
    current_user: User = Depends(get_current_user),
) -> Any:
    """Evaluate student response, score technical depth, generate model answer and next question."""
    result = PlacementAIEngine.evaluate_answer(
        interview_id=payload.interview_id,
        q_index=payload.question_index,
        q_text=payload.question_text,
        answer=payload.student_answer,
    )
    return MockInterviewEvaluateResponse(**result)


@router.post("/placement/mock-interview/finish", response_model=MockInterviewFinishResponse)
def finish_mock_interview(
    payload: MockInterviewFinishRequest,
    current_user: User = Depends(get_current_user),
) -> Any:
    """Synthesize complete mock interview debrief report, score, strengths, and preparation plan."""
    result = PlacementAIEngine.finish_mock_interview(interview_id=payload.interview_id)
    return MockInterviewFinishResponse(**result)


@router.post("/placement/interview/{interview_id}/finish", response_model=MockInterviewFinishResponse)
def finish_mock_interview_path(
    interview_id: str,
    current_user: User = Depends(get_current_user),
) -> Any:
    """Path-based finish mock interview endpoint."""
    result = PlacementAIEngine.finish_mock_interview(interview_id=interview_id)
    return MockInterviewFinishResponse(**result)


@router.get("/placement/readiness/{student_id}", response_model=PlacementReadinessResponse)
def get_placement_readiness_by_id(
    student_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """Calculate transparent placement readiness index (0-100%) from real ERP data, CGPA, and interview scores."""
    result = PlacementAIEngine.calculate_placement_readiness(user_id=student_id, db=db)
    return PlacementReadinessResponse(
        student_id=result["student_id"],
        student_name=result["student_name"],
        cgpa=result["cgpa"],
        readiness_score=result["readiness_score"],
        readiness_tier=result["readiness_tier"],
        factors=[PlacementReadinessFactor(**f) for f in result["factors"]],
        key_strengths=result["key_strengths"],
        improvement_actions=result["improvement_actions"],
        summary_markdown=result["summary_markdown"],
    )


@router.get("/placement/readiness", response_model=PlacementReadinessResponse)
def get_placement_readiness_current(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """Calculate placement readiness for currently authenticated user."""
    student = _get_target_student(current_user, db)
    result = PlacementAIEngine.calculate_placement_readiness(user_id=student.id, db=db)
    return PlacementReadinessResponse(
        student_id=result["student_id"],
        student_name=result["student_name"],
        cgpa=result["cgpa"],
        readiness_score=result["readiness_score"],
        readiness_tier=result["readiness_tier"],
        factors=[PlacementReadinessFactor(**f) for f in result["factors"]],
        key_strengths=result["key_strengths"],
        improvement_actions=result["improvement_actions"],
        summary_markdown=result["summary_markdown"],
    )



