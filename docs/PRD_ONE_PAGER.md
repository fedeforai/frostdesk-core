# FrostDesk – AI Booking Concierge for Freelance Ski Instructors

## Product Vision

FrostDesk enables freelance ski instructors to manage bookings through WhatsApp conversations with an AI assistant. The AI handles inquiries, checks availability, and creates bookings automatically, freeing instructors to focus on teaching instead of admin work.

## Target User

Freelance ski instructor operating independently. Tech-comfortable, manages own schedule, receives booking requests via WhatsApp. Typically handles 5-20 bookings per week during season.

## Core Problem

Instructors waste 2-3 hours daily managing booking requests via WhatsApp. They manually check calendars, respond to availability questions, confirm details, and track bookings in spreadsheets or notes. This admin burden reduces teaching time and creates booking errors.

## Core Promise

Instructors receive booking requests via WhatsApp. FrostDesk AI responds instantly, checks availability, confirms details, and creates bookings automatically. Instructor only intervenes for exceptions.

## P0 User Flow

1. Customer sends WhatsApp message: "I need a lesson on Saturday at 10am"
2. FrostDesk AI receives message via webhook
3. AI checks instructor's availability (calendar integration or manual config)
4. AI responds: "Saturday 10am is available. 2-hour lesson is €150. Confirm?"
5. Customer confirms
6. AI creates booking in system
7. Instructor receives notification of new booking
8. AI sends confirmation to customer with booking details

## Success Metrics

**North Star:** Bookings created per week via AI (target: 80% of total bookings)

**Supporting:**
- Response time: < 5 seconds for availability check
- Booking accuracy: < 2% errors requiring manual correction

## Non-Goals (MVP Exclusions)

- Multi-instructor support or school management
- Marketplace or instructor discovery
- Payment processing (manual payment confirmation only)
- Calendar sync (manual availability management)
- Customer accounts or login
- Email or SMS channels (WhatsApp only)
- Advanced AI features (multi-turn conversations, context memory beyond current session)
- Analytics dashboard
- Mobile app

## Assumptions

- Instructors use WhatsApp for customer communication
- Availability can be managed via simple rules (time slots, days of week)
- Customers provide sufficient detail in initial message (date, time, duration)
- Instructor reviews bookings before lesson (no real-time validation needed)
- Single conversation thread per booking request

## Constraints

- WhatsApp Business API required for webhook integration
- Must handle WhatsApp message format and limitations
- Instructor availability data source TBD (manual config vs calendar API)
- No payment gateway integration in MVP
- Reliability and uptime prioritized over advanced features
- Single instructor scope (no multi-tenant architecture needed)
