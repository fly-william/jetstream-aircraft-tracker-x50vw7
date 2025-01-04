---
name: Bug Report
about: Create a standardized bug report for JetStream platform issues
title: "[Component] "
labels: bug
assignees: ''
---

<!-- 
Please follow the bug report format carefully. 
Title format must be: [Component] Brief description of the bug
Example: [Aircraft Tracking] Real-time position updates not displaying
-->

## Bug Description
<!-- Provide a clear and concise description of the bug. Minimum 50 characters required. -->


## Affected Component
<!-- Select all that apply -->
- [ ] Aircraft Tracking Service
- [ ] Trip Management Service
- [ ] Notification Service
- [ ] Web Frontend
- [ ] API Gateway
- [ ] Infrastructure

## Environment
<!-- Select exactly one -->
- [ ] Production
- [ ] Staging
- [ ] Development
- [ ] Local

## Impact Level
<!-- Select exactly one. Critical/High impacts trigger automatic notifications -->
- [ ] Critical - System Outage
- [ ] High - Major Feature Broken
- [ ] Medium - Feature Partially Working
- [ ] Low - Minor Issue

## User Impact
<!-- Select all affected user groups -->
- [ ] Operations Team
- [ ] Sales Team
- [ ] Customer Service
- [ ] Management
- [ ] All Users

## Security Impact
<!-- Select exactly one. Security issues trigger automatic security team notification -->
- [ ] Authentication/Authorization Issue
- [ ] Data Protection Issue
- [ ] Infrastructure Security Issue
- [ ] None

## Error Logs
<!-- Optional: Include any relevant error messages, stack traces, or monitoring alerts -->
```
<details>
<summary>Error Details</summary>

```

```
</details>

<!-- 
This issue will be automatically:
- Labeled based on component and impact level
- Assigned to relevant team(s)
- Trigger notifications based on impact level and security status
-->