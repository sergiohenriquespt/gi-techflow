#!/bin/bash
set -e

TAG="gi-techflow:$(date +%Y%m%d%H%M%S)"

echo "A fazer pull do repositório..."
cd /tmp/gi-techflow
git remote set-url origin https://github.com/sergiohenriquespt/gi-techflow.git
git fetch origin
git reset --hard origin/main

echo "A fazer build da imagem ($TAG)..."
docker build --no-cache -t "$TAG" .

echo "A reiniciar o container..."
docker stop gi-techflow 2>/dev/null || true
docker rm gi-techflow 2>/dev/null || true
docker run -d --name gi-techflow \
  --network coolify \
  -p 3001:80 \
  -l traefik.enable=true \
  -l "traefik.http.routers.techflow.rule=Host(\`techflow.graficaideal.local\`)" \
  -l traefik.http.routers.techflow.entrypoints=http \
  -l traefik.http.services.techflow.loadbalancer.server.port=80 \
  "$TAG"

echo "Deploy concluído! App disponível em http://techflow.graficaideal.local"
