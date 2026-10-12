from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict
from app.models.data_ingestion import (
    SourceType,
    DataCategory,
    ContentClassification,
)


class DataSourceCreate(BaseModel):
    name: str
    url: str
    source_type: SourceType = SourceType.WEBSITE
    category: DataCategory = DataCategory.GENERAL
    allowed_domain: Optional[str] = None
    sync_frequency: str = "Daily"
    crawl_depth: int = 2
    max_pages: int = 25
    request_delay_ms: int = 500


class DataSourceResponse(BaseModel):
    id: int
    name: str
    url: Optional[str] = None
    source_type: SourceType
    category: DataCategory
    allowed_domain: Optional[str] = None
    sync_frequency: str
    crawl_depth: int
    max_pages: int
    is_active: bool
    last_synced_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CrawlPageItem(BaseModel):
    id: int
    url: str
    title: Optional[str] = None
    content_hash: str
    classification: ContentClassification
    confidence_score: float
    sync_status: str
    discovered_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CrawlJobResponse(BaseModel):
    job_id: int
    start_url: str
    status: str
    pages_discovered: int
    pages_crawled: int
    pages_failed: int
    started_at: datetime
    completed_at: Optional[datetime] = None
    pages: List[CrawlPageItem] = []


class ReviewQueueItem(BaseModel):
    id: int
    source_url: str
    record_type: str
    title: str
    extracted_data_json: str
    confidence_score: float
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReviewActionRequest(BaseModel):
    action: str  # APPROVE, REJECT, PUBLISH
    admin_notes: Optional[str] = None
    edited_data_json: Optional[str] = None


class CSVImportPreviewRequest(BaseModel):
    raw_csv: str
    target_entity: str  # students, faculty, courses, departments


class CSVImportConfirmRequest(BaseModel):
    raw_csv: str
    target_entity: str


class SyncDashboardMetrics(BaseModel):
    total_sources: int
    active_sources: int
    total_crawled_pages: int
    pending_review_count: int
    total_knowledge_chunks: int
    last_sync_timestamp: Optional[str] = None
    system_status: str
