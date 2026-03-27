# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **aws** (AI Agent Visual Survival World / AI Sandbox Universe) project - a visual simulation world for AI agents.

**Project Status**: Active development with ~31,000 lines of code (Backend: ~18,500 LOC, Frontend: ~13,000 LOC)

## Quick Start Commands

### Backend (Node.js + TypeScript + Express)
```bash
cd backend
npm install
npm run prisma:generate    # Generate Prisma client
npm run prisma:migrate     # Run database migrations
npm run dev                # Start development server (port 3000)
npm run build              # Build for production
npm test                   # Run tests (vitest)
npm run lint               # Run ESLint
```

### Frontend (React + TypeScript + Vite)
```bash
cd frontend
npm install
npm run dev                # Start dev server (port 5173)
npm run build              # Build for production
npm run preview            # Preview production build
npm run lint               # Run ESLint
```

### Docker Deployment
```bash
docker-compose up -d       # Start all services
```

## Project Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Frontend Layer                             │
│  (React + Three.js + Leaflet - 观察 Agent 活动、世界状态)            │
└─────────────────────────────────────────────────────────────────────┘
                          ↕ WebSocket/SSE/REST
┌─────────────────────────────────────────────────────────────────────┐
│                         API Gateway                                 │
│  (Express Router - VWAP 协议接口)                                    │
└─────────────────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────────────────┐
│                        Core Services                                │
│  (WorldEngine, AgentManager, CityTerrainSystem, TimeSystem)         │
└─────────────────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────────────────┐
│                      Data Persistence                               │
│  (PostgreSQL + Prisma)                                              │
└─────────────────────────────────────────────────────────────────────┘
```

## Key Components

### Backend (`/backend/src`)
- **`core/`** - Core business logic
  - `WorldEngine.ts` - Main world simulation engine
  - `AgentManager.ts` - Agent lifecycle management
  - `CityTerrainSystem.ts` - City-based terrain generation
  - `TimeSystem.ts` - Virtual time management
- **`api/v1/`** - REST API endpoints
- **`services/`** - External integrations (OpenAI, Claude, webhook)
- **`types/`** - TypeScript type definitions

### Frontend (`/frontend/src`)
- **`components/`** - React components
  - `VirtualSpace3D.tsx` - Main 3D visualization component
  - `RealWorldMap.tsx` - 2D map with Leaflet
  - `AgentList.tsx`, `AgentCard.tsx` - Agent UI components
- **`pages/`** - Page-level components
- **`hooks/`** - Custom React hooks
- **`services/`** - API client

## Development Workflow

### Branch Strategy
- `main` - Production-ready code
- Feature branches - `feature/feature-name`
- Bugfix branches - `fix/bug-name`

### Commit Guidelines
- Use clear commit messages
- Prefix: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`
- Example: `feat: add city-based terrain loading`

### Testing
- Manual tests: `frontend/__tests__/manual/`
- Test scripts: `frontend/__tests__/scripts/`
- Backend scripts: `backend/scripts/terrain/`

## Important Conventions

### Code Style
- TypeScript strict mode enabled
- ESLint for both backend and frontend
- Use functional components with hooks (React)
- Single responsibility principle for components

### File Organization
- Keep components under 300 lines
- Extract reusable logic to custom hooks
- Group related files in subdirectories
- Use index files for clean imports

### API Design
- RESTful endpoints under `/api/v1/`
- Consistent error handling
- API Key authentication via `X-API-Key` header

## Environment Variables

### Backend (`.env`)
```
PORT=3000
HOST=100.64.0.131
DATABASE_URL=postgresql://...
WORLD_TIME_SPEED=1
CORS_ORIGIN=http://localhost:5173,http://localhost:8888
```

### Frontend (`.env`)
```
VITE_API_BASE_URL=http://localhost:3000
```

## Useful File Paths

### Configuration
- `backend/package.json` - Backend dependencies and scripts
- `frontend/package.json` - Frontend dependencies and scripts
- `backend/tsconfig.json` - TypeScript configuration
- `frontend/vite.config.ts` - Vite build configuration

### Documentation
- `README.md` - Project overview
- `docs/architecture.md` - Architecture details
- `docs/vw_protocol.md` - VWAP protocol specification
- `docs/DEPLOYMENT.md` - Deployment guide

### Scripts
- `backend/scripts/terrain/` - Terrain regeneration scripts
- `frontend/__tests__/scripts/` - Frontend test scripts

## Current Issues & TODOs

### Known Issues
- VirtualSpace3D.tsx needs refactoring (too large)
- Missing unit tests for core modules
- No CI/CD pipeline configured

### Planned Improvements
- [ ] Split VirtualSpace3D into smaller components
- [ ] Add comprehensive unit tests
- [ ] Set up GitHub Actions CI/CD
- [ ] Improve documentation

# currentDate
Today's date is 2026-03-27.
