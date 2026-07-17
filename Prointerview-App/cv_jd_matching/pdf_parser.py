from __future__ import annotations
import fitz  # PyMuPDF
import pdfplumber
import re
from pathlib import Path


def clean_text(text: str) -> str:
    """Loại bỏ ký tự rác, chuẩn hoá khoảng trắng."""
    text = re.sub(r'\s+', ' ', text)          # nhiều space → 1
    text = re.sub(r'[^\x20-\x7E\nÀ-ỹ]', '', text)  # giữ ASCII + tiếng Việt
    text = re.sub(r'\n{3,}', '\n\n', text)    # nhiều dòng trống → 2
    return text.strip()


def extract_with_pymupdf(pdf_path: str) -> str:
    """
    Nhanh, tốt cho CV single-column.
    Giữ được thứ tự đọc tự nhiên theo block.
    """
    doc = fitz.open(pdf_path)
    pages_text = []

    for page in doc:
        # sort=True: sắp xếp text theo thứ tự đọc (trái→phải, trên→dưới)
        blocks = page.get_text("blocks", sort=True)
        page_text = "\n".join(
            b[4] for b in blocks if b[6] == 0  # b[6]==0 là text block (không phải ảnh)
        )
        pages_text.append(page_text)

    doc.close()
    return clean_text("\n\n".join(pages_text))


def extract_with_pdfplumber(pdf_path: str) -> str:
    """
    Chậm hơn nhưng xử lý tốt CV 2 cột, bảng biểu.
    """
    pages_text = []

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text(
                x_tolerance=2,    # tolerance ngang (gộp chữ gần nhau)
                y_tolerance=3     # tolerance dọc (gộp dòng gần nhau)
            )
            if text:
                pages_text.append(text)

    return clean_text("\n\n".join(pages_text))


def is_scanned_pdf(pdf_path: str, threshold: int = 50) -> bool:
    """
    Phát hiện PDF scan (ảnh chụp, không có text layer).
    Nếu số ký tự < threshold/trang → khả năng cao là scan.
    """
    doc = fitz.open(pdf_path)
    total_chars = sum(len(page.get_text()) for page in doc)
    avg_chars = total_chars / max(len(doc), 1)
    doc.close()
    return avg_chars < threshold


def parse_pdf(pdf_path: str) -> dict:
    """
    Entry point chính. Tự chọn parser phù hợp.
    Trả về dict gồm text và metadata.
    """
    path = Path(pdf_path)
    if not path.exists():
        raise FileNotFoundError(f"Không tìm thấy file: {pdf_path}")

    if is_scanned_pdf(pdf_path):
        return {
            "text": "",
            "is_scanned": True,
            "error": "PDF dạng scan (ảnh). Vui lòng upload PDF có text hoặc dùng OCR.",
            "page_count": 0,
        }

    # Thử PyMuPDF trước (nhanh hơn)
    text = extract_with_pymupdf(pdf_path)

    # Nếu text quá ngắn, fallback sang pdfplumber (CV 2 cột)
    if len(text) < 200:
        text = extract_with_pdfplumber(pdf_path)

    doc = fitz.open(pdf_path)
    page_count = len(doc)
    doc.close()

    return {
        "text": text,
        "is_scanned": False,
        "error": None,
        "page_count": page_count,
        "char_count": len(text),
    }


# ── Test nhanh ──────────────────────────────────────────────
if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python pdf_parser.py <path_to_pdf>")
        sys.exit(1)

    result = parse_pdf(sys.argv[1])
    if result["error"]:
        print(f"[ERROR] {result['error']}")
    else:
        print(f"[OK] {result['page_count']} trang, {result['char_count']} ký tự")
        print("─" * 60)
        print(result["text"][:500], "...")
