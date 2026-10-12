import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, Text, Float, ForeignKey
from app.core.database import Base


class SourceType(str, enum.Enum):
    WEBSITE = "WEBSITE"
    WEBPAGE = "WEBPAGE"
    PDF = "PDF"
    DOCUMENT = "DOCUMENT"
    CSV = "CSV"
    EXCEL = "EXCEL"
    JSON = "JSON"
    API = "API"


class DataCategory(str, enum.Enum):
    ACADEMIC = "Academic"
    ADMISSIONS = "Admissions"
    DEPARTMENTS = "Departments"
    COURSES = "Courses"
    FACULTY = "Faculty"
    EXAMINATION = "Examination"
    RESULTS = "Results"
    FEES = "Fees"
    SCHOLARSHIPS = "Scholarships"
    NOTICES = "Notices"
    EVENTS = "Events"
    REGULATIONS = "Regulations"
    LIBRARY = "Library"
    HOSTEL = "Hostel"
    PLACEMENTS = "Placements"
    GENERAL = "General"


class ContentClassification(str, enum.Enum):
    UNIVERSITY_PROFILE = "UNIVERSITY_PROFILE"
    DEPARTMENT = "DEPARTMENT"
    PROGRAM = "PROGRAM"
    COURSE = "COURSE"
    SUBJECT = "SUBJECT"
    FACULTY = "FACULTY"
    ADMISSION = "ADMISSION"
    EXAMINATION = "EXAMINATION"
    ACADEMIC_CALENDAR = "ACADEMIC_CALENDAR"
    RESULTS = "RESULTS"
    FEES = "FEES"
    SCHOLARSHIP = "SCHOLARSHIP"
    ATTENDANCE_POLICY = "ATTENDANCE_POLICY"
    REGULATIONS = "REGULATIONS"
    NOTICE = "NOTICE"
    EVENT = "EVENT"
    PLACEMENT = "PLACEMENT"
    LIBRARY = "LIBRARY"
    HOSTEL = "HOSTEL"
    CONTACT = "CONTACT"
    FAQ = "FAQ"
    GENERAL = "GENERAL"
    NEEDS_REVIEW = "NEEDS_REVIEW"


class DataSource(Base):
    __tablename__ = "data_sources"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    url = Column(String(1000), nullable=True)
    source_type = Column(Enum(SourceType), default=SourceType.WEBSITE, nullable=False)
    category = Column(Enum(DataCategory), default=DataCategory.GENERAL, nullable=False)
    allowed_domain = Column(String(255), nullable=True)
    sync_frequency = Column(String(50), default="Daily", nullable=False)  # Manual, Daily, Weekly, Custom
    crawl_depth = Column(Integer, default=2, nullable=False)
    max_pages = Column(Integer, default=25, nullable=False)
    request_delay_ms = Column(Integer, default=500, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    last_synced_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class CrawlJob(Base):
    __tablename__ = "crawl_jobs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    data_source_id = Column(Integer, ForeignKey("data_sources.id", ondelete="CASCADE"), nullable=True)
    start_url = Column(String(1000), nullable=False)
    pages_discovered = Column(Integer, default=0, nullable=False)
    pages_crawled = Column(Integer, default=0, nullable=False)
    pages_failed = Column(Integer, default=0, nullable=False)
    status = Column(String(50), default="RUNNING", nullable=False)  # RUNNING, COMPLETED, FAILED
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)


class CrawlPage(Base):
    __tablename__ = "crawl_pages"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    crawl_job_id = Column(Integer, ForeignKey("crawl_jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    url = Column(String(1000), nullable=False, index=True)
    title = Column(String(500), nullable=True)
    content_hash = Column(String(64), nullable=False, index=True)
    http_status = Column(Integer, default=200, nullable=False)
    content_type = Column(String(100), default="text/html", nullable=False)
    cleaned_text = Column(Text, nullable=True)
    classification = Column(Enum(ContentClassification), default=ContentClassification.GENERAL, nullable=False)
    confidence_score = Column(Float, default=0.90, nullable=False)
    sync_status = Column(String(50), default="NEW", nullable=False)  # NEW, UNCHANGED, UPDATED
    discovered_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class DataReviewQueue(Base):
    __tablename__ = "data_review_queue"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    source_url = Column(String(1000), nullable=False)
    record_type = Column(String(100), nullable=False)  # Department, Course, Faculty, Regulation, Policy
    title = Column(String(500), nullable=False)
    extracted_data_json = Column(Text, nullable=False)  # Structured JSON representation
    confidence_score = Column(Float, default=0.75, nullable=False)
    status = Column(String(50), default="PENDING", nullable=False)  # PENDING, APPROVED, REJECTED, PUBLISHED
    admin_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)


class DataImportJob(Base):
    __tablename__ = "data_import_jobs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    filename = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=False)  # CSV, EXCEL, JSON
    target_entity = Column(String(100), nullable=False)  # students, faculty, courses, timetable, marks, fees
    total_rows = Column(Integer, default=0, nullable=False)
    valid_rows = Column(Integer, default=0, nullable=False)
    invalid_rows = Column(Integer, default=0, nullable=False)
    duplicate_rows = Column(Integer, default=0, nullable=False)
    status = Column(String(50), default="PREVIEW_READY", nullable=False)  # PREVIEW_READY, IMPORTED, FAILED
    uploaded_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    imported_at = Column(DateTime(timezone=True), nullable=True)


class DataImportError(Base):
    __tablename__ = "data_import_errors"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    import_job_id = Column(Integer, ForeignKey("data_import_jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    row_number = Column(Integer, nullable=False)
    field_name = Column(String(100), nullable=True)
    raw_value = Column(String(500), nullable=True)
    error_message = Column(Text, nullable=False)


class SyncLog(Base):
    __tablename__ = "sync_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    source_name = Column(String(255), nullable=False)
    sync_type = Column(String(50), default="SCHEDULED", nullable=False)  # MANUAL, SCHEDULED
    records_new = Column(Integer, default=0, nullable=False)
    records_updated = Column(Integer, default=0, nullable=False)
    records_unchanged = Column(Integer, default=0, nullable=False)
    documents_embedded = Column(Integer, default=0, nullable=False)
    duration_seconds = Column(Float, default=0.0, nullable=False)
    status = Column(String(50), default="SUCCESS", nullable=False)  # SUCCESS, PARTIAL, FAILED
    details = Column(Text, nullable=True)
    synced_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class DataProvenance(Base):
    __tablename__ = "data_provenance"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    entity_name = Column(String(100), nullable=False)  # e.g., Course, Faculty, Policy
    entity_id = Column(String(100), nullable=False)
    source_type = Column(String(50), nullable=False)
    source_url = Column(String(1000), nullable=True)
    source_document = Column(String(255), nullable=True)
    source_page = Column(Integer, nullable=True)
    retrieved_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    last_verified_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    content_hash = Column(String(64), nullable=True)
    confidence_score = Column(Float, default=1.0, nullable=False)
    extraction_method = Column(String(100), default="AUTOMATIC_CRAWLER", nullable=False)
