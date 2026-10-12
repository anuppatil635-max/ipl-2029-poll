
#!/usr/bin/env bash
set -o errexit

# Install Python dependencies.
pip install -r requirements.txt

# Collect static files without connecting to PostgreSQL.
python manage.py collectstatic --no-input
