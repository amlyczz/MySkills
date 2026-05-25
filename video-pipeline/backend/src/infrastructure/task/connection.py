from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from ..config.app_config import settings

Base = declarative_base()

# Lazy engine — only created when a database URL is available
_engine = None
_async_session_maker = None


def _get_engine():
    global _engine
    if _engine is None:
        if not settings.database_url:
            raise RuntimeError(
                "DATABASE_URL environment variable is required. "
                "Set it to a PostgreSQL connection string, e.g. "
                "postgresql+asyncpg://user:pass@localhost:5432/video_pipeline"
            )
        _engine = create_async_engine(
            settings.database_url,
            echo=False,
            pool_size=10,
            max_overflow=20,
        )
    return _engine


def _get_session_maker():
    global _async_session_maker
    if _async_session_maker is None:
        _async_session_maker = async_sessionmaker(
            _get_engine(), class_=AsyncSession, expire_on_commit=False
        )
    return _async_session_maker


# Module-level alias for backward compatibility with existing imports
# These will lazily initialize on first access
@property
def engine(self):
    return _get_engine()

async_session_maker = property(lambda self: _get_session_maker())


class _LazySessionMaker:
    """Proxy that delegates to the real async_session_maker on first use."""
    def __call__(self, **kwargs):
        return _get_session_maker()(**kwargs)

    def __aenter__(self):
        return _get_session_maker().__aenter__()

    def __aexit__(self, *args):
        return _get_session_maker().__aexit__(*args)


async_session_maker = _LazySessionMaker()


async def get_db_session():
    async with _get_session_maker()() as session:
        yield session


async def init_db() -> None:
    async with _get_engine().begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
