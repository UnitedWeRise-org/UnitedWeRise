#!/bin/bash
set -e

# Production deployment script for United We Rise
# This script handles the complete deployment process

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"
BACKUP_BEFORE_DEPLOY=true
HEALTH_CHECK_TIMEOUT=300
ROLLBACK_ON_FAILURE=true

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed"
        exit 1
    fi
    
    if [ ! -f "$ENV_FILE" ]; then
        error "Environment file $ENV_FILE not found"
        error "Please copy .env.production.example to .env.production and configure it"
        exit 1
    fi
    
    log "Prerequisites check passed"
}

# Create backup before deployment
create_backup() {
    if [ "$BACKUP_BEFORE_DEPLOY" = true ]; then
        log "Creating backup before deployment..."
        
        if docker-compose -f $COMPOSE_FILE ps postgres | grep -q "Up"; then
            docker-compose -f $COMPOSE_FILE exec -T backup /usr/local/bin/backup.sh
            log "Backup completed"
        else
            warn "Database not running, skipping backup"
        fi
    fi
}

# Pull latest images
pull_images() {
    log "Pulling latest Docker images..."
    docker-compose -f $COMPOSE_FILE pull
}

# Build custom images
build_images() {
    log "Building application images..."
    docker-compose -f $COMPOSE_FILE build --no-cache
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    
    # Wait for database to be ready
    log "Waiting for database to be ready..."
    for i in {1..30}; do
        if docker-compose -f $COMPOSE_FILE exec -T postgres pg_isready -U ${DATABASE_USER} -d ${DATABASE_NAME}; then
            break
        fi
        sleep 2
        
        if [ $i -eq 30 ]; then
            error "Database failed to start"
            return 1
        fi
    done
    
    # Run migrations
    docker-compose -f $COMPOSE_FILE exec -T backend npx prisma migrate deploy
    docker-compose -f $COMPOSE_FILE exec -T backend npx prisma generate
    
    log "Database migrations completed"
}

# Start services
start_services() {
    log "Starting services..."
    docker-compose -f $COMPOSE_FILE up -d
    
    log "Services started, waiting for health checks..."
}

# Health check
health_check() {
    log "Performing health checks..."
    
    local start_time=$(date +%s)
    local timeout=$HEALTH_CHECK_TIMEOUT
    
    # Check backend health
    while true; do
        if curl -f -s http://localhost/api/health > /dev/null; then
            log "Backend health check passed"
            break
        fi
        
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))
        
        if [ $elapsed -gt $timeout ]; then
            error "Backend health check failed after ${timeout}s"
            return 1
        fi
        
        sleep 5
    done
    
    # Check frontend
    if curl -f -s http://localhost/health > /dev/null; then
        log "Frontend health check passed"
    else
        error "Frontend health check failed"
        return 1
    fi
    
    # Check database
    if docker-compose -f $COMPOSE_FILE exec -T postgres pg_isready -U ${DATABASE_USER} -d ${DATABASE_NAME}; then
        log "Database health check passed"
    else
        error "Database health check failed"
        return 1
    fi
    
    log "All health checks passed"
}

# Rollback function
rollback() {
    error "Deployment failed, rolling back..."
    
    # Stop current containers
    docker-compose -f $COMPOSE_FILE down
    
    # TODO: Restore from backup if needed
    warn "Please manually restore from backup if necessary"
    
    exit 1
}

# Cleanup old images and containers
cleanup() {
    log "Cleaning up old Docker images and containers..."
    
    # Remove unused containers
    docker container prune -f
    
    # Remove unused images (keep last 3 versions)
    docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.ID}}\t{{.CreatedAt}}" | \
    grep unitedwerise | \
    tail -n +4 | \
    awk '{print $3}' | \
    xargs -r docker rmi || true
    
    # Remove unused volumes (be careful with this)
    # docker volume prune -f
    
    log "Cleanup completed"
}

# Main deployment function
deploy() {
    log "Starting United We Rise production deployment..."
    
    # Set error handling for rollback
    if [ "$ROLLBACK_ON_FAILURE" = true ]; then
        trap rollback ERR
    fi
    
    # Pre-deployment checks
    check_prerequisites
    create_backup
    
    # Deployment steps
    pull_images
    build_images
    
    # Start infrastructure services first
    log "Starting infrastructure services..."
    docker-compose -f $COMPOSE_FILE up -d postgres redis
    
    # Wait for infrastructure to be ready
    sleep 10
    
    # Run migrations
    run_migrations
    
    # Start all services
    start_services
    
    # Health checks
    sleep 15
    health_check
    
    # Cleanup
    cleanup
    
    log "🎉 Deployment completed successfully!"
    log "Application is now running at: $FRONTEND_URL"
    log "Admin panel: https://admin.unitedwerise.com"
    log "Monitoring: http://localhost:3100 (Grafana)"
    
    # Show service status
    log "Service status:"
    docker-compose -f $COMPOSE_FILE ps
}

# Script options
case "${1:-deploy}" in
    "deploy")
        deploy
        ;;
    "rollback")
        rollback
        ;;
    "backup")
        create_backup
        ;;
    "health")
        health_check
        ;;
    "logs")
        docker-compose -f $COMPOSE_FILE logs -f ${2:-backend}
        ;;
    "status")
        docker-compose -f $COMPOSE_FILE ps
        ;;
    "stop")
        log "Stopping services..."
        docker-compose -f $COMPOSE_FILE down
        ;;
    "restart")
        log "Restarting services..."
        docker-compose -f $COMPOSE_FILE restart ${2:-}
        ;;
    *)
        echo "Usage: $0 {deploy|rollback|backup|health|logs|status|stop|restart}"
        echo ""
        echo "Commands:"
        echo "  deploy   - Full production deployment (default)"
        echo "  rollback - Rollback deployment"
        echo "  backup   - Create database backup"
        echo "  health   - Run health checks"
        echo "  logs     - Show service logs (specify service name as 2nd arg)"
        echo "  status   - Show service status"
        echo "  stop     - Stop all services"
        echo "  restart  - Restart services (specify service name as 2nd arg)"
        exit 1
        ;;
esac