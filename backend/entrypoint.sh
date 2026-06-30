#!/bin/sh
set -e

echo "Running database migrations..."
alembic upgrade head

echo "Checking if DB needs seeding..."
COUNT=$(python -c "
import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from app.config import settings

async def count():
    engine = create_async_engine(settings.database_url, echo=False)
    async with engine.connect() as conn:
        result = await conn.execute(text('SELECT COUNT(*) FROM obligations'))
        print(result.scalar())
    await engine.dispose()

asyncio.run(count())
")

if [ "$COUNT" = "0" ]; then
    echo "DB is empty — seeding 50 obligations..."
    python scripts/populate_db.py --count 50
else
    echo "DB already has $COUNT obligations — skipping seed."
fi

echo "Starting backend..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
