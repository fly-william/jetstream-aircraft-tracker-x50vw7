# Azure Cache for Redis configuration for JetStream platform
# Provider: hashicorp/azurerm ~> 3.0

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

locals {
  redis_name = "${var.resource_name_prefix}-${var.environment}-redis"
  common_tags = {
    Project     = "JetStream"
    Environment = var.environment
    ManagedBy   = "Terraform"
    Component   = "Redis Cache"
  }
}

# Premium tier Redis Cache instance with clustering and high availability
resource "azurerm_redis_cache" "redis" {
  name                = local.redis_name
  location            = var.location
  resource_group_name = var.resource_group_name
  
  # Premium SKU required for clustering, geo-replication and advanced features
  sku_name            = "Premium"
  family              = "P"
  capacity            = var.redis_capacity

  # High availability configuration
  zones               = ["1", "2", "3"]
  shard_count         = var.enable_clustering ? 4 : 0
  
  # Security configuration
  enable_non_ssl_port = false
  minimum_tls_version = var.minimum_tls_version
  
  # Network configuration
  subnet_id           = var.subnet_id
  
  redis_configuration {
    # Memory management
    maxmemory_policy              = "volatile-lru"
    maxmemory_reserved           = 642
    maxmemory_delta              = 642
    maxfragmentationmemory_reserved = 642
    
    # Data persistence
    aof_backup_enabled = var.enable_aof_backup
    aof_storage_connection_string_0 = var.enable_aof_backup ? var.storage_connection_string : null
    
    # Security
    enable_authentication = true
  }

  # Maintenance window
  dynamic "patch_schedule" {
    for_each = var.patch_schedule
    content {
      day_of_week    = patch_schedule.value.day_of_week
      start_hour_utc = patch_schedule.value.start_hour_utc
    }
  }

  tags = merge(local.common_tags, var.tags)

  lifecycle {
    prevent_destroy = true
  }
}

# Private endpoint for secure access
resource "azurerm_private_endpoint" "redis_pe" {
  count               = var.private_endpoint_enabled ? 1 : 0
  name                = "${local.redis_name}-pe"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_id

  private_service_connection {
    name                           = "${local.redis_name}-psc"
    private_connection_resource_id = azurerm_redis_cache.redis.id
    is_manual_connection          = false
    subresource_names            = ["redisCache"]
  }

  tags = merge(local.common_tags, var.tags)
}

# Diagnostic settings for monitoring
resource "azurerm_monitor_diagnostic_setting" "redis_diagnostics" {
  name                       = "${local.redis_name}-diagnostics"
  target_resource_id         = azurerm_redis_cache.redis.id
  log_analytics_workspace_id = var.log_analytics_workspace_id

  metric {
    category = "AllMetrics"
    enabled  = true

    retention_policy {
      enabled = true
      days    = 30
    }
  }
}

# Outputs for Redis cache details
output "redis_id" {
  value       = azurerm_redis_cache.redis.id
  description = "The ID of the Redis Cache instance"
}

output "redis_hostname" {
  value       = azurerm_redis_cache.redis.hostname
  description = "The hostname of the Redis Cache instance"
  sensitive   = true
}

output "redis_ssl_port" {
  value       = azurerm_redis_cache.redis.ssl_port
  description = "The SSL port of the Redis Cache instance"
}

output "redis_primary_access_key" {
  value       = azurerm_redis_cache.redis.primary_access_key
  description = "The primary access key for the Redis Cache instance"
  sensitive   = true
}

output "redis_private_endpoint_ip" {
  value       = var.private_endpoint_enabled ? azurerm_private_endpoint.redis_pe[0].private_service_connection[0].private_ip_address : null
  description = "The private IP address of the Redis Cache private endpoint"
  sensitive   = true
}