/**
 * Dynamic Business Recommendations Engine
 * 
 * Generates different professional advice every day per vendor,
 * based on their actual financial & transaction data.
 * 
 * Uses date + vendorId hash for deterministic daily rotation
 * so each vendor sees unique, personalized content every day.
 */

export interface VendorMetrics {
  currentBalance: number
  totalEarned: number
  pendingBalance: number
  completedBalance: number
  pendingWithdrawals: number
  totalWithdrawn: number
  currency: string
  totalTransactions: number
  completedTransactions: number
  failedTransactions: number
  avgTransactionAmount: number
  successRate: number // 0-100
}

export interface Recommendation {
  title: string
  message: string
}

export interface RecommendationSet {
  financial: Recommendation[]
  performance: Recommendation[]
  growth: Recommendation[]
  risk: Recommendation[]
  actions: { label: string; desc: string }[]
}

// ─── Financial Health Tips Pool ────────────────────────────────────────────

function getFinancialTips(m: VendorMetrics): Recommendation[] {
  const pool: Recommendation[] = []

  // Balance-based tips
  if (m.currentBalance < 500000) {
    pool.push(
      { title: "Build Your Cash Reserves", message: `Your balance of ${fmt(m.currentBalance, m.currency)} is below the recommended 3-month buffer. Focus on increasing revenue or reducing expenses to strengthen your financial cushion.` },
      { title: "Revenue Acceleration", message: `Consider running limited-time promotions to boost bookings and quickly build up your operating reserve. Even a 15% increase in bookings this month would significantly improve your position.` },
      { title: "Expense Audit", message: `Review your operating costs line by line. Small savings across multiple areas compound significantly. Aim to identify at least 10% in potential savings.` },
    )
  } else {
    pool.push(
      { title: "Healthy Cash Position", message: `Your balance of ${fmt(m.currentBalance, m.currency)} gives you a strong operating foundation. Consider allocating 20% toward growth initiatives while maintaining your reserve.` },
      { title: "Investment Opportunity", message: `With a solid ${fmt(m.currentBalance, m.currency)} reserve, now is a good time to invest in service quality improvements that can drive higher-value bookings.` },
      { title: "Strategic Reserves", message: `Your current balance supports approximately ${Math.floor(m.currentBalance / Math.max(m.avgTransactionAmount, 1))} average transactions in reserve. This is a healthy position for business stability.` },
    )
  }

  // Withdrawal-based tips
  if (m.pendingWithdrawals > 0) {
    pool.push(
      { title: "Pending Withdrawal Review", message: `You have ${fmt(m.pendingWithdrawals, m.currency)} in pending withdrawals. Plan your operating expenses accordingly while these are being processed.` },
    )
  }

  if (m.totalWithdrawn > m.totalEarned * 0.7) {
    pool.push(
      { title: "Withdrawal Balance", message: `You've withdrawn ${Math.round((m.totalWithdrawn / Math.max(m.totalEarned, 1)) * 100)}% of total earnings. Consider retaining more for reinvestment. A 70/30 withdraw/retain ratio is ideal for growing businesses.` },
    )
  } else {
    pool.push(
      { title: "Smart Profit Distribution", message: `You're retaining a good portion of earnings for the business. Consider withdrawing ${fmt(Math.round(m.currentBalance * 0.3), m.currency)} this month while keeping the rest for operations and growth.` },
    )
  }

  // Earnings milestones
  if (m.totalEarned > 10000000) {
    pool.push({ title: "Revenue Milestone", message: `Congratulations on exceeding ${fmt(10000000, m.currency)} in total earnings! At this scale, consider diversifying your service portfolio and exploring premium pricing tiers.` })
  } else if (m.totalEarned > 5000000) {
    pool.push({ title: "Growth Trajectory", message: `With ${fmt(m.totalEarned, m.currency)} in total earnings, you're building a solid business foundation. Focus on consistency and customer satisfaction to reach the next milestone.` })
  } else {
    pool.push({ title: "Building Momentum", message: `Every transaction builds your business reputation. Stay focused on delivering excellent service and the financial results will follow. Your current trajectory shows promise.` })
  }

  // Pending earnings
  if (m.pendingBalance > 0) {
    pool.push(
      { title: "Pending Revenue Management", message: `You have ${fmt(m.pendingBalance, m.currency)} in pending earnings. Focus on completing these bookings promptly — faster completion means faster access to funds.` },
    )
  }

  return pool
}

// ─── Performance Tips Pool ─────────────────────────────────────────────────

function getPerformanceTips(m: VendorMetrics): Recommendation[] {
  const pool: Recommendation[] = []

  // Success rate based
  if (m.successRate >= 95) {
    pool.push(
      { title: "Elite Performance", message: `Your ${m.successRate}% success rate puts you in the top tier of vendors. This level of reliability is your strongest competitive advantage — it builds trust and drives repeat bookings.` },
      { title: "Quality Premium", message: `With a ${m.successRate}% completion rate, you've earned the credibility to command premium pricing. Customers willingly pay more for guaranteed quality and reliability.` },
      { title: "Consistency Champion", message: `Maintaining ${m.successRate}% completion across ${m.totalTransactions} transactions is exceptional. Share your best practices with your team to ensure this standard continues as you scale.` },
    )
  } else if (m.successRate >= 80) {
    pool.push(
      { title: "Strong Performance", message: `Your ${m.successRate}% success rate is solid. To push past 95%, analyze the ${m.failedTransactions} unsuccessful transactions for patterns — timing, service type, or communication gaps.` },
      { title: "Service Recovery", message: `Each of your ${m.failedTransactions} failed transactions is a learning opportunity. Implementing a follow-up process for declined bookings can recover up to 30% of lost business.` },
      { title: "Communication Upgrade", message: `Most booking failures stem from miscommunication. Consider sending confirmation messages 24 hours before service delivery to reduce no-shows and cancellations.` },
    )
  } else {
    pool.push(
      { title: "Performance Recovery Plan", message: `Your ${m.successRate}% success rate needs attention. Prioritize identifying the root causes of ${m.failedTransactions} failed transactions — common issues include overbooking, unclear service descriptions, or response delays.` },
      { title: "Customer Communication", message: `Improving response times to inquiries can significantly boost your completion rate. Aim to respond within 2 hours during business hours to capture customer interest.` },
      { title: "Service Description Clarity", message: `Clear, detailed service descriptions set proper expectations and reduce cancellations. Review your listings for accuracy in pricing, timing, and deliverables.` },
    )
  }

  // Pricing insights
  if (m.avgTransactionAmount > 0) {
    pool.push(
      { title: "Pricing Analysis", message: `Your average transaction of ${fmt(m.avgTransactionAmount, m.currency)} positions you in the market. Review competitor pricing quarterly and consider value-based pricing that reflects the quality of your service.` },
      { title: "Revenue Per Booking", message: `Each booking averages ${fmt(m.avgTransactionAmount, m.currency)}. Explore upselling complementary services or add-ons to increase revenue per customer by 15-25%.` },
      { title: "Price Optimization", message: `Based on your ${fmt(m.avgTransactionAmount, m.currency)} average, test a small price increase of 5-10% on your most popular services. Track impact on bookings over 2 weeks before making permanent changes.` },
    )
  }

  // Volume milestones
  if (m.totalTransactions > 100) {
    pool.push({ title: "High Volume Efficiency", message: `With ${m.totalTransactions} transactions under your belt, focus on operational efficiency. Streamline your workflow, create templates for common communications, and consider automation tools.` })
  } else if (m.totalTransactions > 30) {
    pool.push({ title: "Building Track Record", message: `${m.totalTransactions} transactions is a solid foundation. Each successful delivery strengthens your reputation. Focus on collecting positive reviews from satisfied customers.` })
  } else {
    pool.push({ title: "Early Stage Growth", message: `With ${m.totalTransactions} transactions, you're in the critical early phase. Every customer interaction matters — go above and beyond to build word-of-mouth referrals that fuel organic growth.` })
  }

  return pool
}

// ─── Growth Tips Pool ──────────────────────────────────────────────────────

function getGrowthTips(m: VendorMetrics): Recommendation[] {
  const pool: Recommendation[] = [
    { title: "Service Diversification", message: `Expanding your service menu can attract new customer segments. Analyze which services generate the most inquiries and consider adding complementary offerings.` },
    { title: "Seasonal Strategy", message: `Plan special packages for upcoming holidays and peak seasons. Vendors who prepare seasonal offerings 4-6 weeks in advance capture 40% more bookings during peak periods.` },
    { title: "Digital Presence", message: `Ensure your service photos are high-quality and your descriptions are compelling. Listings with professional images receive 3x more inquiries than those without.` },
    { title: "Customer Loyalty Program", message: `Consider offering returning customers a small discount or priority booking. Acquiring a new customer costs 5x more than retaining an existing one.` },
    { title: "Referral Strategy", message: `Happy customers are your best marketers. Create a simple referral incentive — even a 10% discount for both referrer and new customer drives significant growth.` },
    { title: "Review Collection", message: `Actively request reviews after successful service delivery. Vendors with 10+ positive reviews see a 35% increase in booking conversion rates.` },
    { title: "Peak Hour Optimization", message: `Analyze your booking patterns to identify peak demand hours. Offering premium pricing during high-demand slots and discounts during off-peak times maximizes revenue.` },
    { title: "Partnership Opportunities", message: `Explore partnerships with complementary service providers. Cross-referrals and bundled offerings can expand your reach without additional marketing spend.` },
    { title: "Geographic Expansion", message: `If you're seeing consistent demand, consider expanding your service area. Start with adjacent locations where travel costs are minimal but customer base doubles.` },
    { title: "Skill Development", message: `Investing in training and certifications adds credibility to your profile. Certified vendors often command 20-30% higher prices than non-certified competitors.` },
    { title: "Social Proof Building", message: `Showcase your best work through before/after photos, customer testimonials, and project stories. Social proof is the #1 factor in converting new inquiries to bookings.` },
    { title: "Repeat Business Focus", message: `Track which customers book multiple times. Send them personalized offers and maintain relationships — repeat customers typically spend 67% more than first-time buyers.` },
  ]

  // Add metric-specific growth tips
  if (m.totalTransactions > 50) {
    pool.push({ title: "Scale-Up Readiness", message: `With ${m.totalTransactions} transactions and ${fmt(m.totalEarned, m.currency)} earned, your business model is validated. Consider hiring help or subcontracting to handle increased demand without sacrificing quality.` })
  }

  if (m.completedBalance > 5000000) {
    pool.push({ title: "Premium Tier Launch", message: `Your earnings history supports launching a premium service tier. Offer an elevated experience at 50-100% higher pricing — even capturing 10% of customers at this level significantly boosts revenue.` })
  }

  return pool
}

// ─── Risk Management Tips Pool ─────────────────────────────────────────────

function getRiskTips(m: VendorMetrics): Recommendation[] {
  const pool: Recommendation[] = [
    { title: "Emergency Fund Target", message: `Aim to maintain ${fmt(Math.max(m.avgTransactionAmount * 10, 1000000), m.currency)} as an emergency fund. This covers unexpected expenses and keeps your business running during slow periods.` },
    { title: "Service Quality Audits", message: `Schedule monthly self-audits of your service delivery. Consistent quality prevents negative reviews and reduces refund requests that eat into profits.` },
    { title: "Backup Planning", message: `Have contingency plans for common disruptions — equipment failure, weather issues, or scheduling conflicts. Prepared vendors maintain customer trust even when things go wrong.` },
    { title: "Insurance Review", message: `Review your business insurance coverage annually. Adequate protection prevents a single incident from causing catastrophic financial damage to your growing business.` },
    { title: "Contract Clarity", message: `Clear service agreements protect both you and your customers. Document scope, timing, pricing, and cancellation policies to prevent disputes and chargebacks.` },
    { title: "Diversification Shield", message: `Don't rely on a single service or customer type for all revenue. Businesses with 3+ revenue streams are 4x more resilient during economic downturns.` },
    { title: "Cash Flow Forecasting", message: `Track your income and expenses weekly. Predicting cash flow 30 days ahead helps you make informed decisions about spending, pricing, and investment.` },
    { title: "Competitor Monitoring", message: `Stay aware of competitor pricing and offerings without obsessing over them. Understanding the market helps you position your services for maximum value.` },
    { title: "Legal Compliance", message: `Ensure your business meets all local licensing and tax requirements. Non-compliance risks can result in fines that far exceed the cost of staying current.` },
    { title: "Technology Backup", message: `Maintain backup access to your booking and communication tools. Being unreachable even for a few hours during peak times can cost significant business.` },
  ]

  // Failure-specific tips
  if (m.failedTransactions > 5) {
    pool.push(
      { title: "Failure Pattern Analysis", message: `With ${m.failedTransactions} failed transactions, conduct a root cause analysis. Categorize failures by type (cancellation, no-show, dispute) and create targeted prevention strategies for each.` },
      { title: "Recovery Protocol", message: `Develop a standard recovery process for failed transactions. A well-handled service recovery can actually increase customer loyalty compared to a transaction that went perfectly.` },
    )
  } else if (m.failedTransactions <= 2) {
    pool.push({ title: "Low Risk Profile", message: `Only ${m.failedTransactions} failed transactions is excellent risk management. Maintain your screening and communication processes that keep this number low.` })
  }

  return pool
}

// ─── Action Items Pool ─────────────────────────────────────────────────────

function getActionItems(m: VendorMetrics): { label: string; desc: string }[] {
  const pool = [
    { label: "Review Pricing Strategy", desc: "Compare your rates with market averages" },
    { label: "Collect Customer Feedback", desc: "Send follow-up messages after service" },
    { label: "Update Service Photos", desc: "Refresh listings with high-quality images" },
    { label: "Build Cash Reserves", desc: `Target ${fmt(Math.max(m.avgTransactionAmount * 10, 1000000), m.currency)} emergency fund` },
    { label: "Performance Dashboard Review", desc: "Analyze this week's key metrics" },
    { label: "Respond to Pending Inquiries", desc: "Clear your inbox within 2 hours" },
    { label: "Plan Next Month's Promotions", desc: "Create seasonal or event-based offers" },
    { label: "Service Description Update", desc: "Ensure all listings are accurate and compelling" },
    { label: "Review Competitor Offerings", desc: "Stay informed about market positioning" },
    { label: "Network with Partners", desc: "Reach out to complementary service providers" },
    { label: "Track Weekly Revenue Goals", desc: `Aim for ${fmt(Math.round(m.avgTransactionAmount * 5), m.currency)} weekly target` },
    { label: "Request Customer Reviews", desc: "Follow up with recent satisfied customers" },
    { label: "Optimize Booking Availability", desc: "Update your calendar for maximum bookings" },
    { label: "Prepare Financial Summary", desc: "Document monthly income and expenses" },
    { label: "Set Quarterly Goals", desc: "Define clear targets for the next 90 days" },
    { label: "Review Cancellation Policy", desc: "Ensure policies are fair and clear" },
    { label: "Explore New Service Areas", desc: "Research demand in adjacent categories" },
    { label: "Team Communication Check", desc: "Align with staff on service standards" },
  ]

  return pool
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function fmt(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString()}`
}

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return Math.abs(hash)
}

function getTodayKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/**
 * Deterministically pick N items from a pool, seeded by vendorId + date.
 */
function pickFromPool<T>(pool: T[], count: number, vendorId: string, category: string): T[] {
  const dateKey = getTodayKey()
  const seed = hashString(`${vendorId}-${category}-${dateKey}`)
  
  if (pool.length <= count) return pool

  // Fisher-Yates shuffle with seeded pseudo-random
  const shuffled = [...pool]
  let currentSeed = seed
  for (let i = shuffled.length - 1; i > 0; i--) {
    // Simple LCG pseudo-random
    currentSeed = (currentSeed * 1664525 + 1013904223) & 0x7fffffff
    const j = currentSeed % (i + 1)
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  return shuffled.slice(0, count)
}

// ─── Main Export ───────────────────────────────────────────────────────────

/**
 * Generate a complete set of daily recommendations personalized for a vendor.
 * 
 * - Changes every day (based on UTC date)
 * - Different per vendor (based on vendor ID)
 * - Adapts to actual vendor metrics (balance, success rate, etc.)
 * 
 * @param vendorId - Unique vendor identifier
 * @param metrics - Vendor's actual financial/transaction data
 * @returns A set of 2 recommendations per category + 4 action items
 */
export function getDailyRecommendations(vendorId: string, metrics: VendorMetrics): RecommendationSet {
  const financial = pickFromPool(getFinancialTips(metrics), 2, vendorId, 'financial')
  const performance = pickFromPool(getPerformanceTips(metrics), 2, vendorId, 'performance')
  const growth = pickFromPool(getGrowthTips(metrics), 2, vendorId, 'growth')
  const risk = pickFromPool(getRiskTips(metrics), 2, vendorId, 'risk')
  const actions = pickFromPool(getActionItems(metrics), 4, vendorId, 'actions')

  return { financial, performance, growth, risk, actions }
}
