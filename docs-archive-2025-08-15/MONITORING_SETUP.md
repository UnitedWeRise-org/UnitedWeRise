# Monitoring & Observability Setup for United We Rise

This document describes the comprehensive monitoring and observability infrastructure for the United We Rise platform.

## Overview

Our monitoring stack includes:
- **Application Metrics**: Custom business logic and performance metrics
- **System Metrics**: Server resource usage and performance
- **Health Checks**: Service availability and health status
- **Dashboards**: Visual monitoring and alerting via Grafana
- **Data Collection**: Prometheus for metrics storage and querying

## Quick Start

### 1. Start the Application
```bash
cd backend
npm run dev
```

### 2. Start Monitoring Stack
```bash
cd monitoring
docker-compose -f docker-compose.monitoring.yml up -d
```

### 3. Access Monitoring Services
- **Application Health**: http://localhost:3001/health
- **Prometheus Metrics**: http://localhost:3001/metrics
- **Prometheus UI**: http://localhost:9090
- **Grafana Dashboard**: http://localhost:3001 (admin/admin123)

## Application Metrics

### Endpoints Available

#### `/health` - Basic Health Check
Returns basic health status and key metrics:
```json
{
  "status": "healthy",
  "uptime": 3600,
  "database": "Connected",
  "websocket": "Active",
  "requests": {
    "total": 1250,
    "errors": 12,
    "errorRate": 0.96
  }
}
```

#### `/metrics` - Prometheus Format
Prometheus-compatible metrics endpoint for scraping.

#### `/api/metrics` - JSON Format
Structured JSON metrics for custom dashboards and applications.

#### `/api/health/detailed` - Comprehensive Health
Detailed system health including memory, CPU, database performance, and application metrics.

### Custom Application Metrics

The platform tracks:

#### User & Authentication Metrics
- `users_registered_total` - Total user registrations
- `auth_attempts_total` - Authentication attempts (success/failure)
- `auth_failures_total` - Failed authentication attempts
- `active_users` - Users active in the last hour

#### Content Metrics
- `posts_created_total` - Total posts created
- `comments_created_total` - Total comments created
- `emails_sent_total` - Emails sent by type
- `sms_sent_total` - SMS messages sent

#### Moderation Metrics
- `reports_submitted_total` - Reports submitted by type and target
- `pending_reports` - Current pending moderation reports
- `moderation_actions_total` - Moderation actions taken

#### System Performance
- `http_requests_total` - HTTP requests by method and status
- `http_errors_total` - HTTP errors by type
- `http_request_duration_seconds` - Request response times
- `database_queries_total` - Database queries by type
- `database_query_duration_seconds` - Database query performance

## Monitoring Dashboard

### Grafana Dashboard Features

1. **System Health Overview**
   - Service status indicators
   - Uptime tracking
   - Alert status

2. **Performance Monitoring**
   - Request rates and response times
   - Error rates with alerting
   - Database performance metrics

3. **User Activity Tracking**
   - Registration trends
   - Active user counts
   - Content creation rates

4. **Moderation Insights**
   - Report submission rates
   - Pending moderation queues
   - Moderation action tracking

5. **System Resource Monitoring**
   - Memory and CPU usage
   - Database connection pools
   - Container metrics (if using Docker)

### Setting Up Alerts

1. **High Error Rate Alert**
   - Triggers when error rate > 5% for 5 minutes
   - Configured in Grafana dashboard panel ID 3

2. **Service Down Alert**
   - Monitors service availability
   - Immediate notification on service failure

3. **Resource Usage Alerts**
   - Memory usage > 80%
   - CPU usage > 90% for 10 minutes

## Production Deployment

### Environment Variables

Set these environment variables for production monitoring:

```bash
NODE_ENV=production
METRICS_ENABLED=true
PROMETHEUS_PORT=9090
GRAFANA_PORT=3001
```

### Docker Compose Production

For production deployment, use:

```bash
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d
```

### Prometheus Configuration

Update `monitoring/prometheus.yml` for your production environment:
- Replace `host.docker.internal:3001` with your application host
- Add your domain names for external monitoring
- Configure retention periods based on storage capacity

## Metrics Integration Examples

### Adding Custom Business Metrics

```typescript
import { metricsService } from '../services/metricsService';

// Track custom events
metricsService.incrementCounter('custom_event_total', {
  event_type: 'user_action',
  category: 'engagement'
});

// Track performance metrics
const startTime = Date.now();
// ... perform operation
const duration = (Date.now() - startTime) / 1000;
metricsService.observeHistogram('custom_operation_duration_seconds', duration);

// Set gauge values
metricsService.setGauge('active_websocket_connections', connectionCount);
```

### Tracking Route Performance

Metrics are automatically tracked for all routes via middleware, but you can add custom tracking:

```typescript
router.post('/custom-endpoint', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Your business logic here
    const result = await performOperation();
    
    // Track successful operation
    metricsService.incrementCounter('custom_operation_success_total');
    
    res.json(result);
  } catch (error) {
    // Track failed operation
    metricsService.incrementCounter('custom_operation_error_total', {
      error_type: error.name
    });
    
    throw error;
  } finally {
    // Track operation duration
    const duration = (Date.now() - startTime) / 1000;
    metricsService.observeHistogram('custom_operation_duration_seconds', duration);
  }
});
```

## Troubleshooting

### Common Issues

1. **Metrics endpoint returns empty**
   - Check that metricsService is properly initialized
   - Verify middleware is added to Express app
   - Ensure metrics collection is running

2. **Grafana can't connect to Prometheus**
   - Verify Prometheus is running on port 9090
   - Check Docker network connectivity
   - Validate datasource configuration

3. **High memory usage in metrics service**
   - Metrics are automatically cleaned (1000 data points per metric)
   - Histogram data is cleaned every 5 minutes
   - Consider adjusting retention periods for high-traffic sites

### Performance Considerations

- Metrics collection adds minimal overhead (~1-2ms per request)
- Prometheus scraping occurs every 15 seconds by default
- Historical data is stored in Prometheus with 200h retention
- Consider increasing scrape intervals for high-traffic deployments

## Next Steps

1. **Extended Monitoring**
   - Add Alertmanager for advanced alerting
   - Implement distributed tracing with Jaeger
   - Set up log aggregation with ELK stack

2. **Advanced Analytics**
   - User journey tracking
   - Performance benchmarking
   - Capacity planning metrics

3. **Security Monitoring**
   - Failed login attempt tracking
   - Suspicious activity detection
   - Rate limiting effectiveness

For more information, see the [production deployment guide](./DEPLOYMENT.md) and [monitoring best practices](./docs/monitoring-best-practices.md).