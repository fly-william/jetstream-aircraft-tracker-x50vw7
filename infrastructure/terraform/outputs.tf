# JetStream Platform Infrastructure Outputs
# Version: 1.0.0

# Resource Group Outputs
output "resource_groups" {
  description = "Map of resource groups with enhanced metadata"
  value = {
    for rg in azurerm_resource_group.main : rg.name => {
      name     = rg.name
      location = rg.location
      tags     = rg.tags
      purpose  = "JetStream Platform Infrastructure"
    }
  }
}

# AKS Cluster Outputs
output "aks_clusters" {
  description = "Comprehensive AKS cluster details including security and monitoring configurations"
  value = {
    for cluster in module.aks : cluster.cluster_id => {
      cluster_id = cluster.cluster_id
      fqdn      = cluster.cluster_fqdn
      node_pools = {
        default = {
          vm_size     = var.aks_node_size
          node_count  = var.aks_min_node_count
          auto_scale  = true
          min_count   = var.aks_min_node_count
          max_count   = var.aks_max_node_count
        }
      }
      security_config = cluster.cluster_security_config
      monitoring_endpoints = cluster.monitoring_config
    }
  }
  sensitive = true
}

# Database Endpoints Output
output "database_endpoints" {
  description = "Enhanced database endpoint information including failover and security details"
  value = {
    postgresql = {
      server_name = module.database.postgresql_server_name
      connection_string = module.database.connection_strings.postgresql
      failover_group = module.database.failover_groups.postgresql
      security_config = module.database.security_config.postgresql
    }
    timescaledb = {
      server_name = module.database.timescaledb_server_name
      connection_string = module.database.connection_strings.timescaledb
      failover_group = module.database.failover_groups.timescaledb
      security_config = module.database.security_config.timescaledb
    }
  }
  sensitive = true
}

# Redis Cache Configuration Output
output "redis_configuration" {
  description = "Detailed Redis cache configuration including cluster and security settings"
  value = {
    primary = {
      hostname = module.redis.redis_cache_hostname
      connection_string = module.redis.redis_connection_string
      cluster_config = module.redis.cluster_config
      security_settings = module.redis.security_settings
    }
    secondary = {
      hostname = module.redis_secondary.redis_cache_hostname
      connection_string = module.redis_secondary.redis_connection_string
      cluster_config = module.redis_secondary.cluster_config
      security_settings = module.redis_secondary.security_settings
    }
  }
  sensitive = true
}

# Kubernetes Configuration Output
output "kube_config" {
  description = "Enhanced Kubernetes configuration including security context and access credentials"
  value = {
    primary = {
      config = module.aks.kube_config
      security_context = {
        cluster_ca_certificate = module.aks.cluster_ca_certificate
        client_certificate     = module.aks.client_certificate
        client_key            = module.aks.client_key
      }
      access_credentials = {
        service_principal_id     = module.aks.service_principal_id
        service_principal_secret = module.aks.service_principal_secret
      }
    }
    secondary = {
      config = module.aks_secondary.kube_config
      security_context = {
        cluster_ca_certificate = module.aks_secondary.cluster_ca_certificate
        client_certificate     = module.aks_secondary.client_certificate
        client_key            = module.aks_secondary.client_key
      }
      access_credentials = {
        service_principal_id     = module.aks_secondary.service_principal_id
        service_principal_secret = module.aks_secondary.service_principal_secret
      }
    }
  }
  sensitive = true
}

# Network Configuration Output
output "network_config" {
  description = "Network configuration details including VNet and subnet information"
  value = {
    vnet = {
      name          = azurerm_virtual_network.main.name
      address_space = azurerm_virtual_network.main.address_space
      dns_servers   = azurerm_virtual_network.main.dns_servers
    }
    subnets = {
      aks = {
        name             = azurerm_subnet.aks.name
        address_prefixes = azurerm_subnet.aks.address_prefixes
        security_group   = azurerm_network_security_group.aks.id
      }
      database = {
        name             = azurerm_subnet.database.name
        address_prefixes = azurerm_subnet.database.address_prefixes
        security_group   = azurerm_network_security_group.database.id
      }
      redis = {
        name             = azurerm_subnet.redis.name
        address_prefixes = azurerm_subnet.redis.address_prefixes
        security_group   = azurerm_network_security_group.redis.id
      }
    }
  }
}

# Monitoring Configuration Output
output "monitoring_config" {
  description = "Monitoring and logging configuration details"
  value = {
    log_analytics = {
      workspace_id      = azurerm_log_analytics_workspace.main.id
      workspace_key     = azurerm_log_analytics_workspace.main.primary_shared_key
      retention_days    = var.log_retention_days
      solutions_enabled = true
    }
    application_insights = {
      instrumentation_key = azurerm_application_insights.main.instrumentation_key
      connection_string  = azurerm_application_insights.main.connection_string
    }
  }
  sensitive = true
}