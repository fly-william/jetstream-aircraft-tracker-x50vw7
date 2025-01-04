# Provider versions and requirements
terraform {
  required_version = ">= 1.0.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 2.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }
}

# Primary Azure RM provider configuration
provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy = false
      recover_soft_deleted_key_vaults = true
    }
    resource_group {
      prevent_deletion_if_contains_resources = true
    }
    virtual_machine {
      delete_os_disk_on_deletion = true
    }
    log_analytics_workspace {
      permanently_delete_on_destroy = false
    }
  }

  # Enhanced security features
  storage_use_azuread        = true
  use_msi                    = true
  skip_provider_registration = false

  # Default tags for all resources
  default_tags = {
    Environment = var.environment
    ManagedBy   = "Terraform"
    Project     = "JetStream"
  }
}

# Secondary region provider configuration
provider "azurerm" {
  alias = "secondary"
  features {
    key_vault {
      purge_soft_delete_on_destroy = false
      recover_soft_deleted_key_vaults = true
    }
    resource_group {
      prevent_deletion_if_contains_resources = true
    }
    virtual_machine {
      delete_os_disk_on_deletion = true
    }
    log_analytics_workspace {
      permanently_delete_on_destroy = false
    }
  }

  # Enhanced security features for secondary region
  storage_use_azuread        = true
  use_msi                    = true
  skip_provider_registration = false

  # Default tags for secondary region resources
  default_tags = {
    Environment = var.environment
    ManagedBy   = "Terraform"
    Project     = "JetStream"
    Region      = "Secondary"
  }
}

# Azure AD provider configuration
provider "azuread" {
  use_msi = true
}

# Random provider configuration
provider "random" {
  # Random provider doesn't require specific configuration
}

# TLS provider configuration with strict security settings
provider "tls" {
  # TLS provider doesn't require specific configuration
  # Used for certificate generation with secure defaults
}

# Data sources for provider configuration validation
data "azurerm_client_config" "current" {}

data "azurerm_subscription" "current" {}

# Provider feature flags for enhanced security
locals {
  provider_features = {
    enable_encryption_at_rest    = true
    enable_disk_encryption      = true
    enable_https_traffic_only   = true
    enable_managed_identities   = true
    enable_network_isolation    = true
    enable_private_endpoints    = true
    enable_soft_delete         = true
    enable_threat_protection   = true
  }
}