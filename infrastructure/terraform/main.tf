# JetStream Platform Infrastructure Configuration
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
  backend "azurerm" {}
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy = false
      recover_soft_deleted_key_vaults = true
    }
  }
}

# Local variables for resource naming and tagging
locals {
  resource_prefix = "jetstream-${var.environment}"
  common_tags = {
    Project             = "JetStream"
    Environment         = var.environment
    ManagedBy          = "Terraform"
    SecurityLevel      = "High"
    ComplianceStatus   = "SOC2"
    DataClassification = "Sensitive"
  }
}

# Resource Groups
resource "azurerm_resource_group" "primary" {
  name     = "${local.resource_prefix}-${var.location}"
  location = var.location
  tags     = local.common_tags
}

resource "azurerm_resource_group" "secondary" {
  name     = "${local.resource_prefix}-${var.secondary_location}"
  location = var.secondary_location
  tags     = local.common_tags
}

# Log Analytics Workspace
resource "azurerm_log_analytics_workspace" "main" {
  name                = "${local.resource_prefix}-logs"
  location            = azurerm_resource_group.primary.location
  resource_group_name = azurerm_resource_group.primary.name
  sku                = "PerGB2018"
  retention_in_days   = var.retention_days

  tags = local.common_tags
}

# Virtual Network Configuration
resource "azurerm_virtual_network" "primary" {
  name                = "${local.resource_prefix}-vnet-primary"
  location            = azurerm_resource_group.primary.location
  resource_group_name = azurerm_resource_group.primary.name
  address_space       = ["10.0.0.0/16"]

  subnet {
    name           = "aks-subnet"
    address_prefix = "10.0.1.0/24"
  }

  subnet {
    name           = "db-subnet"
    address_prefix = "10.0.2.0/24"
  }

  subnet {
    name           = "redis-subnet"
    address_prefix = "10.0.3.0/24"
  }

  tags = local.common_tags
}

resource "azurerm_virtual_network" "secondary" {
  name                = "${local.resource_prefix}-vnet-secondary"
  location            = azurerm_resource_group.secondary.location
  resource_group_name = azurerm_resource_group.secondary.name
  address_space       = ["10.1.0.0/16"]

  subnet {
    name           = "aks-subnet"
    address_prefix = "10.1.1.0/24"
  }

  subnet {
    name           = "db-subnet"
    address_prefix = "10.1.2.0/24"
  }

  subnet {
    name           = "redis-subnet"
    address_prefix = "10.1.3.0/24"
  }

  tags = local.common_tags
}

# AKS Clusters
module "aks_primary" {
  source = "./modules/aks"

  cluster_name                = "${local.resource_prefix}-aks-primary"
  resource_group_name         = azurerm_resource_group.primary.name
  location                    = azurerm_resource_group.primary.location
  kubernetes_version          = var.aks_kubernetes_version
  node_size                  = var.aks_node_size
  min_node_count             = var.aks_min_node_count
  max_node_count             = var.aks_max_node_count
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  
  tags = local.common_tags
}

module "aks_secondary" {
  source = "./modules/aks"

  cluster_name                = "${local.resource_prefix}-aks-secondary"
  resource_group_name         = azurerm_resource_group.secondary.name
  location                    = azurerm_resource_group.secondary.location
  kubernetes_version          = var.aks_kubernetes_version
  node_size                  = var.aks_node_size
  min_node_count             = var.aks_min_node_count
  max_node_count             = var.aks_max_node_count
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  
  tags = local.common_tags
}

# Database Infrastructure
module "database_primary" {
  source = "./modules/database"

  resource_group_name = azurerm_resource_group.primary.name
  location           = azurerm_resource_group.primary.location
  environment        = var.environment
  postgresql_sku    = var.postgresql_sku
  
  network_rules = {
    delegated_subnet_id      = azurerm_virtual_network.primary.subnet.*.id[1]
    private_endpoint_enabled = true
    allowed_ip_ranges       = []
  }

  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  
  tags = local.common_tags
}

module "database_secondary" {
  source = "./modules/database"

  resource_group_name = azurerm_resource_group.secondary.name
  location           = azurerm_resource_group.secondary.location
  environment        = var.environment
  postgresql_sku    = var.postgresql_sku
  
  network_rules = {
    delegated_subnet_id      = azurerm_virtual_network.secondary.subnet.*.id[1]
    private_endpoint_enabled = true
    allowed_ip_ranges       = []
  }

  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  
  tags = local.common_tags
}

# Redis Cache Infrastructure
module "redis_primary" {
  source = "./modules/redis"

  redis_name           = "${local.resource_prefix}-redis-primary"
  resource_group_name  = azurerm_resource_group.primary.name
  location            = azurerm_resource_group.primary.location
  redis_sku           = var.redis_sku
  enable_clustering    = true
  enable_geo_replication = true
  subnet_id           = azurerm_virtual_network.primary.subnet.*.id[2]
  
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  
  tags = local.common_tags
}

module "redis_secondary" {
  source = "./modules/redis"

  redis_name           = "${local.resource_prefix}-redis-secondary"
  resource_group_name  = azurerm_resource_group.secondary.name
  location            = azurerm_resource_group.secondary.location
  redis_sku           = var.redis_sku
  enable_clustering    = true
  enable_geo_replication = true
  subnet_id           = azurerm_virtual_network.secondary.subnet.*.id[2]
  
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  
  tags = local.common_tags
}

# Outputs
output "resource_group_names" {
  value = {
    primary   = azurerm_resource_group.primary.name
    secondary = azurerm_resource_group.secondary.name
  }
  description = "Names of the deployed resource groups"
}

output "aks_cluster_ids" {
  value = {
    primary   = module.aks_primary.cluster_id
    secondary = module.aks_secondary.cluster_id
  }
  description = "IDs of the deployed AKS clusters"
}

output "database_endpoints" {
  value = {
    primary = {
      postgresql = module.database_primary.postgresql_server.fqdn
      timescaledb = module.database_primary.timescaledb_server.fqdn
    }
    secondary = {
      postgresql = module.database_secondary.postgresql_server.fqdn
      timescaledb = module.database_secondary.timescaledb_server.fqdn
    }
  }
  description = "Database endpoints for primary and secondary regions"
  sensitive   = true
}

output "redis_configuration" {
  value = {
    primary = {
      hostname = module.redis_primary.redis_hostname
      ssl_port = module.redis_primary.redis_ssl_port
    }
    secondary = {
      hostname = module.redis_secondary.redis_hostname
      ssl_port = module.redis_secondary.redis_ssl_port
    }
  }
  description = "Redis cache configuration for primary and secondary regions"
  sensitive   = true
}