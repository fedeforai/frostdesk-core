# Architecture

## Overview

FrostDesk follows a modular monorepo architecture with clear separation of concerns.

## Components

### Web App (`apps/web`)
- Frontend application built with Vite
- React/TypeScript for UI
- Communicates with API via REST
- Real-time updates via Supabase Realtime subscriptions

### API (`apps/api`)
- Backend server handling business logic
- RESTful endpoints for ticket operations
- Integrates with OpenAI for AI responses
- Manages Supabase database operations

### Worker (Future)
- Background job processing
- Async AI response generation
- Scheduled tasks

## Data Flow

1. User creates ticket → Web app → API → Supabase
2. AI response request → API → OpenAI → API → Supabase
3. Real-time updates → Supabase Realtime → Web app

## Single Source of Truth

- **Database**: Supabase PostgreSQL is the authoritative data store
- **Event Types**: Defined in `packages/shared` for consistency
- **API Contracts**: Shared TypeScript types across web and API

## Event Types

Core events defined in shared package:
- `ticket.created`
- `ticket.updated`
- `ticket.assigned`
- `ticket.resolved`

## Technology Stack

- **Frontend**: Vite, React, TypeScript
- **Backend**: Node.js, Express/Fastify
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI API
- **Real-time**: Supabase Realtime
