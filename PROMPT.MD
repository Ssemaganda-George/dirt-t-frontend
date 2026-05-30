
Use the “using-superpowers” skill to perform a comprehensive architecture, scalability, and reliability review of my payment system.

Your goal is to determine whether the current payment architecture can reliably support at least 200 concurrent users
 making bookings and payments without failures, data inconsistencies, duplicate charges, or poor user experience.

Act as a senior software architect, senior backend engineer, DevOps engineer, and payments specialist.

Analyze the following areas:

1. Payment Architecture Review
- Review the complete payment flow from booking creation to payment confirmation.
- Identify architectural weaknesses, bottlenecks, or single points of failure.
- Evaluate whether the system design follows industry best practices for online transactions.
- Check if the architecture is production-ready.

2. Concurrency & Scalability
Determine whether the system can safely handle:
- 50 concurrent users
- 100 concurrent users
- 200 concurrent users
- Future growth beyond 200 users

Look for:
- race conditions
- database locking issues
- duplicate payment risks
- transaction conflicts
- inventory/availability conflicts
- double booking scenarios
- request bottlenecks

3. Database Review
Analyze:
- database schema
- indexes
- query efficiency
- transaction handling
- row locking strategy
- data consistency mechanisms

Identify:
- slow queries
- missing indexes
- unnecessary database calls
- scaling limitations

4. Payment Reliability
Check whether the system safely handles:
- payment gateway timeouts
- network failures
- browser refreshes
- duplicate clicks on Pay buttons
- webhook delays
- webhook failures
- partial payment completion
- interrupted transactions

Verify:
- idempotency implementation
- retry mechanisms
- reconciliation processes

5. Booking & Payment Consistency
Determine whether:
- users can pay for unavailable bookings
- users can create duplicate bookings
- bookings can exist without valid payments
- payments can succeed while bookings fail
- inventory can become inconsistent

Identify all data integrity risks.

6. API & Backend Review
Evaluate:
- endpoint performance
- request handling
- validation
- authentication
- authorization
- error handling
- rate limiting

Identify:
- security vulnerabilities
- scalability issues
- unnecessary API calls

7. Load & Performance Assessment
Estimate:
- likely breaking points
- expected bottlenecks
- server resource requirements
- database pressure points

Provide an assessment of whether the current implementation can realistically support 200 concurrent users.

8. Security Review
Check for:
- payment data exposure
- insecure API endpoints
- webhook vulnerabilities
- replay attacks
- authorization flaws
- trust issues between frontend and backend

Compare against common payment security best practices.

9. Deliverables
Provide:

- Executive Summary
- Architecture Score (1–10)
- Scalability Score (1–10)
- Reliability Score (1–10)
- Security Score (1–10)
- Critical Risks
- High Priority Issues
- Medium Priority Issues
- Low Priority Issues
- Bottlenecks
- Recommended Improvements
- Load Handling Assessment
- Can It Handle 200 Concurrent Users? (Yes/No with justification)
- Roadmap to Support 1,000+ Concurrent Users

Be extremely critical and practical.
Do not assume anything works correctly.
Trace the entire payment lifecycle and identify every potential failure point before declaring the architecture production-ready.
```
