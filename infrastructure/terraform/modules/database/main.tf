# Azure Database Module for JetStream Platform
# Provider versions:
# azurerm ~> 3.0
# random ~> 3.0

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

# Local variables for resource naming and tagging
locals {
  postgresql_name = "postgresql-${var.environment}-${random_string.suffix.result}"
  timescaledb_name = "timescaledb-${var.environment}-${random_string.suffix.result}"
  common_tags = {
    Project             = "JetStream"
    Environment         = var.environment
    ManagedBy          = "Terraform"
    Component          = "Database"
    ComplianceLevel    = "High"
    DataClassification = "Sensitive"
    BackupRequired     = "Yes"
  }
}

# Generate random suffix for database names
resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
  min_numeric = 2
}

# PostgreSQL Flexible Server for operational data
resource "azurerm_postgresql_flexible_server" "postgresql" {
  name                = local.postgresql_name
  resource_group_name = var.resource_group_name
  location            = var.location
  version            = var.postgresql_version
  
  sku_name           = var.postgresql_sku
  storage_mb         = var.postgresql_storage_mb
  zone_redundant     = true

  administrator_login    = var.administrator_login
  administrator_password = var.administrator_password

  backup_retention_days        = var.backup_retention_days
  geo_redundant_backup_enabled = var.geo_redundant_backup

  high_availability {
    mode                      = "ZoneRedundant"
    standby_availability_zone = "2"
  }

  maintenance_window {
    day_of_week  = 0
    start_hour   = 3
    start_minute = 0
  }

  authentication {
    active_directory_auth_enabled = true
    password_auth_enabled         = true
    tenant_id                     = data.azurerm_client_config.current.tenant_id
  }

  network_rules {
    delegated_subnet_id      = var.network_rules.delegated_subnet_id
    private_endpoint_enabled = var.network_rules.private_endpoint_enabled
    ip_rules                = var.network_rules.allowed_ip_ranges
  }

  customer_managed_key {
    key_vault_key_id                  = azurerm_key_vault_key.postgresql_cmk.id
    primary_user_assigned_identity_id = azurerm_user_assigned_identity.postgresql_identity.id
  }

  tags = local.common_tags
}

# TimescaleDB Server for position data
resource "azurerm_postgresql_flexible_server" "timescaledb" {
  name                = local.timescaledb_name
  resource_group_name = var.resource_group_name
  location            = var.location
  version            = var.postgresql_version
  
  sku_name           = var.postgresql_sku
  storage_mb         = var.postgresql_storage_mb
  zone_redundant     = true

  administrator_login    = var.administrator_login
  administrator_password = var.administrator_password

  backup_retention_days        = var.backup_retention_days
  geo_redundant_backup_enabled = var.geo_redundant_backup

  high_availability {
    mode                      = "ZoneRedundant"
    standby_availability_zone = "2"
  }

  maintenance_window {
    day_of_week  = 0
    start_hour   = 3
    start_minute = 0
  }

  authentication {
    active_directory_auth_enabled = true
    password_auth_enabled         = true
    tenant_id                     = data.azurerm_client_config.current.tenant_id
  }

  network_rules {
    delegated_subnet_id      = var.network_rules.delegated_subnet_id
    private_endpoint_enabled = var.network_rules.private_endpoint_enabled
    ip_rules                = var.network_rules.allowed_ip_ranges
  }

  customer_managed_key {
    key_vault_key_id                  = azurerm_key_vault_key.timescaledb_cmk.id
    primary_user_assigned_identity_id = azurerm_user_assigned_identity.timescaledb_identity.id
  }

  tags = local.common_tags
}

# Database extensions and configurations for TimescaleDB
resource "azurerm_postgresql_flexible_server_configuration" "timescaledb_extensions" {
  server_id = azurerm_postgresql_flexible_server.timescaledb.id
  name      = "shared_preload_libraries"
  value     = "timescaledb"
}

# Audit logging configuration for both servers
resource "azurerm_monitor_diagnostic_setting" "postgresql_audit" {
  name                       = "postgresql-audit-${var.environment}"
  target_resource_id         = azurerm_postgresql_flexible_server.postgresql.id
  log_analytics_workspace_id = var.log_analytics_workspace_id

  log {
    category = "PostgreSQLLogs"
    enabled  = true
    retention_policy {
      enabled = true
      days    = 365
    }
  }

  metric {
    category = "AllMetrics"
    enabled  = true
    retention_policy {
      enabled = true
      days    = 365
    }
  }
}

resource "azurerm_monitor_diagnostic_setting" "timescaledb_audit" {
  name                       = "timescaledb-audit-${var.environment}"
  target_resource_id         = azurerm_postgresql_flexible_server.timescaledb.id
  log_analytics_workspace_id = var.log_analytics_workspace_id

  log {
    category = "PostgreSQLLogs"
    enabled  = true
    retention_policy {
      enabled = true
      days    = 365
    }
  }

  metric {
    category = "AllMetrics"
    enabled  = true
    retention_policy {
      enabled = true
      days    = 365
    }
  }
}

# Outputs for database resources
output "postgresql_server" {
  description = "PostgreSQL server resource with high availability configuration"
  value = {
    id                = azurerm_postgresql_flexible_server.postgresql.id
    name              = azurerm_postgresql_flexible_server.postgresql.name
    fqdn              = azurerm_postgresql_flexible_server.postgresql.fqdn
    high_availability = azurerm_postgresql_flexible_server.postgresql.high_availability
  }
  sensitive = true
}

output "timescaledb_server" {
  description = "TimescaleDB server resource with high availability configuration"
  value = {
    id                = azurerm_postgresql_flexible_server.timescaledb.id
    name              = azurerm_postgresql_flexible_server.timescaledb.name
    fqdn              = azurerm_postgresql_flexible_server.timescaledb.fqdn
    high_availability = azurerm_postgresql_flexible_server.timescaledb.high_availability
  }
  sensitive = true
}