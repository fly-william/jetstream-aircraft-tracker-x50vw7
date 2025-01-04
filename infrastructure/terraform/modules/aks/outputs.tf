# Cluster identifier for resource referencing and monitoring integration
output "cluster_id" {
  value       = azurerm_kubernetes_cluster.main.id
  description = "The unique identifier of the AKS cluster used for resource referencing and Azure Monitor integration"
}

# Secure Kubernetes configuration with appropriate sensitivity flags
output "kube_config" {
  value       = azurerm_kubernetes_cluster.main.kube_config_raw
  sensitive   = true
  description = "Raw Kubernetes configuration for cluster access. Contains sensitive authentication information and should be handled securely"
}

# Resource group information for node management
output "node_resource_group" {
  value       = azurerm_kubernetes_cluster.main.node_resource_group
  description = "The name of the resource group containing AKS cluster nodes, used for scaling operations and resource management"
}

# Cluster FQDN for DNS configuration
output "cluster_fqdn" {
  value       = azurerm_kubernetes_cluster.main.fqdn
  description = "The fully qualified domain name of the AKS cluster for DNS configuration and external access setup"
}

# Kubelet managed identity information
output "kubelet_identity" {
  value = {
    object_id = azurerm_kubernetes_cluster.main.kubelet_identity[0].object_id
    client_id = azurerm_kubernetes_cluster.main.kubelet_identity[0].client_id
    user_assigned_identity_id = azurerm_kubernetes_cluster.main.kubelet_identity[0].user_assigned_identity_id
  }
  description = "The managed identity information used by the kubelet service for node authentication and Azure resource access"
}

# Network configuration details
output "network_profile" {
  value = {
    network_plugin     = azurerm_kubernetes_cluster.main.network_profile[0].network_plugin
    network_policy     = azurerm_kubernetes_cluster.main.network_profile[0].network_policy
    load_balancer_sku  = azurerm_kubernetes_cluster.main.network_profile[0].load_balancer_sku
    service_cidr       = azurerm_kubernetes_cluster.main.network_profile[0].service_cidr
    dns_service_ip     = azurerm_kubernetes_cluster.main.network_profile[0].dns_service_ip
    docker_bridge_cidr = azurerm_kubernetes_cluster.main.network_profile[0].docker_bridge_cidr
  }
  description = "Network configuration details for cluster connectivity, including service mesh integration and network policies"
}

# Cluster principal ID for RBAC assignments
output "cluster_principal_id" {
  value       = azurerm_kubernetes_cluster.main.identity[0].principal_id
  description = "The principal ID of the cluster's managed identity for role assignments and access control"
}

# Monitoring configuration details
output "monitoring_config" {
  value = {
    log_analytics_workspace_id = azurerm_kubernetes_cluster.main.oms_agent[0].log_analytics_workspace_id
    diagnostic_settings_id     = azurerm_monitor_diagnostic_setting.main.id
  }
  description = "Monitoring configuration details including Log Analytics workspace and diagnostic settings for Azure Monitor integration"
}