# Log Analytics workspace outputs
output "log_analytics_workspace_id" {
  description = "Resource ID of the Log Analytics workspace for centralized logging and monitoring configuration"
  value       = azurerm_log_analytics_workspace.main.id
  sensitive   = false
}

output "log_analytics_workspace_workspace_id" {
  description = "Workspace ID required for configuring Log Analytics agents and data collection rules"
  value       = azurerm_log_analytics_workspace.main.workspace_id
  sensitive   = false
}

# Application Insights outputs
output "application_insights_id" {
  description = "Resource ID of the Application Insights instance for application performance monitoring"
  value       = azurerm_application_insights.main.id
  sensitive   = false
}

output "application_insights_instrumentation_key" {
  description = "Instrumentation key for configuring Application Insights SDK in applications (rotate every 90 days)"
  value       = azurerm_application_insights.main.instrumentation_key
  sensitive   = true
}

output "application_insights_connection_string" {
  description = "Connection string for Application Insights SDK configuration with enhanced security features"
  value       = azurerm_application_insights.main.connection_string
  sensitive   = true
}

# Action Group outputs
output "action_group_id" {
  description = "Resource ID of the Azure Monitor Action Group for configuring alerts and notifications to Teams and email"
  value       = azurerm_monitor_action_group.main.id
  sensitive   = false
}