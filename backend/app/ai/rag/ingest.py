import os
import glob
from typing import Dict, Any, Optional
from app.ai.rag.parser import DocumentParser
from app.ai.rag.chunker import SemanticChunker
from app.ai.rag.vector_store import VectorStore


def ingest_knowledge_base(
    corpus_dir: Optional[str] = None,
    target_index_path: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Orchestrates the entire end-to-end RAG ingestion pipeline:
    Parses institutional policies -> Chunks text -> Generates vectors -> Builds & saves VectorStore.
    """
    if corpus_dir is None:
        corpus_dir = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "knowledge_base")
        )

    parser = DocumentParser()
    chunker = SemanticChunker(chunk_size_words=120, overlap_words=25)
    vector_store = VectorStore(index_path=target_index_path)

    # Discover documents
    doc_files = glob.glob(os.path.join(corpus_dir, "*.md")) + glob.glob(os.path.join(corpus_dir, "*.txt"))
    all_chunks = []
    processed_docs = []

    for file_path in doc_files:
        parsed = parser.parse_file(file_path)
        chunks = chunker.chunk_document(parsed)
        all_chunks.extend(chunks)
        processed_docs.append({
            "title": parsed["title"],
            "filename": parsed["filename"],
            "chunks_count": len(chunks),
        })

    # Index chunks in vector store
    vector_store.add_chunks(all_chunks)
    vector_store.save_index()

    return {
        "success": True,
        "total_documents": len(processed_docs),
        "total_chunks": len(all_chunks),
        "documents": processed_docs,
        "index_path": vector_store.index_path,
    }


if __name__ == "__main__":
    result = ingest_knowledge_base()
    print(f"[+] Ingestion complete! Indexed {result['total_chunks']} chunks from {result['total_documents']} documents.")
