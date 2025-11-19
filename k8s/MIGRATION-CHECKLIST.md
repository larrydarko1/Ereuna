# Kubernetes Migration Checklist

Use this checklist when you're ready to migrate from Docker Compose to Kubernetes.

## Pre-Migration (2-4 weeks before)

### Infrastructure Planning
- [ ] Choose Kubernetes provider (DigitalOcean, Linode, GKE, EKS, self-managed)
- [ ] Plan cluster size (start with 3 nodes: 1 control plane, 2 workers)
- [ ] Select node sizes based on current resource usage
- [ ] Budget approval for increased infrastructure costs
- [ ] Set up container registry (Docker Hub, GHCR, ECR, GCR)
- [ ] Plan DNS changes and downtime window

### Team Preparation
- [ ] Team members familiar with kubectl basics
- [ ] Access to Kubernetes cluster configured
- [ ] kubectl installed on all developer machines
- [ ] Helm installed (optional but recommended)
- [ ] Review Kubernetes documentation (k8s/README.md)

### Testing Environment
- [ ] Create staging Kubernetes cluster (smaller, cheaper)
- [ ] Test full deployment on staging
- [ ] Verify all services work correctly
- [ ] Test TLS certificate automation
- [ ] Load test the staging environment
- [ ] Document any issues and fixes

## Week Before Migration

### Image Preparation
- [ ] Set up container registry
- [ ] Update `k8s/overlays/production/kustomization.yaml` with registry details
- [ ] Build all Docker images
  ```bash
  export REGISTRY="your-registry"
  ./k8s/build-and-push.sh v1.0.0
  ```
- [ ] Verify all images pushed successfully
- [ ] Test images in staging cluster

### Secrets & Configuration
- [ ] Create Cloudflare API token for cert-manager
- [ ] Prepare all environment variables/secrets
- [ ] Test secret creation in staging:
  ```bash
  kubectl create secret generic ereuna-secrets --from-env-file=.env -n ereuna-prod
  ```
- [ ] Document all secrets needed
- [ ] Set up secret management strategy (sealed-secrets or external-secrets)

### Database Migration Plan
- [ ] Backup current MongoDB database
  ```bash
  mongodump --db=EreunaDB --out=backup-$(date +%Y%m%d)
  ```
- [ ] Test restore process
- [ ] Plan data migration strategy (dump/restore vs continuous sync)
- [ ] Estimate downtime needed for DB migration

### Monitoring Setup
- [ ] Review Grafana dashboards
- [ ] Configure alert rules in Prometheus
- [ ] Set up alerting channels (email, Slack, PagerDuty)
- [ ] Test monitoring stack in staging

### DNS & Network
- [ ] Prepare DNS changes
- [ ] Document current DNS configuration
- [ ] Lower DNS TTL to 300 seconds (5 minutes) a week before
- [ ] Prepare rollback DNS records

## Migration Day

### Pre-Migration (Maintenance Window Starts)

- [ ] Announce maintenance window to users
- [ ] Create final backup of production database
- [ ] Export current MongoDB data
  ```bash
  mongodump --db=EreunaDB --archive=final-backup.archive --gzip
  ```
- [ ] Save backup to multiple locations
- [ ] Document current system state
- [ ] Set Docker Compose to read-only mode (optional)

### Kubernetes Cluster Setup (30-60 minutes)

- [ ] Verify cluster is running
  ```bash
  kubectl cluster-info
  kubectl get nodes
  ```
- [ ] Install NGINX Ingress Controller
  ```bash
  ./k8s/deploy.sh  # Option 2
  ```
- [ ] Install cert-manager
- [ ] Install metrics-server
- [ ] Verify all components healthy

### Deploy Application (30-60 minutes)

- [ ] Create namespaces
  ```bash
  kubectl apply -f k8s/base/namespace.yaml
  ```
- [ ] Create secrets
  ```bash
  kubectl create secret generic cloudflare-api-token \
    --from-literal=api-token='YOUR_TOKEN' -n cert-manager
  kubectl create secret generic ereuna-secrets \
    --from-env-file=.env -n ereuna-prod
  ```
- [ ] Deploy ConfigMaps
  ```bash
  kubectl apply -f k8s/base/configmaps.yaml
  ```
- [ ] Deploy stateful services (MongoDB, Redis)
  ```bash
  kubectl apply -f k8s/base/mongodb-statefulset.yaml
  kubectl apply -f k8s/base/redis-statefulset.yaml
  ```
- [ ] Wait for databases to be ready
  ```bash
  kubectl wait --for=condition=Ready pod -l app=mongodb -n ereuna-prod --timeout=300s
  kubectl wait --for=condition=Ready pod -l app=redis -n ereuna-prod --timeout=300s
  ```
- [ ] Restore database backup
  ```bash
  kubectl cp final-backup.archive ereuna-prod/mongodb-0:/tmp/
  kubectl exec -it mongodb-0 -n ereuna-prod -- mongorestore --archive=/tmp/final-backup.archive --gzip
  ```
- [ ] Deploy application services
  ```bash
  kubectl apply -k k8s/overlays/production
  ```
- [ ] Wait for all pods to be ready
  ```bash
  kubectl get pods -n ereuna-prod -w
  ```

### DNS Cutover (5-10 minutes)

- [ ] Get LoadBalancer IP
  ```bash
  kubectl get svc ingress-nginx-controller -n ingress-nginx
  ```
- [ ] Update DNS A records:
  - ereuna.io → LoadBalancer IP
  - www.ereuna.io → LoadBalancer IP  
  - grafana.ereuna.io → LoadBalancer IP
- [ ] Wait for DNS propagation (check with `dig ereuna.io`)
- [ ] Test endpoints:
  ```bash
  curl -I https://ereuna.io
  curl -I https://grafana.ereuna.io
  ```

### TLS Certificate Setup (2-5 minutes)

- [ ] Verify cert-manager is issuing certificates
  ```bash
  kubectl get certificate -n ereuna-prod
  kubectl get challenges -n ereuna-prod
  ```
- [ ] Wait for certificates to be ready (usually 1-2 minutes)
- [ ] Test HTTPS endpoints
- [ ] Verify certificate details in browser

### Verification (15-30 minutes)

- [ ] Check all pods are running
  ```bash
  kubectl get pods -n ereuna-prod
  ```
- [ ] Check services are accessible
  ```bash
  kubectl get svc -n ereuna-prod
  ```
- [ ] Check ingress is working
  ```bash
  kubectl get ingress -n ereuna-prod
  ```
- [ ] Test frontend: https://ereuna.io
- [ ] Test API endpoints
- [ ] Test WebSocket connections
- [ ] Test user login/signup
- [ ] Test critical user flows
- [ ] Check monitoring dashboards: https://grafana.ereuna.io
- [ ] Verify logs are being collected
  ```bash
  kubectl logs -f deployment/backend -n ereuna-prod
  ```
- [ ] Check resource usage
  ```bash
  kubectl top pods -n ereuna-prod
  kubectl top nodes
  ```

### Monitoring & Alerts

- [ ] Verify Prometheus is scraping metrics
- [ ] Check Grafana dashboards showing data
- [ ] Test alert rules
- [ ] Set up on-call rotation
- [ ] Document escalation procedures

## Post-Migration (First 24-48 hours)

### Immediate Monitoring

- [ ] Monitor error rates closely
- [ ] Watch resource usage patterns
- [ ] Check for any pod restarts
  ```bash
  kubectl get pods -n ereuna-prod
  ```
- [ ] Monitor database performance
- [ ] Watch for certificate renewal issues
- [ ] Check logs for errors
  ```bash
  kubectl logs -f deployment/backend -n ereuna-prod | grep ERROR
  ```

### Performance Tuning

- [ ] Review HPA metrics and adjust thresholds if needed
- [ ] Adjust resource limits based on actual usage
- [ ] Fine-tune replica counts
- [ ] Optimize database queries if needed
- [ ] Review and adjust rate limits

### Documentation

- [ ] Document any issues encountered
- [ ] Update runbooks with actual timings
- [ ] Document any custom configurations
- [ ] Share post-mortem with team
- [ ] Update DNS TTL back to normal (3600+)

## Week After Migration

### Cleanup

- [ ] Verify no issues for 7 days
- [ ] Backup old Docker Compose data
- [ ] Archive Docker Compose configuration
- [ ] Decommission old VPS (if not using for staging)
- [ ] Cancel old infrastructure subscriptions
- [ ] Clean up old DNS records (if any)

### Optimization

- [ ] Review cost vs usage
- [ ] Optimize node sizes if needed
- [ ] Implement cost-saving measures (spot instances, etc.)
- [ ] Set up automated backups
- [ ] Configure long-term log retention
- [ ] Review and update monitoring alerts

### Team Training

- [ ] Conduct Kubernetes training session
- [ ] Share common kubectl commands
- [ ] Document deployment procedures
- [ ] Set up development workflows
- [ ] Update CI/CD pipelines

## Rollback Plan (If Needed)

If critical issues arise:

- [ ] Have old VPS still running during migration day
- [ ] Keep Docker Compose configuration ready
- [ ] Point DNS back to old VPS IP
- [ ] Restore database from backup if needed
- [ ] Document what went wrong
- [ ] Fix issues before retry

## Success Criteria

Migration is successful when:

- ✅ All pods running and healthy for 24+ hours
- ✅ No increase in error rates
- ✅ Response times within acceptable limits
- ✅ Zero data loss
- ✅ TLS certificates valid and auto-renewing
- ✅ Monitoring and alerting working
- ✅ Team comfortable with new workflow
- ✅ Users report no issues

---

**Estimated Total Migration Time**: 4-6 hours (with testing)  
**Recommended Maintenance Window**: 8 hours (with buffer)  
**Team Size Recommended**: 2-3 people

**Best Migration Time**: Weekend or low-traffic period

---

*Keep this checklist updated as you learn from staging tests!*
