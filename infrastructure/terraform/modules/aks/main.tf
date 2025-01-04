# Azure Kubernetes Service (AKS) Terraform Configuration
# Version: ~> 1.0

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 2.0"
    }
  }
}

# Production-grade AKS cluster with enhanced security and monitoring
resource "azurerm_kubernetes_cluster" "main" {
  name                = var.cluster_name
  location            = var.location
  resource_group_name = var.resource_group_name
  dns_prefix         = var.cluster_name
  kubernetes_version = var.kubernetes_version
  sku_tier           = "Standard"

  default_node_pool {
    name                = "default"
    node_count          = var.node_count
    vm_size            = var.node_size
    enable_auto_scaling = var.enable_auto_scaling
    min_count          = var.min_node_count
    max_count          = var.max_node_count
    type               = "VirtualMachineScaleSets"
    os_disk_size_gb    = 128
    os_disk_type       = "Managed"
    enable_node_public_ip = false
    max_pods           = 110
    zones              = [1, 2, 3]
  }

  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin     = var.network_plugin
    network_policy     = "calico"
    load_balancer_sku  = "standard"
    outbound_type      = "loadBalancer"
    docker_bridge_cidr = "172.17.0.1/16"
    dns_service_ip     = "10.0.0.10"
    service_cidr       = "10.0.0.0/16"
  }

  azure_active_directory_role_based_access_control {
    managed                = true
    admin_group_object_ids = var.admin_group_object_ids
    azure_rbac_enabled     = true
  }

  oms_agent {
    log_analytics_workspace_id = var.log_analytics_workspace_id
  }

  azure_policy_enabled = true

  key_vault_secrets_provider {
    secret_rotation_enabled  = true
    secret_rotation_interval = "2m"
  }

  maintenance_window {
    allowed {
      day   = "Sunday"
      hours = [21, 22, 23]
    }
  }

  auto_scaler_profile {
    balance_similar_node_groups      = true
    expander                        = "random"
    max_graceful_termination_sec    = 600
    max_node_provisioning_time      = "15m"
    max_unready_nodes               = 3
    max_unready_percentage          = 45
    new_pod_scale_up_delay          = "10s"
    scale_down_delay_after_add      = "10m"
    scale_down_delay_after_delete   = "10s"
    scale_down_delay_after_failure  = "3m"
    scan_interval                   = "10s"
    scale_down_unneeded            = "10m"
    scale_down_unready             = "20m"
    scale_down_utilization_threshold = 0.5
  }

  tags = var.tags
}

# Comprehensive AKS cluster monitoring configuration
resource "azurerm_monitor_diagnostic_setting" "main" {
  name                       = "${var.cluster_name}-diagnostics"
  target_resource_id         = azurerm_kubernetes_cluster.main.id
  log_analytics_workspace_id = var.log_analytics_workspace_id

  log {
    category = "kube-apiserver"
    enabled  = true
    retention_policy {
      enabled = true
      days    = 30
    }
  }

  log {
    category = "kube-controller-manager"
    enabled  = true
    retention_policy {
      enabled = true
      days    = 30
    }
  }

  log {
    category = "cluster-autoscaler"
    enabled  = true
    retention_policy {
      enabled = true
      days    = 30
    }
  }

  log {
    category = "kube-scheduler"
    enabled  = true
    retention_policy {
      enabled = true
      days    = 30
    }
  }

  log {
    category = "kube-audit"
    enabled  = true
    retention_policy {
      enabled = true
      days    = 30
    }
  }

  log {
    category = "guard"
    enabled  = true
    retention_policy {
      enabled = true
      days    = 30
    }
  }

  metric {
    category = "AllMetrics"
    enabled  = true
    retention_policy {
      enabled = true
      days    = 30
    }
  }
}

# Output values for use in other modules
output "cluster_id" {
  value       = azurerm_kubernetes_cluster.main.id
  description = "The ID of the AKS cluster"
}

output "kube_config_raw" {
  value       = azurerm_kubernetes_cluster.main.kube_config_raw
  description = "Raw kubeconfig for the AKS cluster"
  sensitive   = true
}

output "node_resource_group" {
  value       = azurerm_kubernetes_cluster.main.node_resource_group
  description = "The resource group containing AKS cluster nodes"
}

output "kubelet_identity" {
  value       = azurerm_kubernetes_cluster.main.kubelet_identity
  description = "The identity used by the Kubelet service"
  sensitive   = true
}

output "cluster_identity" {
  value       = azurerm_kubernetes_cluster.main.identity
  description = "The system-assigned identity of the AKS cluster"
  sensitive   = true
}