# Azure Provider version: ~> 3.0
# Purpose: Configure Azure Storage Account backend for Terraform state management
# Security: Managed identity authentication, encryption at rest, and TLS 1.2 enforcement

terraform {
  backend "azurerm" {
    # Resource identifiers for state storage
    resource_group_name  = "jetstream-tfstate-rg"
    storage_account_name = "jetstreamtfstate"
    container_name      = "tfstate"
    key                 = "jetstream.tfstate"

    # Authentication and security configuration
    use_msi                    = true
    subscription_id            = "${var.subscription_id}"
    tenant_id                  = "${var.tenant_id}"
    environment               = "public"

    # Enhanced security settings
    enable_blob_encryption     = true
    enable_https_traffic_only  = true
    min_tls_version           = "TLS1_2"
    allow_blob_public_access   = false

    # State locking configuration for concurrent access protection
    use_microsoft_graph       = true
    lock_timeout_seconds      = 300

    # Network security settings
    allowed_ip_ranges        = []
    virtual_network_subnet_ids = []

    # Diagnostic settings
    enable_diagnostic_settings = true
    retention_days           = 30

    # Backup and recovery configuration
    enable_point_in_time_recovery = true
    soft_delete_retention_days    = 7

    # Performance optimization
    enable_hierarchical_namespace = false
    enable_large_file_share      = false

    # Cross-region access configuration
    enable_geo_redundancy       = true
    enable_infrastructure_encryption = true
  }

  # Required provider configuration
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

# Variables for backend configuration
variable "subscription_id" {
  description = "Azure subscription ID for state storage"
  type        = string
  sensitive   = true
}

variable "tenant_id" {
  description = "Azure tenant ID for authentication"
  type        = string
  sensitive   = true
}

# Output backend configuration for reference
output "backend_config" {
  description = "Backend configuration details for state management"
  value = {
    storage_account_name = "jetstreamtfstate"
    container_name      = "tfstate"
    resource_group_name = "jetstream-tfstate-rg"
    state_file_path    = "jetstream.tfstate"
  }
  sensitive = true
}