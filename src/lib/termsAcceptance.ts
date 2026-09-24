import { supabase } from './supabaseClient'
import { BOOKING_TERMS_VERSION } from './termsVersion'
import { CHECKOUT_PRIVACY_DISCLOSURE, PRIVACY_NOTICE_VERSION } from './privacyNotice'

export async function recordTermsAcceptance(kind: 'booking' | 'order', id: string): Promise<void> {
  const { data: privacyRecorded, error: privacyError } = await supabase.rpc('record_checkout_privacy_consent', {
    p_kind: kind,
    p_subject_id: id,
    p_notice_version: PRIVACY_NOTICE_VERSION,
  })
  if (privacyError) throw privacyError
  if (!privacyRecorded) throw new Error('Could not record your privacy choice. Please try again.')

  const { data, error } = await supabase.rpc('record_booking_terms_acceptance', {
    p_kind: kind,
    p_subject_id: id,
    p_terms_version: BOOKING_TERMS_VERSION,
  })
  if (error) throw error
  if (!data) throw new Error('Could not record your agreement. Please try again.')
}

/** Require separate affirmative terms and privacy choices for each checkout. */
export function requestTermsAcceptance(): Promise<boolean> {
  return new Promise(resolve => {
    const dialog = document.createElement('dialog')
    dialog.className = 'max-h-[90dvh] w-[min(32rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 shadow-2xl backdrop:bg-black/50'

    const title = document.createElement('h2')
    title.className = 'text-xl font-semibold text-gray-900'
    title.textContent = 'Review your booking agreement'
    dialog.append(title)

    const explanation = document.createElement('p')
    explanation.className = 'mt-3 text-sm text-gray-700'
    explanation.textContent = 'Please read the DirtTrails Terms of Service, including booking, cancellation, and payment terms, before continuing.'
    dialog.append(explanation)

    const link = document.createElement('a')
    link.href = '/terms'
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    link.className = 'mt-2 inline-block text-sm font-medium text-emerald-700 underline'
    link.textContent = 'Read Terms of Service'
    dialog.append(link)

    const label = document.createElement('label')
    label.className = 'mt-5 flex cursor-pointer items-start gap-3 text-sm text-gray-800'
    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.className = 'mt-1 h-4 w-4 accent-emerald-700'
    const labelText = document.createElement('span')
    labelText.textContent = 'I have read and agree to the DirtTrails Terms of Service for this booking.'
    label.append(checkbox, labelText)
    dialog.append(label)

    const privacyNotice = document.createElement('p')
    privacyNotice.className = 'mt-5 text-sm text-gray-700'
    privacyNotice.textContent = CHECKOUT_PRIVACY_DISCLOSURE
    dialog.append(privacyNotice)

    const privacyLink = document.createElement('a')
    privacyLink.href = '/privacy'
    privacyLink.target = '_blank'
    privacyLink.rel = 'noopener noreferrer'
    privacyLink.className = 'mt-2 inline-block text-sm font-medium text-emerald-700 underline'
    privacyLink.textContent = 'Read Privacy Policy'
    dialog.append(privacyLink)

    const privacyLabel = document.createElement('label')
    privacyLabel.className = 'mt-3 flex cursor-pointer items-start gap-3 text-sm text-gray-800'
    const privacyCheckbox = document.createElement('input')
    privacyCheckbox.type = 'checkbox'
    privacyCheckbox.className = 'mt-1 h-4 w-4 accent-emerald-700'
    const privacyLabelText = document.createElement('span')
    privacyLabelText.textContent = 'I have read this privacy notice and agree to the stated sharing needed for this booking.'
    privacyLabel.append(privacyCheckbox, privacyLabelText)
    dialog.append(privacyLabel)

    const actions = document.createElement('div')
    actions.className = 'mt-6 flex justify-end gap-3'
    const cancel = document.createElement('button')
    cancel.type = 'button'
    cancel.className = 'rounded-lg border px-4 py-2 text-sm font-medium'
    cancel.textContent = 'Cancel'
    const accept = document.createElement('button')
    accept.type = 'button'
    accept.className = 'rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50'
    accept.textContent = 'Accept and continue'
    accept.disabled = true
    const updateAccept = () => { accept.disabled = !checkbox.checked || !privacyCheckbox.checked }
    checkbox.addEventListener('change', updateAccept)
    privacyCheckbox.addEventListener('change', updateAccept)
    cancel.addEventListener('click', () => dialog.close('cancel'))
    accept.addEventListener('click', () => dialog.close('accepted'))
    actions.append(cancel, accept)
    dialog.append(actions)

    dialog.addEventListener('close', () => {
      const accepted = dialog.returnValue === 'accepted'
      dialog.remove()
      resolve(accepted)
    }, { once: true })
    document.body.append(dialog)
    dialog.showModal()
    checkbox.focus()
  })
}
