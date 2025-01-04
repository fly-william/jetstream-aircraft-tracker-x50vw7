# Azure Cache for Redis module variables
# Provider version: ~> 3.0

variable "resource_group_name" {
  type        = string
  description = "Name of the resource group where Redis resources will be created"
}

variable "location" {
  type        = string
  description = "Azure region where Redis resources will be deployed"
}

variable "redis_name" {
  type        = string
  description = "Name of the Azure Cache for Redis instance"
}

variable "redis_sku" {
  type        = string
  description = "SKU for Azure Cache for Redis (Premium required for clustering and geo-replication)"
  validation {
    condition     = contains(["Basic", "Standard", "Premium"], var.redis_sku)
    error_message = "Redis SKU must be one of: Basic, Standard, Premium. Premium is required for clustering and geo-replication."
  }
}

variable "redis_capacity" {
  type        = number
  description = "Capacity of the Redis Cache instance (1-6). Higher values provide more memory and concurrent connections"
  validation {
    condition     = var.redis_capacity >= 1 && var.redis_capacity <= 6
    error_message = "Redis capacity must be between 1 and 6."
  }
}

variable "redis_version" {
  type        = string
  description = "Redis version to use (6.0 or 7.0 recommended for production)"
  default     = "7.0"
  validation {
    condition     = contains(["6.0", "7.0"], var.redis_version)
    error_message = "Redis version must be either 6.0 or 7.0."
  }
}

variable "enable_clustering" {
  type        = bool
  description = "Enable Redis clustering for better performance and higher availability (Premium SKU required)"
  default     = true
}

variable "enable_geo_replication" {
  type        = bool
  description = "Enable geo-replication for disaster recovery (Premium SKU required)"
  default     = true
}

variable "enable_aof_backup" {
  type        = bool
  description = "Enable AOF (Append-Only File) persistence for data durability (Premium SKU required)"
  default     = true
}

variable "backup_retention_days" {
  type        = number
  description = "Number of days to retain Redis backups (7-35 days)"
  default     = 7
  validation {
    condition     = var.backup_retention_days >= 7 && var.backup_retention_days <= 35
    error_message = "Backup retention must be between 7 and 35 days."
  }
}

variable "minimum_tls_version" {
  type        = string
  description = "Minimum TLS version for Redis connections"
  default     = "1.2"
  validation {
    condition     = contains(["1.0", "1.1", "1.2"], var.minimum_tls_version)
    error_message = "Minimum TLS version must be one of: 1.0, 1.1, 1.2."
  }
}

variable "subnet_id" {
  type        = string
  description = "ID of the subnet where Redis should be deployed (required for Premium SKU)"
  default     = null
}

variable "private_endpoint_enabled" {
  type        = bool
  description = "Enable private endpoint for Redis access (Premium SKU recommended)"
  default     = true
}

variable "patch_schedule" {
  type = list(object({
    day_of_week    = string
    start_hour_utc = number
  }))
  description = "Schedule for Redis patching operations"
  default = [
    {
      day_of_week    = "Sunday"
      start_hour_utc = 2
    }
  ]
  validation {
    condition     = length(var.patch_schedule) > 0
    error_message = "At least one patch schedule entry is required."
  }
}

variable "tags" {
  type        = map(string)
  description = "Tags to be applied to Redis resources"
  default     = {}
}