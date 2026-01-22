import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Upload, Image, Video, Trash2, Eye, Settings, CheckCircle, XCircle, Plus, ChevronUp, ChevronDown } from 'lucide-react'

export default function AdminHeroVideoManager() {
  const [mediaUrl, setMediaUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image')
  const [gallery, setGallery] = useState<Array<{ url: string; type: 'image' | 'video'; name: string; active?: boolean; order?: number }>>([])

  useEffect(() => {
    // Fetch all hero media from the DB (not just storage)
    const fetchGallery = async () => {
      const { data, error } = await supabase
        .from('hero_videos')
        .select('*')
        .order('order', { ascending: true })
      if (error) {
        setError('Failed to fetch hero media: ' + error.message)
        return
      }
      setGallery(
        (data || []).map(item => ({
          url: item.url,
          type: item.type,
          name: item.id, // use DB id as unique key
          active: item.is_active,
          order: item.order
        }))
      )
    }
    fetchGallery()
  }, [success])

  // Update order for a media item
  const handleOrderChange = async (id: string, newOrder: number) => {
    // Update in DB
    const { error } = await supabase
      .from('hero_videos')
      .update({ order: newOrder })
      .eq('id', id)
    if (error) {
      setError('Failed to update order: ' + error.message)
    } else {
      setSuccess('Order updated!')
      setError('')
    }
  };

  // Toggle active state for a media item (persisted, allow multiple active)
  const handleToggleActive = async (id: string, currentActive: boolean) => {
    const { error } = await supabase
      .from('hero_videos')
      .update({ is_active: !currentActive })
      .eq('id', id)
    if (error) {
      setError('Failed to update active state: ' + error.message)
    } else {
      setSuccess('Active state updated!')
      setError('')
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this media? This action cannot be undone.')) {
      return;
    }

    // Find the item to get the URL for storage deletion
    const item = gallery.find(item => item.name === id);
    if (!item) {
      setError('Item not found');
      return;
    }

    // Delete from database first
    const { error: dbError } = await supabase
      .from('hero_videos')
      .delete()
      .eq('id', id);

    if (dbError) {
      setError('Failed to delete from database: ' + dbError.message);
      return;
    }

    // Extract file name from URL for storage deletion
    // URL format: https://[bucket].supabase.co/storage/v1/object/public/hero-videos/filename
    const urlParts = item.url.split('/');
    const fileName = urlParts[urlParts.length - 1];

    // Only try to delete from storage if it's not the fallback image (which is from pexels)
    if (fileName && !item.url.includes('pexels.com')) {
      const { error: storageError } = await supabase.storage.from('hero-videos').remove([fileName]);
      if (storageError) {
        console.warn('Failed to delete from storage:', storageError.message);
        // Don't show error to user since DB deletion succeeded
      }
    }

    setSuccess('Deleted successfully!');
    setError('');
    setGallery(gallery.filter(item => item.name !== id));
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setError('')
      setSuccess('')
    }
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setError('')
    setSuccess('')
    const fileExt = file.name.split('.').pop()
    const fileName = `hero-bg-${Date.now()}.${fileExt}`
    const { error: uploadError } = await supabase.storage.from('hero-videos').upload(fileName, file)
    if (uploadError) {
      setError(uploadError.message)
      setUploading(false)
      return
    }
    const { data: publicUrlData } = supabase.storage.from('hero-videos').getPublicUrl(fileName)
    const url = publicUrlData?.publicUrl || ''
    // Insert into DB
    const { error: dbError } = await supabase.from('hero_videos').insert({
      url,
      type: mediaType,
      order: gallery.length + 1,
      is_active: false
    })
    if (dbError) {
      setError(dbError.message)
      setUploading(false)
      return
    }
    setMediaUrl(url)
    setSuccess('Media uploaded successfully!')
    setUploading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Settings className="h-8 w-8 text-blue-600" />
            Hero Media Manager
          </h1>
          <p className="mt-2 text-gray-600">Manage your website's hero section background images and videos</p>
        </div>

        {/* Status Messages */}
        {(error || success) && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            error ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-green-50 border border-green-200 text-green-800'
          }`}>
            {error ? <XCircle className="h-5 w-5 flex-shrink-0" /> : <CheckCircle className="h-5 w-5 flex-shrink-0" />}
            <span className="text-sm font-medium">{error || success}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <Plus className="h-5 w-5 text-blue-600" />
                Upload New Media
              </h2>

              {/* Media Type Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">Media Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                      mediaType === 'image'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                    onClick={() => setMediaType('image')}
                  >
                    <Image className="h-4 w-4" />
                    Image
                  </button>
                  <button
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                      mediaType === 'video'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                    onClick={() => setMediaType('video')}
                  >
                    <Video className="h-4 w-4" />
                    Video
                  </button>
                </div>
              </div>

              {/* File Upload */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">Select File</label>
                <div className="relative">
                  <input
                    type="file"
                    accept={mediaType === 'image' ? 'image/*' : 'video/*'}
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                  >
                    <div className="text-center">
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <span className="text-sm font-medium text-gray-600">
                        {file ? file.name : `Choose ${mediaType} file`}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {mediaType === 'image' ? 'PNG, JPG, GIF up to 10MB' : 'MP4, WebM up to 50MB'}
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Upload Button */}
              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload {mediaType === 'image' ? 'Image' : 'Video'}
                  </>
                )}
              </button>

              {/* Preview */}
              {mediaUrl && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Preview</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    {mediaType === 'video' ? (
                      <video src={mediaUrl} controls className="w-full rounded-lg shadow-sm" />
                    ) : (
                      <img src={mediaUrl} alt="Hero" className="w-full rounded-lg shadow-sm" />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Gallery Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Eye className="h-5 w-5 text-blue-600" />
                  Media Gallery
                </h2>
                <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  {gallery.length} item{gallery.length !== 1 ? 's' : ''}
                </span>
              </div>

              {gallery.length === 0 ? (
                <div className="text-center py-12">
                  <Image className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No media uploaded yet</h3>
                  <p className="text-gray-500">Upload your first hero image or video to get started</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {gallery.map(item => (
                    <div key={item.name} className="group relative bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      {/* Media Preview */}
                      <div className="aspect-video bg-gray-100 relative overflow-hidden">
                        {item.type === 'video' ? (
                          <video
                            src={item.url}
                            className="w-full h-full object-cover"
                            muted
                            onMouseEnter={(e) => e.currentTarget.play()}
                            onMouseLeave={(e) => e.currentTarget.pause()}
                          />
                        ) : (
                          <img src={item.url} alt="Hero" className="w-full h-full object-cover" />
                        )}

                        {/* Overlay with type indicator */}
                        <div className="absolute top-2 left-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            item.type === 'video'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {item.type === 'video' ? <Video className="h-3 w-3" /> : <Image className="h-3 w-3" />}
                            {item.type}
                          </span>
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <button
                            onClick={() => handleToggleActive(item.name, !!item.active)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                              item.active ? 'bg-green-600' : 'bg-gray-200'
                            }`}
                            title={item.active ? 'Click to deactivate' : 'Click to activate'}
                          >
                            <span
                              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                item.active ? 'translate-x-5' : 'translate-x-1'
                              }`}
                            />
                          </button>

                          <button
                            onClick={() => handleDelete(item.name)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-xs font-medium bg-red-100 text-red-800 hover:bg-red-200 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>

                        {/* Order control */}
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-medium text-gray-600">Order:</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={1}
                              value={item.order || ''}
                              onChange={e => {
                                const value = e.target.value;
                                const numValue = value === '' ? null : Number(value);
                                handleOrderChange(item.name, numValue || 1);
                              }}
                              className="w-12 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="1"
                            />
                            <div className="flex flex-col gap-0.5">
                              <button
                                onClick={() => handleOrderChange(item.name, (item.order || 1) + 1)}
                                className="p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
                                title="Increase order"
                              >
                                <ChevronUp className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handleOrderChange(item.name, Math.max(1, (item.order || 1) - 1))}
                                className="p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
                                title="Decrease order"
                              >
                                <ChevronDown className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}