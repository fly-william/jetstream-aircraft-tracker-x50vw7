# Core Terraform functionality for variable definitions
# Provider version: hashicorp/terraform ~> 1.0

# Resource Group Configuration
variable "resource_group_name" {
  description = "Name of the resource group for database deployment"
  type        = string
  
  validation {
    condition     = length(var.resource_group_name) > 0 && can(regex("^[a-zA-Z0-9-_]{3,63}$", var.resource_group_name))
    error_message = "Resource group name must be 3-63 characters and contain only alphanumeric, hyphens, and underscores"
  }
}

# Azure Region Configuration
variable "location" {
  description = "Azure region for database deployment with failover support"
  type        = string
  
  validation {
    condition     = contains(["eastus", "westus", "centralus", "eastus2", "westus2"], var.location)
    error_message = "Location must be a supported Azure region with failover capabilities"
  }
}

# Environment Configuration
variable "environment" {
  description = "Deployment environment with specific configuration sets"
  type        = string
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod"
  }
}

# PostgreSQL Version Configuration
variable "postgresql_version" {
  description = "PostgreSQL version for databases with TimescaleDB support"
  type        = string
  default     = "15"
  
  validation {
    condition     = contains(["13", "14", "15"], var.postgresql_version)
    error_message = "PostgreSQL version must be 13, 14, or 15 for TimescaleDB compatibility"
  }
}

# Database SKU Configuration
variable "postgresql_sku" {
  description = "SKU name for PostgreSQL Flexible Server with high availability"
  type        = string
  default     = "GP_Standard_D4s_v3"
  
  validation {
    condition     = can(regex("^GP_Standard_D[2-8]s_v3$", var.postgresql_sku))
    error_message = "Invalid SKU name. Must be General Purpose Standard_D2s_v3 to Standard_D8s_v3"
  }
}

# Storage Configuration
variable "postgresql_storage_mb" {
  description = "Storage size in MB for PostgreSQL databases with growth capability"
  type        = number
  default     = 65536
  
  validation {
    condition     = var.postgresql_storage_mb >= 32768 && var.postgresql_storage_mb <= 16777216
    error_message = "Storage must be between 32GB and 16TB"
  }
}

# Backup Configuration
variable "backup_retention_days" {
  description = "Backup retention period in days with geo-redundancy"
  type        = number
  default     = 7
  
  validation {
    condition     = var.backup_retention_days >= 7 && var.backup_retention_days <= 35
    error_message = "Backup retention must be between 7 and 35 days"
  }
}

variable "geo_redundant_backup" {
  description = "Enable geo-redundant backups for disaster recovery"
  type        = bool
  default     = true
}

# Administrator Credentials
variable "administrator_login" {
  description = "Database administrator login name with strict security policy"
  type        = string
  sensitive   = true
  
  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9_]{2,15}$", var.administrator_login))
    error_message = "Admin login must start with a letter, be 3-16 characters, and contain only alphanumeric and underscores"
  }
}

variable "administrator_password" {
  description = "Database administrator password meeting security requirements"
  type        = string
  sensitive   = true
  
  validation {
    condition     = can(regex("^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*()_+=-])[A-Za-z0-9!@#$%^&*()_+=-]{12,128}$", var.administrator_password))
    error_message = "Password must be 12-128 characters with at least one uppercase, lowercase, number, and special character"
  }
}

# Network Security Configuration
variable "network_rules" {
  description = "Network security rules for database access control"
  type = object({
    delegated_subnet_id       = string
    private_endpoint_enabled  = bool
    allowed_ip_ranges        = list(string)
    service_endpoints_enabled = bool
    deny_public_access       = bool
  })
  
  default = {
    delegated_subnet_id       = null
    private_endpoint_enabled  = true
    allowed_ip_ranges        = []
    service_endpoints_enabled = true
    deny_public_access       = true
  }
}