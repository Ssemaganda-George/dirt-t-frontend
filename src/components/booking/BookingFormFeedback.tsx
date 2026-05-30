/** Inline validation UI for booking flows */

export function BookingFormBanner({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div
      role="alert"
      className="bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3 rounded-lg"
    >
      {message}
    </div>
  )
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="mt-1 text-sm text-red-600" role="alert" id={message.slice(0, 20)}>
      {message}
    </p>
  )
}
