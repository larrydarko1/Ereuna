#!/bin/bash
# Build and push all Ereuna Docker images
# Usage: ./build-and-push.sh [tag]

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Default tag
TAG=${1:-latest}

# Check if REGISTRY is set
if [ -z "$REGISTRY" ]; then
    echo -e "${YELLOW}REGISTRY environment variable not set.${NC}"
    echo "Please set it to your Docker registry:"
    echo "  export REGISTRY='your-dockerhub-username'"
    echo "  or: export REGISTRY='ghcr.io/your-github-username'"
    exit 1
fi

echo -e "${GREEN}Building and pushing Ereuna images...${NC}"
echo "Registry: $REGISTRY"
echo "Tag: $TAG"
echo ""

cd "$(dirname "$0")/.."

# Frontend
echo -e "${YELLOW}Building frontend...${NC}"
docker build -f docker/Dockerfile.frontend -t $REGISTRY/ereuna-frontend:$TAG .
docker push $REGISTRY/ereuna-frontend:$TAG
echo -e "${GREEN}✓ Frontend pushed${NC}"

# Backend
echo -e "${YELLOW}Building backend...${NC}"
docker build -f docker/Dockerfile.backend -t $REGISTRY/ereuna-backend:$TAG .
docker push $REGISTRY/ereuna-backend:$TAG
echo -e "${GREEN}✓ Backend pushed${NC}"

# WebSocket
echo -e "${YELLOW}Building websocket...${NC}"
docker build -f docker/Dockerfile.websocket -t $REGISTRY/ereuna-websocket:$TAG .
docker push $REGISTRY/ereuna-websocket:$TAG
echo -e "${GREEN}✓ WebSocket pushed${NC}"

# Aggregator
echo -e "${YELLOW}Building aggregator...${NC}"
docker build -f docker/Dockerfile.aggregator -t $REGISTRY/ereuna-aggregator:$TAG .
docker push $REGISTRY/ereuna-aggregator:$TAG
echo -e "${GREEN}✓ Aggregator pushed${NC}"

# Ingestor
echo -e "${YELLOW}Building ingestor...${NC}"
docker build -f docker/Dockerfile.ingestor -t $REGISTRY/ereuna-ingestor:$TAG .
docker push $REGISTRY/ereuna-ingestor:$TAG
echo -e "${GREEN}✓ Ingestor pushed${NC}"

echo ""
echo -e "${GREEN}All images built and pushed successfully! 🚀${NC}"
echo ""
echo "Update k8s/overlays/production/kustomization.yaml with:"
echo "  newTag: $TAG"
