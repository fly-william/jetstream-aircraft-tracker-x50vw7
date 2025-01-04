# Azure provider configuration for monitoring resources
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

# Log Analytics workspace for centralized logging
resource "azurerm_log_analytics_workspace" "main" {
  name                = "jetstream-${var.environment}-law"
  resource_group_name = var.resource_group_name
  location            = var.location
  sku                = "PerGB2018"
  retention_in_days   = var.log_retention_days
  daily_quota_gb      = 100

  # Enable internet-based ingestion and querying
  internet_ingestion_enabled = true
  internet_query_enabled    = true

  tags = merge(var.tags, {
    component = "log-analytics"
  })
}

# Application Insights for application performance monitoring
resource "azurerm_application_insights" "main" {
  name                = "jetstream-${var.environment}-ai"
  resource_group_name = var.resource_group_name
  location            = var.location
  workspace_id        = azurerm_log_analytics_workspace.main.id
  application_type    = "web"

  # Configure sampling and security settings
  sampling_percentage             = var.sampling_percentage
  disable_ip_masking             = false
  local_authentication_disabled  = true

  tags = merge(var.tags, {
    component = "application-insights"
  })
}

# Action group for alert notifications
resource "azurerm_monitor_action_group" "main" {
  name                = "jetstream-${var.environment}-ag"
  resource_group_name = var.resource_group_name
  short_name         = "jetstream"
  enabled            = true

  email_receiver {
    name                    = "operations"
    email_address          = var.alert_notification_emails[0]
    use_common_alert_schema = true
  }

  webhook_receiver {
    name                    = "teams"
    service_uri            = var.teams_webhook_url
    use_common_alert_schema = true
  }

  tags = merge(var.tags, {
    component = "action-group"
  })
}

# API Response Time Alert
resource "azurerm_monitor_metric_alert" "api_response_time" {
  name                = "jetstream-${var.environment}-alert-api-response-time"
  resource_group_name = var.resource_group_name
  scopes             = [azurerm_application_insights.main.id]
  description        = "Alert when API response time exceeds threshold"
  severity           = 2
  frequency          = "PT1M"
  window_size        = "PT5M"

  criteria {
    metric_namespace = "microsoft.insights/components"
    metric_name      = "requests/duration"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 200 # 200ms threshold as per A.4 System Metrics
  }

  action {
    action_group_id = azurerm_monitor_action_group.main.id
    webhook_properties = {
      alertSource  = "Azure Monitor"
      environment = var.environment
      metricName  = "API Response Time"
    }
  }
}

# System Availability Alert
resource "azurerm_monitor_metric_alert" "system_availability" {
  name                = "jetstream-${var.environment}-alert-availability"
  resource_group_name = var.resource_group_name
  scopes             = [azurerm_application_insights.main.id]
  description        = "Alert when system availability drops below threshold"
  severity           = 1
  frequency          = "PT5M"
  window_size        = "PT15M"

  criteria {
    metric_namespace = "microsoft.insights/components"
    metric_name      = "availability"
    aggregation      = "Average"
    operator         = "LessThan"
    threshold        = 99.9 # 99.9% threshold as per A.4 System Metrics
  }

  action {
    action_group_id = azurerm_monitor_action_group.main.id
    webhook_properties = {
      alertSource  = "Azure Monitor"
      environment = var.environment
      metricName  = "System Availability"
    }
  }
}

# Error Rate Alert
resource "azurerm_monitor_metric_alert" "error_rate" {
  name                = "jetstream-${var.environment}-alert-error-rate"
  resource_group_name = var.resource_group_name
  scopes             = [azurerm_application_insights.main.id]
  description        = "Alert when error rate exceeds threshold"
  severity           = 2
  frequency          = "PT1M"
  window_size        = "PT5M"

  criteria {
    metric_namespace = "microsoft.insights/components"
    metric_name      = "exceptions/server"
    aggregation      = "Count"
    operator         = "GreaterThan"
    threshold        = 0.1 # 0.1% threshold as per A.4 System Metrics
  }

  action {
    action_group_id = azurerm_monitor_action_group.main.id
    webhook_properties = {
      alertSource  = "Azure Monitor"
      environment = var.environment
      metricName  = "Error Rate"
    }
  }
}

# Request Rate Alert
resource "azurerm_monitor_metric_alert" "request_rate" {
  name                = "jetstream-${var.environment}-alert-request-rate"
  resource_group_name = var.resource_group_name
  scopes             = [azurerm_application_insights.main.id]
  description        = "Alert when request rate exceeds threshold"
  severity           = 3
  frequency          = "PT1M"
  window_size        = "PT5M"

  criteria {
    metric_namespace = "microsoft.insights/components"
    metric_name      = "requests/count"
    aggregation      = "Total"
    operator         = "GreaterThan"
    threshold        = 1000 # 1000+ requests per second as per A.4 System Metrics
  }

  action {
    action_group_id = azurerm_monitor_action_group.main.id
    webhook_properties = {
      alertSource  = "Azure Monitor"
      environment = var.environment
      metricName  = "Request Rate"
    }
  }
}

# Export outputs for other modules
output "log_analytics_workspace" {
  value = {
    id                  = azurerm_log_analytics_workspace.main.id
    workspace_id        = azurerm_log_analytics_workspace.main.workspace_id
    primary_shared_key  = azurerm_log_analytics_workspace.main.primary_shared_key
  }
  sensitive = true
  description = "Log Analytics workspace details"
}

output "application_insights" {
  value = {
    id                  = azurerm_application_insights.main.id
    instrumentation_key = azurerm_application_insights.main.instrumentation_key
    connection_string   = azurerm_application_insights.main.connection_string
    app_id             = azurerm_application_insights.main.app_id
  }
  sensitive = true
  description = "Application Insights details"
}

output "action_group" {
  value = {
    id = azurerm_monitor_action_group.main.id
  }
  description = "Action Group ID for alert configurations"
}