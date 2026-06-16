// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")
const FROM_EMAIL = Deno.env.get("FROM_EMAIL")
const FRONTEND_URL = Deno.env.get("FRONTEND_URL") || "https://bookings.dirt-trails.com"
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

function formatJobType(jobType: string): string {
  if (jobType === "booking_fulfillment") return "Booking fulfillment"
  if (jobType === "order_fulfillment") return "Order fulfillment"
  return jobType
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS })
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    })
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Server not configured" }), {
        status: 503,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      })
    }

    const body = await req.json().catch(() => ({}))
    const jobId = body.job_id || body.jobId
    if (!jobId) {
      return new Response(JSON.stringify({ error: "Missing job_id" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: job, error: jobErr } = await supabase
      .from("payment_fulfillment_jobs")
      .select(
        "id, job_type, source_id, status, attempts, max_attempts, last_error, payload, created_at, failure_alerted_at",
      )
      .eq("id", jobId)
      .maybeSingle()

    if (jobErr || !job) {
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      })
    }

    if (job.status !== "failed") {
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "not_failed" }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      })
    }

    if (job.failure_alerted_at) {
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "already_alerted" }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      })
    }

    if (!RESEND_API_KEY || !FROM_EMAIL) {
      console.warn("notify-fulfillment-job-failed: email not configured, skipping send")
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "email_not_configured" }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      })
    }

    const { data: adminProfiles } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("role", "admin")

    const adminEmails = (adminProfiles || []).map((a: any) => a.email).filter(Boolean)
    if (adminEmails.length === 0) {
      console.warn("notify-fulfillment-job-failed: no admin emails")
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "no_admins" }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      })
    }

    const jobLabel = formatJobType(job.job_type)
    const reference = (job.payload as any)?.reference || "—"
    const amount = (job.payload as any)?.amount
    const adminUrl = `${FRONTEND_URL}/admin/transactions`
    const dashboardUrl = `https://supabase.com/dashboard/project/ywxvgfhwmnwzsafwmpil/editor`

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 640px; margin: 0 auto; padding: 20px; }
          .header { background-color: #b91c1c; color: white; padding: 24px 20px; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 22px; }
          .content { background: #fef2f2; padding: 24px; border: 1px solid #fecaca; }
          .field { margin-bottom: 12px; }
          .label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
          .value { font-size: 15px; font-weight: 600; color: #111827; margin-top: 2px; word-break: break-all; }
          .error-box { background: #fff; border: 1px solid #fca5a5; border-radius: 6px; padding: 12px; font-family: monospace; font-size: 13px; color: #991b1b; }
          .cta { display: inline-block; margin-top: 16px; margin-right: 12px; padding: 12px 20px; background-color: #1a56db; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; }
          .footer { text-align: center; padding: 16px; color: #9ca3af; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment fulfillment job failed</h1>
          </div>
          <div class="content">
            <p>A post-payment fulfillment job exhausted all retries. The customer may have paid but settlement, tickets, or emails may be incomplete.</p>
            <div class="field">
              <div class="label">Job type</div>
              <div class="value">${jobLabel}</div>
            </div>
            <div class="field">
              <div class="label">Source ID</div>
              <div class="value">${job.source_id}</div>
            </div>
            <div class="field">
              <div class="label">Job ID</div>
              <div class="value">${job.id}</div>
            </div>
            <div class="field">
              <div class="label">Payment reference</div>
              <div class="value">${reference}</div>
            </div>
            ${amount != null ? `
            <div class="field">
              <div class="label">Amount (payload)</div>
              <div class="value">${amount}</div>
            </div>` : ""}
            <div class="field">
              <div class="label">Attempts</div>
              <div class="value">${job.attempts} / ${job.max_attempts}</div>
            </div>
            <div class="field">
              <div class="label">Last error</div>
              <div class="error-box">${(job.last_error || body.last_error || "unknown").replace(/</g, "&lt;")}</div>
            </div>
            <a href="${adminUrl}" class="cta">Open admin &rarr;</a>
            <a href="${dashboardUrl}" class="cta" style="background:#374151;">Supabase editor &rarr;</a>
          </div>
          <div class="footer">
            <p>Automated ops alert from DirtTrails payment fulfillment queue.</p>
          </div>
        </div>
      </body>
      </html>
    `

    const fromEmail = FROM_EMAIL.includes("<") ? FROM_EMAIL : `DirtTrails <${FROM_EMAIL}>`
    const subject = `[Action required] ${jobLabel} failed — ${job.source_id.slice(0, 8)}`
    const notified: string[] = []

    for (const adminEmail of adminEmails) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [adminEmail],
            subject,
            html: emailHtml,
          }),
        })
        if (res.ok) {
          notified.push(adminEmail)
        } else {
          console.error(`Failed to alert ${adminEmail}:`, await res.text())
        }
      } catch (e) {
        console.error(`Error alerting ${adminEmail}:`, e)
      }
    }

    if (notified.length > 0) {
      const { error: markErr } = await supabase
        .from("payment_fulfillment_jobs")
        .update({ failure_alerted_at: new Date().toISOString() })
        .eq("id", jobId)
        .eq("status", "failed")
        .is("failure_alerted_at", null)

      if (markErr) {
        console.warn("Could not mark failure_alerted_at:", markErr.message)
      }
    }

    return new Response(
      JSON.stringify({ success: true, notified, job_id: jobId }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    )
  } catch (err: any) {
    console.error("notify-fulfillment-job-failed error:", err)
    return new Response(
      JSON.stringify({ error: err?.message || "Internal server error" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    )
  }
})
