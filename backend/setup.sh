#!/bin/bash
# ─────────────────────────────────────────────
# Taurus ERP — Backend Setup Script
# Run once: bash setup.sh
# ─────────────────────────────────────────────
set -e

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   Taurus Trade & Logistics ERP       ║"
echo "║   Backend Setup                      ║"
echo "╚══════════════════════════════════════╝"
echo ""

# 1. Install dependencies
echo "📦 Installing Python packages..."
pip install -r requirements.txt

# 2. Run migrations
echo ""
echo "🗄️  Running database migrations..."
python manage.py migrate

# 3. Collect static files
echo ""
echo "📂 Collecting static files..."
python manage.py collectstatic --noinput

echo ""
echo "✅ Setup complete!"
echo ""
echo "──────────────────────────────────────"
echo "Next steps:"
echo "  1. Edit .env — set DB_PASSWORD"
echo "  2. python manage.py createsuperuser"
echo "  3. python manage.py runserver"
echo "──────────────────────────────────────"
