import os
import json
from typing import List, Dict, Any, Optional
from app.ai.rag.embeddings import EmbeddingEngine


class VectorStore:
    """
    Persistent Vector Store for semantic similarity search over institutional policy chunks
    and user-uploaded documents with user and document isolation.
    """

    def __init__(self, index_path: Optional[str] = None):
        self.embedding_engine = EmbeddingEngine()
        self.chunks: List[Dict[str, Any]] = []
        self.vectors: List[List[float]] = []
        self.index_path = index_path or os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "vector_store", "index.json")
        )
        self.load_index()

    def add_chunks(self, new_chunks: List[Dict[str, Any]]):
        """Append or fit embedding vocabulary and index all chunks."""
        if not new_chunks:
            return

        # Combine existing and new chunks
        existing_ids = {c["chunk_id"] for c in self.chunks}
        filtered_new = [c for c in new_chunks if c["chunk_id"] not in existing_ids]

        self.chunks.extend(filtered_new)
        texts = [c["text"] for c in self.chunks]

        # Fit embedding engine on total corpus
        self.embedding_engine.fit(texts)

        # Generate vectors for all chunks
        self.vectors = [self.embedding_engine.encode(t) for t in texts]

    def remove_document_chunks(self, document_id: int):
        """Remove chunks and vectors corresponding to a deleted document."""
        retained_chunks = [c for c in self.chunks if c.get("document_id") != document_id]
        if len(retained_chunks) != len(self.chunks):
            self.chunks = retained_chunks
            texts = [c["text"] for c in self.chunks]
            if texts:
                self.embedding_engine.fit(texts)
                self.vectors = [self.embedding_engine.encode(t) for t in texts]
            else:
                self.vectors = []
            self.save_index()

    def search(
        self,
        query: str,
        top_k: int = 4,
        min_score: float = 0.05,
        document_id: Optional[int] = None,
        user_id: Optional[int] = None,
        include_public: bool = True,
    ) -> List[Dict[str, Any]]:
        """
        Search vector index with optional document filtering and user authorization isolation.
        """
        if not self.chunks or not self.vectors:
            return []

        query_vec = self.embedding_engine.encode(query)
        scored_results = []

        for idx, chunk in enumerate(self.chunks):
            # 1. Filter by specific document if provided
            if document_id is not None and chunk.get("document_id") != document_id:
                continue

            # 2. Check user authorization if user_id is provided
            chunk_user_id = chunk.get("user_id", 0)
            chunk_is_public = chunk.get("is_public", True)

            if user_id is not None:
                if chunk_user_id != user_id and not (include_public and chunk_is_public):
                    continue

            chunk_vec = self.vectors[idx]
            similarity = self.embedding_engine.cosine_similarity(query_vec, chunk_vec)
            if similarity >= min_score:
                page_num = chunk.get("page_number", 1)
                doc_title = chunk.get("document_title", "Document")
                sec_title = chunk.get("section_title", "General")

                citation_str = f"{doc_title} (Page {page_num})" if page_num else f"{doc_title} ({sec_title})"

                scored_results.append({
                    "chunk_id": chunk.get("chunk_id", f"chk_{idx}"),
                    "document_id": chunk.get("document_id", 0),
                    "document_title": doc_title,
                    "filename": chunk.get("filename", "document.pdf"),
                    "page_number": page_num,
                    "section_title": sec_title,
                    "text": chunk.get("text", ""),
                    "similarity_score": round(similarity, 4),
                    "citation": citation_str,
                    "has_table": chunk.get("has_table", False),
                    "category": chunk.get("category", "General"),
                })

        # Sort descending by similarity score
        scored_results.sort(key=lambda x: x["similarity_score"], reverse=True)
        return scored_results[:top_k]

    def save_index(self, target_path: Optional[str] = None):
        """Persist vector index to disk."""
        path = target_path or self.index_path
        os.makedirs(os.path.dirname(path), exist_ok=True)

        payload = {
            "vocabulary": self.embedding_engine._vocabulary,
            "idf": self.embedding_engine._idf,
            "chunks": self.chunks,
            "vectors": self.vectors,
        }

        with open(path, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)

    def load_index(self, target_path: Optional[str] = None) -> bool:
        """Load persisted vector index from disk."""
        path = target_path or self.index_path
        if not os.path.exists(path):
            return False

        try:
            with open(path, "r", encoding="utf-8") as f:
                payload = json.load(f)

            self.embedding_engine._vocabulary = payload.get("vocabulary", {})
            self.embedding_engine._idf = payload.get("idf", {})
            self.chunks = payload.get("chunks", [])
            self.vectors = payload.get("vectors", [])
            return True
        except Exception:
            return False
