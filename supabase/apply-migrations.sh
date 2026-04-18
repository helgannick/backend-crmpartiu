#!/bin/bash
# Aplica todas as migrations em ordem numérica
# Uso: DATABASE_URL=postgresql://... ./supabase/apply-migrations.sh

set -e

if [ -z "$DATABASE_URL" ]; then
  echo "Erro: DATABASE_URL não definida"
  echo "Uso: DATABASE_URL=postgresql://... ./supabase/apply-migrations.sh"
  exit 1
fi

DIR="$(dirname "$0")/migrations"

for file in "$DIR"/*.sql; do
  echo "Aplicando $(basename "$file")..."
  psql "$DATABASE_URL" -f "$file"
  echo "✓ $(basename "$file") aplicado"
done

echo ""
echo "Todas as migrations aplicadas com sucesso."
