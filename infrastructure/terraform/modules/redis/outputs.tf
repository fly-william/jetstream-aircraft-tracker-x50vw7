# Redis module outputs exposing essential connection details
# Provider version: hashicorp/azurerm ~> 3.0

# Redis resource ID for reference by other modules
output "redis_id" {
  value       = azurerm_redis_cache.redis.id
  description = "The resource ID of the Redis Cache instance for reference by other modules and dependencies"
}

# Redis hostname for connection configuration
output "redis_hostname" {
  value       = azurerm_redis_cache.redis.hostname
  description = "The hostname of the Redis Cache instance for connection configuration and DNS resolution"
  sensitive   = true
}

# Redis SSL port for secure connections
output "redis_ssl_port" {
  value       = azurerm_redis_cache.redis.ssl_port
  description = "The SSL port number for secure TLS 1.2 encrypted Redis connections"
}

# Redis primary access key for authentication
output "redis_primary_access_key" {
  value       = azurerm_redis_cache.redis.primary_access_key
  description = "The primary access key for Redis Cache authentication and access control"
  sensitive   = true
}

# Complete Redis connection string with SSL configuration
output "redis_connection_string" {
  value = format(
    "rediss://%s:%s@%s:%d?ssl=true&tls_version=1.2",
    "default",
    azurerm_redis_cache.redis.primary_access_key,
    azurerm_redis_cache.redis.hostname,
    azurerm_redis_cache.redis.ssl_port
  )
  description = "Complete Redis connection string with TLS 1.2 configuration for secure application connections"
  sensitive   = true
}