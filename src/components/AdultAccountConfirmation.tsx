type Props = {
  id: string
  checked: boolean
  onChange: (checked: boolean) => void
  birthDate: string
  onBirthDateChange: (value: string) => void
}

export default function AdultAccountConfirmation({ id, checked, onChange, birthDate, onBirthDateChange }: Props) {
  return (
    <div className="space-y-2 text-xs text-gray-700">
      <label htmlFor={`${id}BirthDate`} className="block font-medium">Your date of birth</label>
      <input id={`${id}BirthDate`} type="date" required value={birthDate} onChange={event => onBirthDateChange(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      <p>We use this date to check adult eligibility during signup and do not store the full date.</p>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-2">
        <input id={id} type="checkbox" required checked={checked} onChange={event => onChange(event.target.checked)} className="mt-0.5 h-4 w-4 accent-emerald-700" />
        <span>I confirm I am at least 18 years old. Travelers under 18 must have an adult create the account and manage their booking.</span>
      </label>
    </div>
  )
}
