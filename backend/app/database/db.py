from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import DATABASE_URL

# Engine
_is_sqlite = DATABASE_URL.startswith("sqlite")

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    connect_args={"check_same_thread": False} if _is_sqlite else {},
)

# WAL mode (SQLite only)
if _is_sqlite:
    @event.listens_for(engine, "connect")
    def _enable_wal_mode(dbapi_connection, connection_record):
        """Enable WAL journal mode on every new SQLite connection."""
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.close()

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Shared declarative base
Base = declarative_base()


def get_db():
    """FastAPI dependency: scoped DB session per request."""
    db_session = SessionLocal()
    try:
        yield db_session
    finally:
        db_session.close()


def init_db():
    """Initialise schema, run auto-migrations, and seed default universe if empty."""
    from app.database import models  # noqa: F401
    Base.metadata.create_all(bind=engine)

    # Migration: add `decision` column
    try:
        with engine.connect() as connection:
            connection.execute(
                text("ALTER TABLE model_registry ADD COLUMN decision VARCHAR(20) DEFAULT 'PROMOTED'")
            )
            connection.commit()
    except Exception:
        pass

    # Migration: add `reason` column
    try:
        with engine.connect() as connection:
            connection.execute(
                text("ALTER TABLE model_registry ADD COLUMN reason TEXT")
            )
            connection.commit()
    except Exception:
        pass

    # Auto-seed default Indian stock universe on fresh deployment
    try:
        session = SessionLocal()
        stock_count = session.query(models.Stock).count()
        if stock_count == 0:
            default_stocks = [
                {"symbol": "RELIANCE.NS", "name": "Reliance Industries Ltd", "exchange": "NSE", "sector": "Energy"},
                {"symbol": "TCS.NS", "name": "Tata Consultancy Services Ltd", "exchange": "NSE", "sector": "Technology"},
                {"symbol": "HDFCBANK.NS", "name": "HDFC Bank Ltd", "exchange": "NSE", "sector": "Financial Services"},
                {"symbol": "ICICIBANK.NS", "name": "ICICI Bank Ltd", "exchange": "NSE", "sector": "Financial Services"},
                {"symbol": "INFY.NS", "name": "Infosys Ltd", "exchange": "NSE", "sector": "Technology"},
                {"symbol": "TATAMOTORS.NS", "name": "Tata Motors Ltd", "exchange": "NSE", "sector": "Automotive"},
                {"symbol": "WIPRO.NS", "name": "Wipro Ltd", "exchange": "NSE", "sector": "Technology"},
                {"symbol": "BAJFINANCE.NS", "name": "Bajaj Finance Ltd", "exchange": "NSE", "sector": "Financial Services"},
                {"symbol": "SBIN.NS", "name": "State Bank of India", "exchange": "NSE", "sector": "Financial Services"},
                {"symbol": "KOTAKBANK.NS", "name": "Kotak Mahindra Bank Ltd", "exchange": "NSE", "sector": "Financial Services"},
            ]
            for s in default_stocks:
                session.add(models.Stock(**s))
            session.commit()
            print(f"[init_db] Auto-seeded {len(default_stocks)} default stocks into universe.")
        session.close()
    except Exception as e:
        print(f"[init_db] Auto-seed skipped: {e}")
