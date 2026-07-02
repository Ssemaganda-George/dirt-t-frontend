/**
 * @deprecated Import MarzpayPaymentFields instead.
 * Kept for gradual migration — re-exports helpers from marzpayApi.
 */
export {
  isMobileUiMethod,
  isPaidOnlineMethod,
  type MarzpayUiMethod as UiPaymentMethod,
} from '../../lib/marzpayApi'

export { default } from './MarzpayPaymentFields'
