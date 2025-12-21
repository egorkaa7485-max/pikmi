# Durak Online - Card Game

## Overview

Durak Online is a Russian card game web application built as a pixel-perfect clone of RST Games Durak Online. The application allows players to create and join card games with various game modes, deck sizes, and stakes. The project implements a real-time multiplayer card game experience with a lobby system, game creation, and active gameplay features.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool

**UI Component System**: Shadcn/ui with Radix UI primitives, providing a comprehensive set of accessible, customizable components

**Styling**: Tailwind CSS with custom color schemes and design tokens specifically for the Durak game aesthetic (blue gradients, green felt table, coin colors)

**Routing**: Wouter for lightweight client-side routing with three main routes:
- Lobby page (`/`)
- Active game page (`/game/:id`)
- 404 not found page

**State Management**: 
- TanStack React Query (v5) for server state management with automatic refetching and caching
- Local component state using React hooks
- Query client configured with infinite stale time and disabled window focus refetching

**Design System**: Custom design guidelines based on RST Games reference implementation with:
- Blue texture gradients for backgrounds
- Green felt texture for game tables
- Traditional Russian playing card illustrations
- Cyrillic support throughout the UI

### Backend Architecture

**Server Framework**: Express.js with TypeScript running on Node.js

**Development vs Production**:
- Development: Vite middleware integration with HMR support
- Production: Static file serving from pre-built dist directory

**API Design**: RESTful API endpoints with the following structure:
- `GET /api/games` - List all games
- `GET /api/games/:id` - Get specific game or game state
- `POST /api/games` - Create new game
- `POST /api/games/:id/join` - Join a game
- `POST /api/games/:id/leave` - Leave a game
- Game action endpoints for attack, defense, take, and beat actions

**Game Logic**: Server-side game state management with:
- Deck generation and shuffling for 24/36/52 card decks
- Card comparison logic respecting trump suits
- Turn-based gameplay flow
- Player hand management
- Attack/defense mechanics

**Validation**: Zod schemas for runtime type validation on API requests and game data

### Data Storage Solutions

**Current Implementation**: In-memory storage using Map data structures for:
- Users (keyed by user ID)
- Games (keyed by game ID)
- Game states (keyed by game ID)

**Database Configuration**: Drizzle ORM configured for PostgreSQL with:
- Schema defined in `shared/schema.ts`
- Tables: users, games
- Migration support via drizzle-kit
- Neon serverless PostgreSQL driver integration

**Schema Design**:
- Users table: id, username, password, coins, level, wins, losses
- Games table: id, stake, player counts, deck configuration, game mode, privacy settings, status, turn tracking, trump suit, deck state, players array, table cards, attacker/defender IDs, timestamps
- Game state stored as JSONB for flexibility with nested card/player data

**Data Flow**: The application is architected to transition from in-memory storage to PostgreSQL persistence, with the storage interface abstraction already in place

### External Dependencies

**UI Component Libraries**:
- @radix-ui/* - Comprehensive set of accessible UI primitives (dialogs, dropdowns, tooltips, etc.)
- shadcn/ui - Pre-styled component implementations
- cmdk - Command menu component
- embla-carousel-react - Carousel/slider functionality
- lucide-react - Icon library

**Form Handling**:
- react-hook-form - Form state management
- @hookform/resolvers - Form validation resolvers

**Date Manipulation**:
- date-fns - Date utility library

**Styling & Utilities**:
- tailwindcss - Utility-first CSS framework
- class-variance-authority - Component variant styling
- clsx & tailwind-merge - Class name merging utilities

**Build Tools**:
- Vite - Fast frontend build tool with HMR
- esbuild - JavaScript bundler for production builds
- tsx - TypeScript execution for development server

**Development Tools**:
- @replit/vite-plugin-runtime-error-modal - Error overlay
- @replit/vite-plugin-cartographer - Code mapping
- @replit/vite-plugin-dev-banner - Development indicators

**Type Safety**:
- TypeScript - Type checking across client, server, and shared code
- drizzle-zod - Drizzle schema to Zod converter

**Session Management**:
- express-session - Session middleware
- connect-pg-simple - PostgreSQL session store (configured but not yet active)

**Database**:
- @neondatabase/serverless - Serverless PostgreSQL driver
- drizzle-orm - Type-safe ORM