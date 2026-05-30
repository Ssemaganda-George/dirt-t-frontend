import { useState } from 'react'

interface TransportImageGalleryProps {
  images: string[]
  title: string
}

export default function TransportImageGallery({ images, title }: TransportImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  const goTo = (index: number) => setCurrentIndex(index)

  const handleTouchStart = (e: React.TouchEvent) => {
    e.currentTarget.setAttribute('data-touch-start', e.targetTouches[0].clientX.toString())
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = parseFloat(e.currentTarget.getAttribute('data-touch-start') || '0')
    const diff = start - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) {
      if (diff > 0) goTo((currentIndex + 1) % images.length)
      else goTo(currentIndex === 0 ? images.length - 1 : currentIndex - 1)
    }
  }

  const src = images?.[currentIndex] || 'https://images.pexels.com/photos/1320684/pexels-photo-1320684.jpeg'

  return (
    <div className="flex flex-col items-center mb-8">
      <div className="w-full max-w-4xl mx-auto flex flex-col lg:grid lg:grid-cols-3 gap-6 items-center">
        <div className="relative flex items-center justify-center w-full col-span-2">
          {images && images.length > 1 && (
            <button
              onClick={() => goTo(currentIndex === 0 ? images.length - 1 : currentIndex - 1)}
              className="absolute left-2 z-10 bg-white bg-opacity-70 hover:bg-opacity-90 rounded-full p-2 transition-colors border border-gray-200 shadow-sm"
              style={{ top: '50%', transform: 'translateY(-50%)' }}
              aria-label="Previous image"
            >
              <svg className="w-7 h-7 text-gray-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <img
            src={src}
            alt={title}
            className="rounded-xl object-cover mx-auto border border-gray-100 shadow-sm"
            style={{ width: '100%', maxWidth: 720, height: 420, objectFit: 'cover', background: '#f8fafc' }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          />
          {images && images.length > 1 && (
            <button
              onClick={() => goTo((currentIndex + 1) % images.length)}
              className="absolute right-2 z-10 bg-white bg-opacity-70 hover:bg-opacity-90 rounded-full p-2 transition-colors border border-gray-200 shadow-sm"
              style={{ top: '50%', transform: 'translateY(-50%)' }}
              aria-label="Next image"
            >
              <svg className="w-7 h-7 text-gray-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
          {images && images.length > 0 && (
            <div className="absolute bottom-3 right-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-xs font-semibold tracking-wide shadow">
              {currentIndex + 1} / {images.length}
            </div>
          )}
        </div>
        {images && images.length > 1 && (
          <div className="w-full flex lg:block overflow-x-auto pb-1 lg:pb-0 col-span-1 flex-col justify-center items-center h-full">
            <div className="flex lg:grid lg:grid-cols-2 lg:grid-rows-3 gap-3 lg:gap-4 w-full lg:h-[420px] items-center content-center">
              {images.map((img, index) => (
                <button
                  key={index}
                  onClick={() => goTo(index)}
                  className={`w-20 h-20 lg:w-[104px] lg:h-[128px] rounded-xl border-2 transition-all ${
                    currentIndex === index ? 'border-blue-600' : 'border-gray-200 hover:border-blue-400'
                  } flex-shrink-0 overflow-hidden bg-white shadow-sm`}
                  style={{ outline: currentIndex === index ? '2px solid #059669' : 'none' }}
                  aria-label={`Show image ${index + 1}`}
                >
                  <img src={img} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
