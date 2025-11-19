#!/bin/bash
# Ereuna Kubernetes Deployment Helper Script
# This script helps you deploy Ereuna to Kubernetes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Ereuna Kubernetes Deployment        ║${NC}"
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command_exists kubectl; then
    echo -e "${RED}❌ kubectl not found. Please install kubectl first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ kubectl found${NC}"

if ! command_exists helm; then
    echo -e "${YELLOW}⚠ helm not found. Helm is recommended but optional.${NC}"
else
    echo -e "${GREEN}✓ helm found${NC}"
fi

# Check cluster connection
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}❌ Cannot connect to Kubernetes cluster. Please configure kubectl.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Connected to Kubernetes cluster${NC}"

CLUSTER_NAME=$(kubectl config current-context)
echo -e "${GREEN}  Cluster: ${CLUSTER_NAME}${NC}"
echo ""

# Menu
echo "What would you like to do?"
echo "1) Full deployment (install everything)"
echo "2) Install prerequisites (NGINX Ingress, cert-manager, metrics-server)"
echo "3) Deploy application only"
echo "4) Deploy monitoring stack only"
echo "5) Update application images"
echo "6) View deployment status"
echo "7) Delete everything"
echo "0) Exit"
echo ""
read -p "Enter your choice [0-7]: " choice

case $choice in
    1)
        echo -e "${YELLOW}Starting full deployment...${NC}"
        
        # Install prerequisites
        echo -e "${YELLOW}Installing NGINX Ingress Controller...${NC}"
        helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx 2>/dev/null || true
        helm repo update
        helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
            --namespace ingress-nginx \
            --create-namespace \
            --set controller.service.type=LoadBalancer \
            --set controller.metrics.enabled=true \
            --wait
        echo -e "${GREEN}✓ NGINX Ingress installed${NC}"
        
        echo -e "${YELLOW}Installing cert-manager...${NC}"
        kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
        kubectl wait --for=condition=Available --timeout=300s deployment/cert-manager -n cert-manager
        echo -e "${GREEN}✓ cert-manager installed${NC}"
        
        echo -e "${YELLOW}Installing metrics-server...${NC}"
        kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
        echo -e "${GREEN}✓ metrics-server installed${NC}"
        
        # Check for secrets
        echo -e "${YELLOW}Checking for secrets...${NC}"
        if ! kubectl get secret ereuna-secrets -n ereuna-prod &> /dev/null; then
            echo -e "${RED}⚠ Secrets not found!${NC}"
            echo "Please create secrets before deploying:"
            echo "  kubectl create secret generic ereuna-secrets --from-env-file=.env -n ereuna-prod"
            read -p "Press Enter when ready to continue..."
        fi
        
        # Deploy application
        echo -e "${YELLOW}Deploying Ereuna application...${NC}"
        kubectl apply -k k8s/overlays/production
        echo -e "${GREEN}✓ Application deployed${NC}"
        
        echo ""
        echo -e "${GREEN}Deployment complete! 🚀${NC}"
        echo ""
        echo "Next steps:"
        echo "1. Get LoadBalancer IP: kubectl get svc ingress-nginx-controller -n ingress-nginx"
        echo "2. Point your DNS A records to the LoadBalancer IP"
        echo "3. Wait for TLS certificates: kubectl get certificate -n ereuna-prod"
        echo "4. Check pod status: kubectl get pods -n ereuna-prod"
        ;;
    
    2)
        echo -e "${YELLOW}Installing prerequisites...${NC}"
        
        # NGINX Ingress
        read -p "Install NGINX Ingress Controller? (y/n): " install_nginx
        if [ "$install_nginx" = "y" ]; then
            helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx 2>/dev/null || true
            helm repo update
            helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
                --namespace ingress-nginx \
                --create-namespace \
                --set controller.service.type=LoadBalancer \
                --set controller.metrics.enabled=true \
                --wait
            echo -e "${GREEN}✓ NGINX Ingress installed${NC}"
        fi
        
        # cert-manager
        read -p "Install cert-manager? (y/n): " install_cert
        if [ "$install_cert" = "y" ]; then
            kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
            kubectl wait --for=condition=Available --timeout=300s deployment/cert-manager -n cert-manager
            echo -e "${GREEN}✓ cert-manager installed${NC}"
        fi
        
        # metrics-server
        read -p "Install metrics-server? (y/n): " install_metrics
        if [ "$install_metrics" = "y" ]; then
            kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
            echo -e "${GREEN}✓ metrics-server installed${NC}"
        fi
        ;;
    
    3)
        echo -e "${YELLOW}Deploying application...${NC}"
        kubectl apply -k k8s/overlays/production
        echo -e "${GREEN}✓ Application deployed${NC}"
        ;;
    
    4)
        echo -e "${YELLOW}Deploying monitoring stack...${NC}"
        kubectl apply -f k8s/monitoring/
        echo -e "${GREEN}✓ Monitoring stack deployed${NC}"
        ;;
    
    5)
        echo -e "${YELLOW}Updating application images...${NC}"
        read -p "Enter image tag (default: latest): " tag
        tag=${tag:-latest}
        
        kubectl set image deployment/frontend frontend=your-registry/ereuna-frontend:$tag -n ereuna-prod
        kubectl set image deployment/backend backend=your-registry/ereuna-backend:$tag -n ereuna-prod
        kubectl set image deployment/websocket websocket=your-registry/ereuna-websocket:$tag -n ereuna-prod
        kubectl set image deployment/aggregator aggregator=your-registry/ereuna-aggregator:$tag -n ereuna-prod
        kubectl set image deployment/ingestor ingestor=your-registry/ereuna-ingestor:$tag -n ereuna-prod
        
        echo -e "${GREEN}✓ Images updated${NC}"
        echo "Watching rollout status..."
        kubectl rollout status deployment/backend -n ereuna-prod
        ;;
    
    6)
        echo -e "${YELLOW}Deployment Status${NC}"
        echo ""
        echo "=== Pods ==="
        kubectl get pods -n ereuna-prod
        echo ""
        echo "=== Services ==="
        kubectl get svc -n ereuna-prod
        echo ""
        echo "=== Ingress ==="
        kubectl get ingress -n ereuna-prod
        echo ""
        echo "=== Certificates ==="
        kubectl get certificate -n ereuna-prod
        echo ""
        echo "=== HPA ==="
        kubectl get hpa -n ereuna-prod
        ;;
    
    7)
        echo -e "${RED}WARNING: This will delete everything!${NC}"
        read -p "Are you sure? Type 'yes' to confirm: " confirm
        if [ "$confirm" = "yes" ]; then
            kubectl delete -k k8s/overlays/production
            echo -e "${GREEN}✓ Everything deleted${NC}"
        else
            echo "Cancelled."
        fi
        ;;
    
    0)
        echo "Goodbye!"
        exit 0
        ;;
    
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac
