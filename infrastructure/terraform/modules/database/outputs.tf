# Database module outputs exposing PostgreSQL and TimescaleDB resource information
# Provider version: azurerm ~> 3.0

# PostgreSQL Server Outputs
output "postgresql_server_id" {
  description = "Resource ID of the PostgreSQL Flexible Server for operational data"
  value       = azurerm_postgresql_flexible_server.postgresql.id
  sensitive   = false
}

output "postgresql_server_name" {
  description = "Name of the PostgreSQL Flexible Server for operational data"
  value       = azurerm_postgresql_flexible_server.postgresql.name
  sensitive   = false
}

output "postgresql_server_fqdn" {
  description = "Fully qualified domain name of the PostgreSQL server for operational data"
  value       = azurerm_postgresql_flexible_server.postgresql.fqdn
  sensitive   = false
}

# TimescaleDB Server Outputs
output "timescaledb_server_id" {
  description = "Resource ID of the TimescaleDB Flexible Server for position data"
  value       = azurerm_postgresql_flexible_server.timescaledb.id
  sensitive   = false
}

output "timescaledb_server_name" {
  description = "Name of the TimescaleDB Flexible Server for position data"
  value       = azurerm_postgresql_flexible_server.timescaledb.name
  sensitive   = false
}

output "timescaledb_server_fqdn" {
  description = "Fully qualified domain name of the TimescaleDB server for position data"
  value       = azurerm_postgresql_flexible_server.timescaledb.fqdn
  sensitive   = false
}

# Secure Connection Strings
output "postgresql_connection_string" {
  description = "Secure connection string for the operational database with all required parameters"
  value       = "postgresql://${azurerm_postgresql_flexible_server.postgresql.administrator_login}@${azurerm_postgresql_flexible_server.postgresql.name}:${azurerm_postgresql_flexible_server.postgresql.administrator_password}@${azurerm_postgresql_flexible_server.postgresql.fqdn}:5432/jetstream_ops?sslmode=require"
  sensitive   = true
}

output "timescaledb_connection_string" {
  description = "Secure connection string for the time-series database with all required parameters"
  value       = "postgresql://${azurerm_postgresql_flexible_server.timescaledb.administrator_login}@${azurerm_postgresql_flexible_server.timescaledb.name}:${azurerm_postgresql_flexible_server.timescaledb.administrator_password}@${azurerm_postgresql_flexible_server.timescaledb.fqdn}:5432/jetstream_positions?sslmode=require"
  sensitive   = true
}

# Database Endpoints Map
output "database_endpoints" {
  description = "Map of database endpoints for application configuration and service discovery"
  value = {
    operational = azurerm_postgresql_flexible_server.postgresql.fqdn
    timeseries  = azurerm_postgresql_flexible_server.timescaledb.fqdn
    region      = var.location
    port        = "5432"
  }
  sensitive = false
}

# Monitoring Endpoints
output "monitoring_endpoints" {
  description = "Database monitoring endpoints for metrics collection and health checks"
  value = {
    postgresql_metrics  = "${azurerm_postgresql_flexible_server.postgresql.fqdn}:9187"
    timescaledb_metrics = "${azurerm_postgresql_flexible_server.timescaledb.fqdn}:9187"
    health_check_port   = "5432"
  }
  sensitive = false
}

# High Availability Configuration
output "high_availability_status" {
  description = "High availability configuration status for both database servers"
  value = {
    postgresql = {
      mode                      = azurerm_postgresql_flexible_server.postgresql.high_availability[0].mode
      standby_availability_zone = azurerm_postgresql_flexible_server.postgresql.high_availability[0].standby_availability_zone
    }
    timescaledb = {
      mode                      = azurerm_postgresql_flexible_server.timescaledb.high_availability[0].mode
      standby_availability_zone = azurerm_postgresql_flexible_server.timescaledb.high_availability[0].standby_availability_zone
    }
  }
  sensitive = false
}