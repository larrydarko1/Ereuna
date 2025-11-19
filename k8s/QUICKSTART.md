# Kubernetes Quick Reference

## Quick Deploy (When Ready)

```bash
# 1. Build and push images
export REGISTRY="your-dockerhub-username"
./k8s/build-and-push.sh

# 2. Create secrets
kubectl create secret generic ereuna-secrets --from-env-file=.env -n ereuna-prod

# 3. Deploy everything
./k8s/deploy.sh
# Choose option 1 (Full deployment)

# 4. Get LoadBalancer IP
kubectl get svc ingress-nginx-controller -n ingress-nginx

# 5. Update DNS to point to LoadBalancer IP
```

## Common Commands

```bash
# View all pods
kubectl get pods -n ereuna-prod

# View logs
kubectl logs -f deployment/backend -n ereuna-prod

# Restart deployment
kubectl rollout restart deployment/backend -n ereuna-prod

# Scale manually
kubectl scale deployment/frontend --replicas=5 -n ereuna-prod

# Port forward for debugging
kubectl port-forward svc/backend 5500:5500 -n ereuna-prod

# Execute into pod
kubectl exec -it <pod-name> -n ereuna-prod -- /bin/sh

# View resource usage
kubectl top pods -n ereuna-prod
kubectl top nodes

# Check ingress
kubectl get ingress -n ereuna-prod
kubectl describe ingress ereuna-ingress -n ereuna-prod

# Check TLS certificates
kubectl get certificate -n ereuna-prod
kubectl describe certificate ereuna-tls-cert -n ereuna-prod
```

## Troubleshooting

```bash
# Pod not starting
kubectl describe pod <pod-name> -n ereuna-prod
kubectl logs <pod-name> -n ereuna-prod

# Events
kubectl get events -n ereuna-prod --sort-by='.lastTimestamp'

# Test database connectivity
kubectl run -it --rm debug --image=busybox --restart=Never -n ereuna-prod -- nc -zv mongodb 27017

# Check cert-manager
kubectl logs -n cert-manager deployment/cert-manager
kubectl get challenges -n ereuna-prod

# View all resources
kubectl get all -n ereuna-prod
```

## Monitoring

```bash
# Grafana (via ingress)
https://grafana.ereuna.io

# Prometheus (port-forward)
kubectl port-forward -n ereuna-monitoring svc/prometheus 9090:9090
# Open: http://localhost:9090

# View metrics from exporters
kubectl port-forward -n ereuna-prod svc/mongodb-exporter 9216:9216
kubectl port-forward -n ereuna-prod svc/redis-exporter 9121:9121
```

## Updates

```bash
# Update single service
kubectl set image deployment/backend backend=$REGISTRY/ereuna-backend:v1.1.0 -n ereuna-prod
kubectl rollout status deployment/backend -n ereuna-prod

# Rollback
kubectl rollout undo deployment/backend -n ereuna-prod

# Update all services
./k8s/deploy.sh
# Choose option 5
```

## Backup

```bash
# MongoDB backup
kubectl exec -it mongodb-0 -n ereuna-prod -- mongodump --out=/tmp/backup --gzip
kubectl cp ereuna-prod/mongodb-0:/tmp/backup ./backup-$(date +%Y%m%d)

# Restore
kubectl cp ./backup mongodb-0:/tmp/restore -n ereuna-prod
kubectl exec -it mongodb-0 -n ereuna-prod -- mongorestore /tmp/restore --gzip
```

## Clean Up

```bash
# Delete everything
kubectl delete -k k8s/overlays/production

# Or use script
./k8s/deploy.sh
# Choose option 7
```

## Resource Requirements

**Minimum Cluster (Testing)**:
- 2 nodes: 4 vCPU, 8GB RAM each
- Total: ~$60-80/month

**Production Cluster (1000+ users)**:
- 3 nodes: 8 vCPU, 16GB RAM each  
- Total: ~$200-250/month

## When to Scale

**Add more nodes when**:
- Cluster CPU/memory >70% consistently
- Pods pending due to insufficient resources
- Need higher availability

**Scale up replicas when**:
- Individual pods hitting resource limits
- Response times increasing
- Traffic patterns show sustained growth

---

**Remember**: You don't need this yet! Use Docker Compose until you need multi-node scaling.
