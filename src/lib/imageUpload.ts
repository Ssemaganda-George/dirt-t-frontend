// =====================================================
// SERVICE IMAGE UPLOAD UTILITIES
// =====================================================
// Helper functions for uploading service images to Supabase Storage

import { supabase } from './supabaseClient'

export interface ImageUploadResult {
  success: boolean
  url?: string
  error?: string
}

/**
 * Upload a service image to Supabase Storage
 * @param file - The image file to upload
 * @param serviceId - The service ID (used for organizing files)
 * @param vendorId - The vendor ID (used for organizing files)
 * @returns Promise with upload result
 */
export async function uploadServiceImage(
  file: File,
  serviceId: string,
  vendorId: string
): Promise<ImageUploadResult> {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'File must be an image' }
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: 'File size must be less than 5MB' }
    }

    // Create unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${vendorId}/${serviceId}/${Date.now()}.${fileExt}`

    // Upload file to Supabase Storage
    const { error } = await supabase.storage
      .from('service-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Upload error:', error)
      return { success: false, error: error.message }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('service-images')
      .getPublicUrl(fileName)

    return {
      success: true,
      url: urlData.publicUrl
    }
  } catch (error) {
    console.error('Upload failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    }
  }
}

/**
 * Delete a service image from Supabase Storage
 * @param imageUrl - The full URL of the image to delete
 * @returns Promise with deletion result
 */
export async function deleteServiceImage(imageUrl: string): Promise<ImageUploadResult> {
  try {
    // Extract file path from URL
    const urlParts = imageUrl.split('/storage/v1/object/service-images/')
    if (urlParts.length !== 2) {
      return { success: false, error: 'Invalid image URL' }
    }

    const filePath = urlParts[1]

    const { error } = await supabase.storage
      .from('service-images')
      .remove([filePath])

    if (error) {
      console.error('Delete error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Delete failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed'
    }
  }
}

/**
 * Update service images array in database
 * @param serviceId - The service ID
 * @param images - Array of image URLs
 * @returns Promise with update result
 */
export async function updateServiceImages(
  serviceId: string,
  images: string[]
): Promise<ImageUploadResult> {
  try {
    console.log('Updating service images:', { serviceId, images })

    const { data, error } = await supabase
      .from('services')
      .update({
        images,
        primary_image_url: images.length > 0 ? images[0] : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', serviceId)
      .select('id, images, primary_image_url')

    if (error) {
      console.error('Update error:', error)
      return { success: false, error: `Database update failed: ${error.message}` }
    }

    if (!data || data.length === 0) {
      console.error('No data returned from update')
      return { success: false, error: 'Service update failed - no data returned' }
    }

    console.log('Service updated successfully:', data[0])
    return { success: true }
  } catch (error) {
    console.error('Update failed:', error)
    return {
      success: false,
      error: error instanceof Error ? `Update failed: ${error.message}` : 'Update failed'
    }
  }
}

/**
 * Add image to service
 * @param serviceId - The service ID
 * @param imageUrl - The image URL to add
 * @returns Promise with result
 */
export async function addServiceImage(
  serviceId: string,
  imageUrl: string
): Promise<ImageUploadResult> {
  try {
    // First check if user can access this service
    const { data: serviceCheck, error: checkError } = await supabase
      .from('services')
      .select('id, vendor_id')
      .eq('id', serviceId)
      .single()

    if (checkError) {
      console.error('Service access check failed:', checkError)
      return { success: false, error: 'Service not found or access denied' }
    }

    if (!serviceCheck) {
      return { success: false, error: 'Service not found' }
    }

    // Get current images
    const { data: service, error: fetchError } = await supabase
      .from('services')
      .select('images')
      .eq('id', serviceId)
      .single()

    if (fetchError) {
      console.error('Failed to fetch service images:', fetchError)
      return { success: false, error: `Failed to fetch service: ${fetchError.message}` }
    }

    const currentImages = service.images || []
    const updatedImages = [...currentImages, imageUrl]

    console.log('Updating service images:', { serviceId, currentImages, updatedImages })

    return await updateServiceImages(serviceId, updatedImages)
  } catch (error) {
    console.error('Add image failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Add image failed'
    }
  }
}

/**
 * Remove image from service
 * @param serviceId - The service ID
 * @param imageUrl - The image URL to remove
 * @returns Promise with result
 */
export async function removeServiceImage(
  serviceId: string,
  imageUrl: string
): Promise<ImageUploadResult> {
  try {
    // Get current images
    const { data: service, error: fetchError } = await supabase
      .from('services')
      .select('images')
      .eq('id', serviceId)
      .single()

    if (fetchError) {
      return { success: false, error: fetchError.message }
    }

    const currentImages = service.images || []
    const updatedImages = currentImages.filter((img: string) => img !== imageUrl)

    // Also delete from storage
    await deleteServiceImage(imageUrl)

    return await updateServiceImages(serviceId, updatedImages)
  } catch (error) {
    console.error('Remove image failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Remove image failed'
    }
  }
}