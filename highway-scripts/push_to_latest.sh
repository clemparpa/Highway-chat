#!/bin/sh
set -e  # Arrêt immédiat en cas d'erreur

docker buildx build --platform linux/amd64,linux/arm64 -f Dockerfile.multi -t clemparpa/highway-chat:latest . --push