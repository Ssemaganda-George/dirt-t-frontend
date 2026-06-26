import { lazy, Suspense } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { useServiceDetailQuery } from '../hooks/useServiceDetailQuery'

const ShopPurchase = lazy(() => import('./ShopPurchase'))

function ShopPurchaseLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
    </div>
  )
}

export default function ShopPurchasePage() {
  const { slug } = useParams<{ slug: string }>()
  const { data, isLoading } = useServiceDetailQuery(slug)
  const service = data?.service ?? null

  if (isLoading) return <ShopPurchaseLoading />

  if (!service) return <Navigate to="/" replace />

  const categoryName = (service as any).service_categories?.name?.toLowerCase() ?? ''
  if (categoryName !== 'shops') {
    return <Navigate to={`/service/${slug}`} replace />
  }

  return (
    <Suspense fallback={<ShopPurchaseLoading />}>
      <ShopPurchase service={service as any} />
    </Suspense>
  )
}
