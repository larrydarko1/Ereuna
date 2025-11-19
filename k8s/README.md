# Ereuna Kubernetes Deployment Guide

## 📋 Overview

This directory contains production-ready Kubernetes manifests for deploying Ereuna when you're ready to scale horizontally across multiple nodes.

**Current Status**: Docker Compose (Single Node) ✅  
**Future Ready**: Kubernetes (Multi-Node) 🚀

## 🏗️ Architecture

### Components

- **Frontend**: Vue.js/Vite application (NGINX)
- **Backend**: Node.js/Express API
- **WebSocket**: Python/FastAPI real-time service
- **Aggregator**: Python worker service
- **Ingestor**: Python data ingestion service
- **MongoDB**: StatefulSet with persistent storage
- **Redis**: StatefulSet for caching
- **Monitoring**: Prometheus, Grafana, Loki stack
- **Ingress**: NGINX Ingress Controller with automatic TLS

## 📁 Directory Structure

```
k8s/
├── base/                           # Base manifests
│   ├── namespace.yaml              # Namespaces (ereuna-prod, ereuna-monitoring)
│   ├── secrets.yaml                # Secrets template (DO NOT commit real secrets)
│   ├── configmaps.yaml             # ConfigMaps for Prometheus, Loki, NGINX
│   ├── mongodb-statefulset.yaml    # MongoDB with persistent storage
│   ├── redis-statefulset.yaml      # Redis with persistence
│   ├── frontend-deployment.yaml    # Frontend deployment + service
│   ├── backend-deployment.yaml     # Backend deployment + service
│   ├── websocket-deployment.yaml   # WebSocket deployment + service
│   ├── aggregator-deployment.yaml  # Aggregator deployment + service
│   ├── ingestor-deployment.yaml    # Ingestor deployment + service
│   ├── ingress.yaml                # NGINX Ingress with TLS
│   ├── hpa.yaml                    # Horizontal Pod Autoscalers
│   └── network-policies.yaml       # Network security policies
├── monitoring/                     # Monitoring stack
│   ├── prometheus.yaml             # Prometheus with RBAC
│   ├── grafana.yaml                # Grafana dashboard
│   ├── loki.yaml                   # Loki log aggregation + Promtail
│   └── exporters.yaml              # MongoDB & Redis exporters
├── overlays/
│   └── production/                 # Production environment
│       ├── kustomization.yaml      # Kustomize config
│       ├── replicas-patch.yaml     # Production replica counts
│       └── resources-patch.yaml    # Production resource limits
└── README.md                       # This file
```

## 🔧 Prerequisites

### When to Migrate

✅ **Migrate to Kubernetes when:**
- You need 2+ physical servers (VPS nodes)
- Traffic exceeds 1000 concurrent users consistently
- Require true high availability
- Need geographic distribution
- Want automated horizontal scaling

❌ **Stay with Docker Compose if:**
- Single VPS is sufficient
- Traffic is under 1000 concurrent users
- Resource overhead matters
- Simplicity is preferred

### Required Tools

1. **Kubernetes Cluster** (one of):
   - Managed: DigitalOcean Kubernetes, Linode LKE, GKE, EKS, AKS
   - Self-managed: kubeadm, k3s, RKE2
   - Minimum: 3 nodes (1 control plane, 2 workers)

2. **kubectl** (Kubernetes CLI):
   ```bash
   # macOS
   brew install kubectl
   
   # Verify
   kubectl version --client
   ```

3. **Helm** (package manager):
   ```bash
   # macOS
   brew install helm
   ```

4. **Container Registry**:
   - Docker Hub (free)
   - GitHub Container Registry
   - Google Container Registry (GCR)
   - AWS ECR
   - Or private registry

5. **DNS Access**:
   - Cloudflare account with API token
   - Domain pointing to cluster ingress

## 🚀 Deployment Steps

### 1. Prepare Container Images

Build and push your Docker images:

```bash
# Set your registry (replace with your registry)
export REGISTRY="your-dockerhub-username"
# or: export REGISTRY="ghcr.io/your-github-username"

# Build and push all images
docker build -f docker/Dockerfile.frontend -t $REGISTRY/ereuna-frontend:latest .
docker build -f docker/Dockerfile.backend -t $REGISTRY/ereuna-backend:latest .
docker build -f docker/Dockerfile.websocket -t $REGISTRY/ereuna-websocket:latest .
docker build -f docker/Dockerfile.aggregator -t $REGISTRY/ereuna-aggregator:latest .
docker build -f docker/Dockerfile.ingestor -t $REGISTRY/ereuna-ingestor:latest .

docker push $REGISTRY/ereuna-frontend:latest
docker push $REGISTRY/ereuna-backend:latest
docker push $REGISTRY/ereuna-websocket:latest
docker push $REGISTRY/ereuna-aggregator:latest
docker push $REGISTRY/ereuna-ingestor:latest
```

### 2. Update Image References

Edit `k8s/overlays/production/kustomization.yaml` and replace `your-registry` with your actual registry:

```yaml
images:
  - name: your-registry/ereuna-frontend
    newName: your-dockerhub-username/ereuna-frontend
    newTag: latest
  # ... repeat for all images
```

### 3. Install Required Components

#### Install NGINX Ingress Controller

```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.type=LoadBalancer \
  --set controller.metrics.enabled=true \
  --set controller.podAnnotations."prometheus\.io/scrape"=true \
  --set controller.podAnnotations."prometheus\.io/port"=10254
```

#### Install cert-manager (for automatic TLS)

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Wait for cert-manager to be ready
kubectl wait --for=condition=Available --timeout=300s \
  deployment/cert-manager -n cert-manager
```

#### Install Metrics Server (for HPA)

```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

### 4. Configure Secrets

**IMPORTANT**: Never commit real secrets to Git!

```bash
# Create Cloudflare API token secret for cert-manager
kubectl create secret generic cloudflare-api-token \
  --from-literal=api-token='YOUR_CLOUDFLARE_API_TOKEN' \
  -n cert-manager

# Create application secrets from your .env file
kubectl create secret generic ereuna-secrets \
  --from-literal=STRIPE_SECRET_KEY='your-key' \
  --from-literal=VITE_STRIPE_PUBLISHABLE_KEY='your-key' \
  --from-literal=MONGODB_URI='mongodb://mongodb:27017/EreunaDB' \
  --from-literal=TIINGO_KEY='your-key' \
  --from-literal=VITE_EREUNA_KEY='your-key' \
  --from-literal=JWT_SECRET='your-secret' \
  -n ereuna-prod

# Create Grafana secrets
kubectl create secret generic grafana-secrets \
  --from-literal=admin-user='BigDaddyDarko69' \
  --from-literal=admin-password='YOUR_GRAFANA_PASSWORD' \
  -n ereuna-monitoring
```

Or use the template (remember to update values):

```bash
# Edit k8s/base/secrets.yaml with your actual values
# Then apply (NOT recommended for production - use sealed-secrets or external-secrets)
kubectl apply -f k8s/base/secrets.yaml
```

### 5. Update Ingress Configuration

Edit `k8s/base/ingress.yaml`:
- Replace `l47115956@gmail.com` with your email
- Update domain names if different from `ereuna.io`

### 6. Deploy to Kubernetes

Using Kustomize (recommended):

```bash
# Preview what will be deployed
kubectl kustomize k8s/overlays/production

# Deploy everything
kubectl apply -k k8s/overlays/production

# Watch deployment progress
kubectl get pods -n ereuna-prod -w
kubectl get pods -n ereuna-monitoring -w
```

Or deploy components individually:

```bash
# Namespaces
kubectl apply -f k8s/base/namespace.yaml

# ConfigMaps
kubectl apply -f k8s/base/configmaps.yaml

# Stateful services (MongoDB, Redis)
kubectl apply -f k8s/base/mongodb-statefulset.yaml
kubectl apply -f k8s/base/redis-statefulset.yaml

# Wait for databases to be ready
kubectl wait --for=condition=Ready pod -l app=mongodb -n ereuna-prod --timeout=300s
kubectl wait --for=condition=Ready pod -l app=redis -n ereuna-prod --timeout=300s

# Application services
kubectl apply -f k8s/base/backend-deployment.yaml
kubectl apply -f k8s/base/frontend-deployment.yaml
kubectl apply -f k8s/base/websocket-deployment.yaml
kubectl apply -f k8s/base/aggregator-deployment.yaml
kubectl apply -f k8s/base/ingestor-deployment.yaml

# Monitoring stack
kubectl apply -f k8s/monitoring/

# Ingress and networking
kubectl apply -f k8s/base/ingress.yaml
kubectl apply -f k8s/base/network-policies.yaml

# Autoscaling
kubectl apply -f k8s/base/hpa.yaml
```

### 7. Configure DNS

Get the LoadBalancer IP:

```bash
kubectl get svc ingress-nginx-controller -n ingress-nginx
```

Point your DNS A records to this IP:
- `ereuna.io` → `<LOAD_BALANCER_IP>`
- `www.ereuna.io` → `<LOAD_BALANCER_IP>`
- `grafana.ereuna.io` → `<LOAD_BALANCER_IP>`

### 8. Verify Deployment

```bash
# Check all pods are running
kubectl get pods -n ereuna-prod
kubectl get pods -n ereuna-monitoring

# Check ingress
kubectl get ingress -n ereuna-prod

# Check TLS certificates (wait for cert-manager)
kubectl get certificate -n ereuna-prod

# Check logs
kubectl logs -f deployment/backend -n ereuna-prod
kubectl logs -f deployment/frontend -n ereuna-prod

# Test endpoints
curl https://ereuna.io
curl https://grafana.ereuna.io
```

## 📊 Monitoring

Access monitoring dashboards:

- **Grafana**: https://grafana.ereuna.io
  - Username: `BigDaddyDarko69`
  - Password: (from secret)
  
- **Prometheus**: Port-forward to access
  ```bash
  kubectl port-forward -n ereuna-monitoring svc/prometheus 9090:9090
  # Open: http://localhost:9090
  ```

## 🔄 Updates and Rollouts

### Update application images

```bash
# Build new version
docker build -f docker/Dockerfile.backend -t $REGISTRY/ereuna-backend:v1.1.0 .
docker push $REGISTRY/ereuna-backend:v1.1.0

# Update deployment
kubectl set image deployment/backend backend=$REGISTRY/ereuna-backend:v1.1.0 -n ereuna-prod

# Watch rollout
kubectl rollout status deployment/backend -n ereuna-prod

# Rollback if needed
kubectl rollout undo deployment/backend -n ereuna-prod
```

### Scale manually

```bash
# Scale frontend to 5 replicas
kubectl scale deployment/frontend --replicas=5 -n ereuna-prod

# Or edit HPA for automatic scaling
kubectl edit hpa frontend-hpa -n ereuna-prod
```

## 🛡️ Security Features

- ✅ Network Policies (default deny, explicit allow)
- ✅ TLS encryption (automatic via cert-manager)
- ✅ Secret management (Kubernetes Secrets)
- ✅ RBAC for service accounts
- ✅ Pod Security Standards
- ✅ Resource limits and requests
- ✅ ReadOnly root filesystems (where applicable)
- ✅ Non-root container users

## 💾 Backup and Restore

### Backup MongoDB

```bash
# Create backup job
kubectl run mongodb-backup --rm -i --restart=Never \
  --image=mongo:latest \
  --namespace=ereuna-prod \
  --command -- mongodump --host=mongodb --out=/backup --gzip

# Or use CronJob for automated backups
```

### Backup Persistent Volumes

```bash
# Snapshot PVCs (if your storage class supports it)
kubectl get pvc -n ereuna-prod
# Use your cloud provider's snapshot tools
```

## 🐛 Troubleshooting

### Pods not starting

```bash
# Check pod status
kubectl describe pod <pod-name> -n ereuna-prod

# Check logs
kubectl logs <pod-name> -n ereuna-prod

# Check events
kubectl get events -n ereuna-prod --sort-by='.lastTimestamp'
```

### Database connection issues

```bash
# Check MongoDB is running
kubectl get pods -l app=mongodb -n ereuna-prod

# Test connectivity
kubectl run -it --rm debug --image=busybox --restart=Never -n ereuna-prod -- nc -zv mongodb 27017
```

### TLS certificate issues

```bash
# Check certificate status
kubectl describe certificate ereuna-tls-cert -n ereuna-prod

# Check cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager

# Check challenge status
kubectl get challenges -n ereuna-prod
```

## 📈 Scaling Guidelines

### Horizontal Scaling (Add More Pods)

Automatic via HPA based on CPU/Memory:
- **Frontend**: 2-10 pods
- **Backend**: 2-10 pods  
- **WebSocket**: 2-8 pods
- **Aggregator**: 1-5 pods

### Vertical Scaling (Bigger Pods)

Edit resource limits in `k8s/overlays/production/resources-patch.yaml`

### Cluster Scaling (Add More Nodes)

Use your cloud provider's cluster autoscaler or add nodes manually.

## 💰 Cost Estimation

**Minimum viable K8s setup**:
- Managed K8s control plane: $20/month
- 2x worker nodes (4 vCPU, 8GB each): $60/month
- Load Balancer: $10/month
- Storage (100GB): $10/month
- **Total**: ~$100/month

**Recommended for 1000+ users**:
- 3x worker nodes (8 vCPU, 16GB each): $180/month
- **Total**: ~$210/month

## 🔗 Useful Commands

```bash
# Get all resources
kubectl get all -n ereuna-prod

# Exec into pod
kubectl exec -it <pod-name> -n ereuna-prod -- /bin/sh

# Port-forward service
kubectl port-forward svc/backend 5500:5500 -n ereuna-prod

# View resource usage
kubectl top pods -n ereuna-prod
kubectl top nodes

# Stream logs
kubectl logs -f deployment/backend -n ereuna-prod --tail=100

# Delete everything
kubectl delete -k k8s/overlays/production
```

## 📚 Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/)
- [cert-manager Documentation](https://cert-manager.io/docs/)
- [Kustomize](https://kustomize.io/)
- [Helm Charts](https://helm.sh/)

## 🆘 Support

For issues or questions:
1. Check pod logs: `kubectl logs <pod> -n ereuna-prod`
2. Check events: `kubectl get events -n ereuna-prod`
3. Review this README
4. Check Kubernetes documentation

---

**Remember**: You don't need to use this yet! Stick with Docker Compose until you need multi-node horizontal scaling. This is here for when you're ready. 🚀
