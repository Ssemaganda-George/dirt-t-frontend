import { SIGNUP_PRIVACY_DISCLOSURE } from '../lib/privacyNotice'

type Props = {
  id: string
  checked: boolean
  onChange: (checked: boolean) => void
}

export default function SignupPrivacyConsent({ id, checked, onChange }: Props) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
      <p>{SIGNUP_PRIVACY_DISCLOSURE}</p>
      <p className="mt-2">
        Read the <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline">Privacy Policy</a> for details.
      </p>
      <label htmlFor={id} className="mt-3 flex cursor-pointer items-start gap-2 font-medium">
        <input id={id} type="checkbox" required checked={checked} onChange={event => onChange(event.target.checked)} className="mt-0.5 h-4 w-4 accent-emerald-700" />
        <span>I have read this privacy notice and agree to the stated use and sharing of my data to create an account.</span>
      </label>
    </div>
  )
}
