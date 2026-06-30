FROM python:3.12-slim

WORKDIR /app

# Install deps first (layer cache)
COPY pyproject.toml .
COPY app/ app/
COPY alembic/ alembic/
COPY alembic.ini .
RUN pip install --no-cache-dir -e "."

# Entrypoint handles migrations + server start
COPY scripts/ scripts/
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8000
ENTRYPOINT ["/entrypoint.sh"]
