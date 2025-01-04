# Terraform variables definition file for Azure Kubernetes Service (AKS) module
# Version: ~> 1.0

variable "cluster_name" {
  type        = string
  description = "Name of the AKS cluster"

  validation {
    condition     = length(var.cluster_name) >= 3 && length(var.cluster_name) <= 63
    error_message = "Cluster name must be between 3 and 63 characters"
  }
}

variable "resource_group_name" {
  type        = string
  description = "Name of the resource group where AKS cluster will be deployed"
}

variable "location" {
  type        = string
  description = "Azure region where AKS cluster will be deployed"

  validation {
    condition     = contains(["eastus", "westus", "centralus"], var.location)
    error_message = "Location must be a valid Azure region for high availability"
  }
}

variable "kubernetes_version" {
  type        = string
  description = "Kubernetes version for the AKS cluster"
  default     = "1.26"
}

variable "node_count" {
  type        = number
  description = "Initial number of nodes in the default node pool"
  default     = 3
}

variable "node_size" {
  type        = string
  description = "VM size for the nodes in the default node pool"
  default     = "Standard_DS3_v2"
}

variable "enable_auto_scaling" {
  type        = bool
  description = "Enable cluster autoscaling"
  default     = true
}

variable "min_node_count" {
  type        = number
  description = "Minimum number of nodes when autoscaling is enabled"
  default     = 3
}

variable "max_node_count" {
  type        = number
  description = "Maximum number of nodes when autoscaling is enabled"
  default     = 10
}

variable "network_plugin" {
  type        = string
  description = "Network plugin for Kubernetes networking"
  default     = "azure"

  validation {
    condition     = contains(["azure", "kubenet"], var.network_plugin)
    error_message = "Network plugin must be either 'azure' or 'kubenet'"
  }
}

variable "admin_group_object_ids" {
  type        = list(string)
  description = "List of Azure AD group object IDs for cluster administrators"
}

variable "log_analytics_workspace_id" {
  type        = string
  description = "ID of the Log Analytics workspace for cluster monitoring"
}

variable "tags" {
  type        = map(string)
  description = "Tags to be applied to the AKS cluster"
  default = {
    Environment = "production"
    Application = "jetstream"
    ManagedBy   = "terraform"
  }
}