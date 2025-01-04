# Contributing to JetStream

## Table of Contents
- [Introduction](#introduction)
- [Development Setup](#development-setup)
- [Code Style Guidelines](#code-style-guidelines)
- [Git Workflow](#git-workflow)
- [Testing Requirements](#testing-requirements)
- [CI/CD Pipeline](#cicd-pipeline)
- [Security Guidelines](#security-guidelines)
- [Documentation](#documentation)
- [Issue Guidelines](#issue-guidelines)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Performance Standards](#performance-standards)
- [Monitoring Guidelines](#monitoring-guidelines)

## Introduction

JetStream is FlyUSA's mission-critical aircraft tracking and trip management platform. As a system handling real-time aviation operations, all contributions must meet strict enterprise standards for reliability, security, and performance.

### Mission-Critical Nature
- Real-time aircraft tracking via ADS-B
- Trip status coordination across departments
- Integration with Microsoft Teams and CRM
- Direct impact on customer service quality

### Contribution Importance
- Code quality directly affects aviation operations
- Security standards must meet industry regulations
- Performance impacts real-time decision making
- Reliability requirements of 99.9% uptime

## Development Setup

### Required Software
- Node.js 20 LTS
- Docker 24.x+
- PostgreSQL 15.x
- TimescaleDB 2.x
- Redis 7.x
- Azure CLI latest version
- VS Code with recommended extensions

### Local Environment Setup
```bash
# Clone repository
git clone https://github.com/flyusa/jetstream.git
cd jetstream

# Install dependencies
npm install

# Setup local databases
docker-compose up -d

# Configure environment
cp .env.example .env
# Edit .env with your local settings

# Run development server
npm run dev
```

## Code Style Guidelines

### TypeScript Standards
- Strict mode required: `"strict": true`
- Explicit return types on functions
- Interface-first design approach
- No `any` types without justification

### Aviation-Specific Naming
```typescript
// Aircraft identifiers
const aircraftRegistration: string; // N-number format
const flightNumber: string; // Operator-specific format

// Position data
interface AircraftPosition {
  latitude: number;  // Decimal degrees
  longitude: number; // Decimal degrees
  altitude: number;  // Feet MSL
  timestamp: Date;   // UTC timestamp
}
```

### Error Handling
```typescript
// Aviation-specific error types
class AircraftNotFoundError extends Error {
  constructor(registration: string) {
    super(`Aircraft ${registration} not found`);
    this.name = 'AircraftNotFoundError';
  }
}

// Required error handling pattern
try {
  await trackAircraft(registration);
} catch (error) {
  if (error instanceof AircraftNotFoundError) {
    logger.warn({ registration }, 'Aircraft not found in tracking system');
    // Handle gracefully
  } else {
    logger.error({ error }, 'Critical tracking error');
    throw error; // Re-throw unexpected errors
  }
}
```

## Git Workflow

### Branch Structure
- `main` - Production code
- `staging` - Pre-production validation
- `develop` - Integration branch
- `feature/*` - New features
- `fix/*` - Bug fixes
- `security/*` - Security updates

### Commit Standards
- Signed commits required (`git config --global commit.gpgsign true`)
- Conventional Commits format
- Reference issue numbers
- No sensitive information

Example:
```bash
git commit -S -m "feat(tracking): implement ADS-B position updates

Implements real-time position tracking using ADS-B data feed.
Includes rate limiting and data validation.

Closes #123"
```

## Testing Requirements

### Required Test Coverage
- Unit Tests: 90% minimum coverage
- Integration Tests: Critical paths covered
- E2E Tests: Core workflows covered
- Performance Tests: Response time validation
- Security Tests: Vulnerability scanning

### Test Examples
```typescript
describe('AircraftTrackingService', () => {
  it('should process valid ADS-B position update', async () => {
    const position = {
      registration: 'N123AB',
      latitude: 42.3601,
      longitude: -71.0589,
      altitude: 5000,
      timestamp: new Date()
    };
    
    const result = await trackingService.updatePosition(position);
    expect(result.status).toBe('success');
    expect(result.latency).toBeLessThan(100); // ms
  });
});
```

## CI/CD Pipeline

### Pipeline Stages
1. Build & Unit Tests
2. Security Scan
3. Integration Tests
4. Performance Tests
5. Staging Deployment
6. Production Deployment

### Quality Gates
- All tests passing
- Security scan clear
- Performance benchmarks met
- Code review approved
- Documentation updated

## Security Guidelines

### Security Requirements
- OWASP Top 10 compliance
- SOC 2 Type II controls
- GDPR compliance
- Aviation industry standards

### Security Practices
- No secrets in code
- Input validation required
- Output encoding required
- Access control validation
- Security logging required

## Documentation

### Required Documentation
- JSDoc on all public APIs
- Architecture decisions recorded
- Security considerations documented
- Performance implications noted
- Monitoring requirements specified

Example:
```typescript
/**
 * Updates aircraft position from ADS-B data
 * @param {AircraftPosition} position - Validated position data
 * @returns {Promise<UpdateResult>} Update confirmation
 * @throws {ValidationError} If position data invalid
 * @security Requires write:aircraft_position permission
 * @performance Expect <100ms response time
 */
async function updateAircraftPosition(position: AircraftPosition): Promise<UpdateResult> {
  // Implementation
}
```

## Issue Guidelines

### Issue Templates
- Bug Report
- Feature Request
- Security Issue (private)
- Performance Issue

### Required Information
- Detailed description
- Steps to reproduce
- Expected behavior
- Actual behavior
- Impact assessment
- Supporting logs/data

## Pull Request Guidelines

### PR Requirements
- Linked to issue
- Tests included
- Documentation updated
- Security reviewed
- Performance validated

### Review Checklist
- Code quality standards met
- Security requirements satisfied
- Tests comprehensive
- Performance impact assessed
- Documentation complete

## Performance Standards

### Response Time Targets
- API Endpoints: <200ms (p95)
- Real-time Updates: <100ms
- Database Queries: <100ms
- Page Load: <1s

### Optimization Requirements
- Query optimization required
- Caching strategy documented
- Resource usage profiled
- Scale testing completed

## Monitoring Guidelines

### Required Monitoring
- Request/response metrics
- Error rates and types
- Resource utilization
- Business metrics
- Security events

### Logging Standards
- Structured JSON logging
- Required context fields
- No sensitive data
- Appropriate log levels

Example:
```typescript
logger.info({
  event: 'aircraft_position_update',
  registration: 'N123AB',
  latency: 45,
  status: 'success'
}, 'Position update processed');
```

## Questions and Support

For questions or support:
1. Check existing documentation
2. Search closed issues
3. Open discussion in Teams channel
4. Create new issue if needed

## License

By contributing to JetStream, you agree that your contributions will be licensed under its proprietary license.