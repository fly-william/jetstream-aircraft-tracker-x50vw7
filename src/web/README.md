# JetStream Web Frontend

Enterprise-grade React application for real-time aircraft tracking and trip management.

## Project Overview

JetStream's web frontend provides a sophisticated user interface for FlyUSA's next-generation aircraft tracking and trip management platform. Built with React and TypeScript, it delivers real-time operational visibility and seamless integration with Microsoft Teams.

### Key Features
- Real-time aircraft tracking with MapboxGL visualization
- Comprehensive trip status management
- Microsoft Teams integration
- Role-based access control
- Responsive design for all devices

### Technology Stack
- React 18.2+ with TypeScript 5.0+
- Material-UI 5.x component library
- MapboxGL 2.x for map visualization
- Azure AD B2C authentication
- Socket.IO for real-time updates

### Browser Support
- Chrome (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Edge (last 2 versions)

### System Requirements
- Node.js >=20.0.0
- npm >=9.0.0

## Getting Started

### Prerequisites
1. Node.js (>=20.0.0)
2. npm (>=9.0.0)
3. Git
4. VS Code (recommended)

### Installation
1. Clone the repository:
```bash
git clone <repository-url>
cd jetstream-web-frontend
```

2. Copy environment template:
```bash
cp .env.example .env
```

3. Install dependencies:
```bash
npm install
```

4. Start development server:
```bash
npm run dev
```

5. Access the application at http://localhost:3000

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build production bundle
- `npm run preview` - Preview production build
- `npm run test` - Run tests with coverage
- `npm run lint` - Lint and fix code
- `npm run type-check` - TypeScript type checking

## Architecture Overview

### Application Structure
```
src/
├── assets/         # Static assets
├── components/     # Reusable UI components
├── hooks/          # Custom React hooks
├── pages/          # Route components
├── services/       # API and external services
├── store/          # State management
├── types/          # TypeScript definitions
└── utils/          # Utility functions
```

### Key Dependencies
- `@mui/material` v5.14.0 - UI component library
- `mapbox-gl` v2.15.0 - Map visualization
- `@azure/msal-browser` v3.1.0 - Authentication
- `@microsoft/teams-js` v2.14.0 - Teams integration
- `socket.io-client` v4.7.2 - Real-time updates

### State Management
- Redux for global state
- React Context for theme/auth
- React Query for server state

### Build Configuration
- Vite for development and building
- TypeScript for type safety
- ESLint and Prettier for code quality
- Jest and Testing Library for testing

## Development Guidelines

### Code Organization
- Feature-based directory structure
- Shared components in `components/`
- Page components in `pages/`
- Business logic in custom hooks

### Component Standards
- Functional components with TypeScript
- Props interface definitions
- Error boundary implementation
- Accessibility compliance
- Performance optimization

### State Management Patterns
- Redux for global application state
- Context for theme/auth state
- Local state for component-specific data
- Memoization for expensive operations

### Performance Optimization
- Code splitting with React.lazy
- Image optimization
- Bundle size monitoring
- Virtual scrolling for large lists
- Memoized components

### Testing Requirements
- Unit tests for utilities
- Component tests with React Testing Library
- Integration tests for critical flows
- E2E tests for key user journeys

## Integration Points

### Microsoft Teams
- Teams SSO integration
- Adaptive card notifications
- Deep linking support
- Teams theme synchronization

### Azure Services
- Azure AD B2C authentication
- Application Insights monitoring
- Azure CDN for static assets
- Azure Cache for session storage

### API Integration
- REST API consumption
- WebSocket real-time updates
- Circuit breaker implementation
- Request retry logic

## Troubleshooting

### Common Issues
1. **Build Failures**
   - Verify Node.js version
   - Clear npm cache
   - Remove node_modules and reinstall

2. **Runtime Errors**
   - Check browser console
   - Verify environment variables
   - Confirm API endpoints

3. **Performance Issues**
   - Enable React DevTools
   - Monitor network requests
   - Check bundle size

### Support
For technical support, contact:
- Development Team: dev@flyusa.com
- Operations: ops@flyusa.com

## Security

### Authentication
- Azure AD B2C integration
- JWT token management
- Secure session handling
- MFA support

### Authorization
- Role-based access control
- Feature flags
- API scope validation
- Resource-level permissions

### Data Protection
- TLS 1.3 encryption
- Secure cookie handling
- XSS prevention
- CSRF protection

## Contributing

### Pull Request Process
1. Create feature branch
2. Implement changes
3. Add/update tests
4. Run linting and type checking
5. Submit PR with description
6. Address review feedback
7. Merge after approval

### Code Review Guidelines
- TypeScript strict mode compliance
- Component performance review
- Security best practices
- Accessibility requirements
- Test coverage

## License
Proprietary - FlyUSA Corporation