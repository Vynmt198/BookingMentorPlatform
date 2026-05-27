"""Unit tests — skill_extractor (tránh false positive 1 ký tự)."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from skill_extractor import extract_skills  # noqa: E402


class TestSkillExtractor(unittest.TestCase):
    def test_does_not_emit_single_letter_skill_r(self):
        text = "developer with experience in r programming and react"
        skills = extract_skills(text)["skills"]
        lowered = [s.lower() for s in skills]
        self.assertNotIn("r", lowered)

    def test_keeps_multi_char_skills(self):
        text = "Proficient in React, Python, and Node.js"
        skills = extract_skills(text)["skills"]
        joined = " ".join(skills).lower()
        self.assertTrue("react" in joined or "python" in joined)


if __name__ == "__main__":
    unittest.main()
