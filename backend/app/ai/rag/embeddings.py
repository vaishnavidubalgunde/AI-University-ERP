import re
import math
from typing import List, Dict, Any
from collections import Counter


class EmbeddingEngine:
    """
    Embedding generator with support for SentenceTransformers and lightweight semantic TF-IDF cosine vectorization.
    """

    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        self.model_name = model_name
        self._st_model = None
        self._vocabulary: Dict[str, int] = {}
        self._idf: Dict[str, float] = {}

    def _tokenize(self, text: str) -> List[str]:
        return re.findall(r"\b[a-zA-Z0-9_-]{2,}\b", text.lower())

    def fit(self, corpus_texts: List[str]):
        """Fit vocabulary and IDF weights across corpus documents."""
        doc_count = len(corpus_texts)
        if doc_count == 0:
            return

        doc_frequencies: Counter = Counter()
        vocab_set = set()

        for doc in corpus_texts:
            tokens = set(self._tokenize(doc))
            vocab_set.update(tokens)
            for t in tokens:
                doc_frequencies[t] += 1

        self._vocabulary = {word: idx for idx, word in enumerate(sorted(vocab_set))}
        self._idf = {
            word: math.log((1 + doc_count) / (1 + doc_frequencies[word])) + 1.0
            for word in self._vocabulary
        }

    def encode(self, text: str) -> List[float]:
        """Generate normalized semantic vector representation for a text."""
        tokens = self._tokenize(text)
        if not tokens:
            return [0.0] * len(self._vocabulary)

        tf = Counter(tokens)
        vector = [0.0] * len(self._vocabulary)

        for word, count in tf.items():
            if word in self._vocabulary:
                idx = self._vocabulary[word]
                # Sublinear term frequency scaling
                tf_weight = 1.0 + math.log(count)
                idf_weight = self._idf.get(word, 1.0)
                vector[idx] = tf_weight * idf_weight

        # L2 Normalization
        norm = math.sqrt(sum(v * v for v in vector))
        if norm > 0:
            vector = [v / norm for v in vector]

        return vector

    @staticmethod
    def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
        """Compute cosine similarity between two normalized vectors."""
        if len(vec_a) != len(vec_b):
            return 0.0
        return sum(a * b for a, b in zip(vec_a, vec_b))
