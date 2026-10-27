import unittest
from urllib.parse import parse_qs, urlparse
from app.services import prepare_explanation


class ExplanationTests(unittest.TestCase):
    def test_prompt_preserves_unicode_and_url_characters(self):
        text = "café & language? #meaning"
        result = prepare_explanation({"text": text, "detail": "short"})
        self.assertEqual(parse_qs(urlparse(result["chatgpt_url"]).query)["q"][0], result["prompt"])
        self.assertIn(text, result["prompt"])
        self.assertEqual(result["mode"], "prepared_prompt")

    def test_rejects_invalid_requests(self):
        for payload in [None, [], {}, {"text": 3}, {"text": "  "},
                        {"text": "a" * 1001}, {"text": "word", "detail": "invalid"}]:
            with self.subTest(payload=payload), self.assertRaises(ValueError):
                prepare_explanation(payload)

    def test_trims_and_accepts_limit(self):
        self.assertEqual(prepare_explanation({"text": " word "})["text"], "word")
        self.assertEqual(len(prepare_explanation({"text": "a" * 1000})["text"]), 1000)
