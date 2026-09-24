type Props = {
  id: string
  checked: boolean
  onChange: (checked: boolean) => void
}

export default function AdultAccountConfirmation({ id, checked, onChange }: Props) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-2 text-xs text-gray-700">
      <input id={id} type="checkbox" required checked={checked} onChange={event => onChange(event.target.checked)} className="mt-0.5 h-4 w-4 accent-emerald-700" />
      <span>I confirm I am at least 18 years old. Travelers under 18 must have an adult create the account and manage their booking.</span>
    </label>
  )
}
