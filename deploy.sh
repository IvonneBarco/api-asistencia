#!/bin/bash

# Script para ejecutar migraciones en Railway

echo "🚀 Iniciando deploy con migraciones..."

# 1. Build del proyecto
echo "📦 Building proyecto..."
npm run build

# 2. Ejecutar migraciones
echo "🗄️  Ejecutando migraciones..."
npm run migration:run:prod

# 3. Iniciar aplicación
echo "✅ Iniciando aplicación..."
npm run start:prod
