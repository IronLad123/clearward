import unittest
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent))
from app.database.db import init_db, SessionLocal
from app.retraining.evaluator import evaluate_and_retrain_model

class TestGatekeeperStability(unittest.TestCase):

    def setUp(self):
        init_db()
        self.db = SessionLocal()

        def tearDown(self):
            self.db.close()

            def test_evaluator_execution_and_audit_logging(self):
                res = evaluate_and_retrain_model('TCS.NS', self.db, min_new_samples=0)
                self.assertIn('status', res)
                self.assertIn('decision', res)
                self.assertIn('reason', res)
                if __name__ == '__main__':
                    unittest.main()
