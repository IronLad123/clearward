import unittest
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent))
from app.rag.explainer import generate_grounded_explanation, verify_sentence_grounding

class TestRAGGrounding(unittest.TestCase):

    def setUp(self):
        self.news_snippets = [{'title': 'Tata Steel Reports Strong Q4 Revenue Growth', 'source': 'Moneycontrol', 'published_at': '2026-07-20T10:00:00Z', 'url': 'https://example.com/news1', 'content': 'Tata Steel reported robust revenue growth driven by domestic demand.'}]

        def test_grounding_verification(self):
            grounded_sent = 'Tata Steel reported robust revenue growth in Q4 [Tata Steel Reports Strong Q4 Revenue Growth | Moneycontrol | 2026-07-20].'
            self.assertTrue(verify_sentence_grounding(grounded_sent, self.news_snippets))

            def test_grounding_score_calculation(self):
                res = generate_grounded_explanation(symbol='TATASTEEL.NS', company_name='Tata Steel', price=187.2, signal_info={'signal_type': 'TREND_CONTINUATION', 'direction': 'BULLISH'}, prediction_info={'direction': 'UP', 'confidence': 0.75}, news_snippets=self.news_snippets)
                self.assertIn('grounding_score', res)
                self.assertGreaterEqual(res['grounding_score'], 80.0)
                self.assertTrue(res['is_grounded'])
                self.assertGreater(len(res['citations']), 0)
                if __name__ == '__main__':
                    unittest.main()
