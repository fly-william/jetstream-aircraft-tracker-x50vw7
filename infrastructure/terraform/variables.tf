# Azure Provider version: ~> 3.0

# Environment specification
variable "environment" {
  type        = string
  description = "Deployment environment (dev/staging/prod)"
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

# Region configuration
variable "location" {
  type        = string
  description = "Primary Azure region for resource deployment"
  validation {
    condition     = contains(["eastus", "westus", "centralus", "eastus2", "westus2"], var.location)
    error_message = "Location must be a supported Azure region: eastus, westus, centralus, eastus2, westus2."
  }
}

variable "secondary_location" {
  type        = string
  description = "Secondary Azure region for high availability and disaster recovery"
  validation {
    condition     = contains(["eastus", "westus", "centralus", "eastus2", "westus2"], var.secondary_location)
    error_message = "Secondary location must be a supported Azure region: eastus, westus, centralus, eastus2, westus2."
  }
}

# Resource naming
variable "resource_name_prefix" {
  type        = string
  description = "Prefix for all resource names (e.g., 'jetstream')"
  validation {
    condition     = can(regex("^[a-z0-9]{3,16}$", var.resource_name_prefix))
    error_message = "Resource name prefix must be 3-16 characters long and contain only lowercase letters and numbers."
  }
}

# AKS configuration
variable "aks_kubernetes_version" {
  type        = string
  description = "Kubernetes version for AKS clusters"
  validation {
    condition     = can(regex("^[0-9]+\\.[0-9]+\\.[0-9]+$", var.aks_kubernetes_version))
    error_message = "Kubernetes version must be in semantic version format (e.g., 1.24.0)."
  }
}

variable "aks_node_size" {
  type        = string
  description = "VM size for AKS nodes"
  validation {
    condition     = contains(["Standard_D2s_v3", "Standard_D4s_v3", "Standard_D8s_v3", "Standard_D16s_v3"], var.aks_node_size)
    error_message = "AKS node size must be a supported VM size."
  }
}

variable "aks_min_node_count" {
  type        = number
  description = "Minimum number of nodes in AKS clusters"
  validation {
    condition     = var.aks_min_node_count >= 1 && var.aks_min_node_count <= 100
    error_message = "Minimum node count must be between 1 and 100."
  }
}

variable "aks_max_node_count" {
  type        = number
  description = "Maximum number of nodes in AKS clusters"
  validation {
    condition     = var.aks_max_node_count >= 1 && var.aks_max_node_count <= 100
    error_message = "Maximum node count must be between 1 and 100."
  }
}

# Database configuration
variable "postgresql_sku" {
  type        = string
  description = "SKU for Azure Database for PostgreSQL"
  validation {
    condition     = contains(["GP_Gen5_2", "GP_Gen5_4", "GP_Gen5_8", "GP_Gen5_16", "GP_Gen5_32"], var.postgresql_sku)
    error_message = "PostgreSQL SKU must be a supported General Purpose tier."
  }
}

variable "redis_sku" {
  type        = string
  description = "SKU for Azure Cache for Redis"
  validation {
    condition     = contains(["Basic", "Standard", "Premium"], var.redis_sku)
    error_message = "Redis SKU must be one of: Basic, Standard, Premium."
  }
}

# Resource tagging
variable "tags" {
  type        = map(string)
  description = "Common tags to be applied to all resources"
  default = {
    Project     = "JetStream"
    Environment = "dev"
    Terraform   = "true"
  }
}

# Network configuration
variable "vnet_address_space" {
  type        = string
  description = "Address space for Virtual Network"
  validation {
    condition     = can(regex("^([0-9]{1,3}\\.){3}[0-9]{1,3}/[0-9]{1,2}$", var.vnet_address_space))
    error_message = "Virtual Network address space must be in CIDR notation (e.g., 10.0.0.0/16)."
  }
}

variable "subnet_aks_prefix" {
  type        = string
  description = "Address prefix for AKS subnet"
  validation {
    condition     = can(regex("^([0-9]{1,3}\\.){3}[0-9]{1,3}/[0-9]{1,2}$", var.subnet_aks_prefix))
    error_message = "AKS subnet prefix must be in CIDR notation (e.g., 10.0.1.0/24)."
  }
}

# Monitoring configuration
variable "log_retention_days" {
  type        = number
  description = "Number of days to retain logs"
  validation {
    condition     = var.log_retention_days >= 30 && var.log_retention_days <= 730
    error_message = "Log retention must be between 30 and 730 days."
  }
}

# Backup configuration
variable "backup_retention_days" {
  type        = number
  description = "Number of days to retain database backups"
  validation {
    condition     = var.backup_retention_days >= 7 && var.backup_retention_days <= 35
    error_message = "Backup retention must be between 7 and 35 days."
  }
}

# SSL/TLS configuration
variable "min_tls_version" {
  type        = string
  description = "Minimum TLS version for services"
  validation {
    condition     = contains(["1.2", "1.3"], var.min_tls_version)
    error_message = "Minimum TLS version must be either 1.2 or 1.3."
  }
}