#!/bin/bash
set -e

echo "A fazer pull do repositório..."
cd /tmp/gi-techflow
git remote set-url origin https://github.com/sergiohenriquespt/gi-techflow.git
git pull --no-rebase

echo "A fazer build da imagem..."
docker build -t gi-techflow:latest .

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
  gi-techflow:latest

echo "Deploy concluído! App disponível em http://techflow.graficaideal.local"
