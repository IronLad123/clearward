import unittest
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent))
from app.rag.explainer import generate_grounded_explanation, verify_sentence_grounding


class TestRAGGrounding(unittest.TestCase):

    def setUp(self):
        self.news_snippets = [
            {
                'id': 'doc_tata_q4_001',
                'title': 'Tata Steel Reports Strong Q4 Revenue Growth',
                'source': 'Moneycontrol',
                'published_at': '2026-07-20T10:00:00Z',
                'url': 'https://example.com/news1',
                'content': 'Tata Steel reported robust revenue growth driven by domestic demand.'
            }
        ]

    def test_grounding_verification(self):
        grounded_sent = 'Tata Steel reported robust revenue growth in Q4 [Tata Steel Reports Strong Q4 Revenue Growth | Moneycontrol | 2026-07-20].'
        self.assertTrue(verify_sentence_grounding(grounded_sent, self.news_snippets))

    def test_grounding_score_calculation(self):
        res = generate_grounded_explanation(
            symbol='TATASTEEL.NS',
            company_name='Tata Steel',
            price=187.2,
            signal_info={'signal_type': 'TREND_CONTINUATION', 'direction': 'BULLISH'},
            prediction_info={'direction': 'UP', 'confidence': 0.75},
            news_snippets=self.news_snippets
        )
        self.assertIn('grounding_score', res)
        self.assertGreaterEqual(res['grounding_score'], 80.0)
        self.assertTrue(res['is_grounded'])
        self.assertGreater(len(res['citations']), 0)

        # Strengthened citation verification: verify each citation references ACTUAL retrieved docs
        for citation in res['citations']:
            assert any(citation.get('title', '') in snip.get('title', '') for snip in self.news_snippets), \
                f"Citation '{citation.get('title')}' not found in retrieved documents"
            # Verify document ID matches retrieved doc
            self.assertEqual(citation.get('id'), self.news_snippets[0]['id'])
            self.assertEqual(citation.get('url'), self.news_snippets[0]['url'])

    def test_empty_news_snippets_no_fabricated_citations(self):
        """
        When no news snippets are retrieved, explanation must explicitly state
        'No supporting news evidence found' and have empty citations list.
        """
        res = generate_grounded_explanation(
            symbol='TATASTEEL.NS',
            company_name='Tata Steel',
            price=187.2,
            signal_info={'signal_type': 'CONSOLIDATION', 'direction': 'NEUTRAL'},
            prediction_info={'direction': 'FLAT', 'confidence': 0.5},
            news_snippets=[]
        )
        self.assertEqual(len(res['citations']), 0)
        news_section = res['sections']['news_context']
        self.assertIn('No supporting news evidence found', news_section)


if __name__ == '__main__':
    unittest.main()
