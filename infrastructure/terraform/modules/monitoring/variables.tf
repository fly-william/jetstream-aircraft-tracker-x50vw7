# Azure provider version ~> 3.0

variable "resource_group_name" {
  type        = string
  description = "Name of the resource group where monitoring resources will be created"

  validation {
    condition     = can(regex("^[a-zA-Z0-9-_]{1,90}$", var.resource_group_name))
    error_message = "Resource group name must be between 1 and 90 characters, and can only include alphanumeric, hyphens and underscores."
  }
}

variable "location" {
  type        = string
  description = "Azure region where monitoring resources will be deployed"

  validation {
    condition     = can(regex("^[a-zA-Z0-9-]+$", var.location))
    error_message = "Location must be a valid Azure region identifier."
  }
}

variable "environment" {
  type        = string
  description = "Environment identifier for deployment configuration"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "log_retention_days" {
  type        = number
  description = "Number of days to retain logs in Log Analytics workspace"
  default     = 30

  validation {
    condition     = var.log_retention_days >= 30 && var.log_retention_days <= 730
    error_message = "Log retention days must be between 30 and 730 days."
  }
}

variable "alert_notification_emails" {
  type        = list(string)
  description = "List of email addresses for receiving monitoring alerts and notifications"

  validation {
    condition     = alltrue([for email in var.alert_notification_emails : can(regex("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", email))])
    error_message = "All email addresses must be in valid format."
  }
}

variable "teams_webhook_url" {
  type        = string
  description = "Microsoft Teams webhook URL for sending alert notifications"
  sensitive   = true

  validation {
    condition     = can(regex("^https://.*webhook\\.office\\.com/.*$", var.teams_webhook_url))
    error_message = "Teams webhook URL must be a valid Microsoft Teams webhook URL."
  }
}

variable "metric_thresholds" {
  type = map(object({
    threshold_value = number
    operator       = string
    time_window    = string
  }))
  description = "Performance and availability metric thresholds for alerting"
  default = {
    api_response_time = {
      threshold_value = 200
      operator       = "GreaterThan"
      time_window    = "5m"
    }
    map_render_time = {
      threshold_value = 1000
      operator       = "GreaterThan"
      time_window    = "5m"
    }
    system_uptime = {
      threshold_value = 99.9
      operator       = "LessThan"
      time_window    = "1h"
    }
    error_rate = {
      threshold_value = 0.1
      operator       = "GreaterThan"
      time_window    = "15m"
    }
  }

  validation {
    condition     = alltrue([for k, v in var.metric_thresholds : contains(["GreaterThan", "LessThan", "GreaterThanOrEqual", "LessThanOrEqual"], v.operator)])
    error_message = "Metric threshold operators must be one of: GreaterThan, LessThan, GreaterThanOrEqual, LessThanOrEqual."
  }
}

variable "alert_severity_levels" {
  type        = map(string)
  description = "Mapping of alert severity levels to notification channels"
  default = {
    critical = "email,teams,pagerduty"
    warning  = "email,teams"
    info     = "teams"
  }

  validation {
    condition     = alltrue([for channels in values(var.alert_severity_levels) : alltrue([for channel in split(",", channels) : contains(["email", "teams", "pagerduty"], channel)])])
    error_message = "Alert notification channels must be combinations of: email, teams, pagerduty."
  }
}

variable "tags" {
  type        = map(string)
  description = "Resource tags to be applied to all monitoring components"
  default = {
    project    = "jetstream"
    component  = "monitoring"
    managed_by = "terraform"
  }

  validation {
    condition     = length(var.tags) <= 15
    error_message = "Maximum of 15 tags can be specified for Azure resources."
  }
}