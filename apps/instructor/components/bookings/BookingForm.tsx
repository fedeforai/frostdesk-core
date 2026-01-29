"use client"

import { useState } from "react"
import { createInstructorBooking } from "@/lib/instructorApi"

export function BookingForm() {
  const [customerName, setCustomerName] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await createInstructorBooking({
        customerName,
        startTime,
        endTime,
        notes: notes || undefined,
      })

      window.location.href = "/instructor/bookings"
    } catch (err: any) {
      setError(err.message ?? "Failed to create booking")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Customer name</label>
        <input
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          required
        />
      </div>

      <div>
        <label>Start time</label>
        <input
          type="datetime-local"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          required
        />
      </div>

      <div>
        <label>End time</label>
        <input
          type="datetime-local"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          required
        />
      </div>

      <div>
        <label>Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {error && <p>{error}</p>}

      <button type="submit" disabled={loading}>
        {loading ? "Creating..." : "Create booking"}
      </button>
    </form>
  )
}
