/**
 * @module features/feed/photo-upload-direct
 * @description Direct-to-blob photo upload implementation
 *
 * NEW ARCHITECTURE:
 * 1. Request SAS token from backend
 * 2. Upload directly to Azure Blob Storage
 * 3. Confirm upload with backend (AI moderation happens here)
 * 4. Return photo data in same format as old uploadMediaFiles()
 *
 * This replaces the broken multipart upload that was timing out.
 */

import { apiClient } from '../../core/api/client.js';
import {
    getImageDimensions,
    calculateFileHash,
    retryWithBackoff,
    validateImageFile
} from '../../../utils/photo-upload-utils.js';

/**
 * Upload photos directly to Azure Blob Storage
 *
 * @param {File|File[]} files - Single file or array of files to upload
 * @param {string} photoType - Type: 'POST_MEDIA', 'AVATAR', 'GALLERY', etc.
 * @param {string} purpose - Purpose: 'PERSONAL', 'CIVIC', etc.
 * @param {string} caption - Optional caption for photos
 * @param {string} gallery - Optional gallery name for organization
 * @returns {Promise<Object>} Upload response in same format as old uploadMediaFiles()
 */
export async function uploadPhotoDirectToBlob(files, photoType, purpose = 'PERSONAL', caption = '', gallery = null) {
    console.log('📸 uploadPhotoDirectToBlob called with:', { files, photoType, purpose, gallery });

    try {
        // Normalize to array
        const fileArray = Array.isArray(files) ? files : [files];
        console.log(`📸 Processing ${fileArray.length} file(s)`);

        // Validate all files first
        for (const file of fileArray) {
            const validation = validateImageFile(file);
            if (!validation.valid) {
                console.error('❌ File validation failed:', validation.error);
                return {
                    ok: false,
                    error: validation.error,
                    data: { error: validation.error }
                };
            }
        }

        // Upload each file
        const uploadedPhotos = [];
        for (let i = 0; i < fileArray.length; i++) {
            const file = fileArray[i];
            console.log(`📤 Uploading file ${i + 1}/${fileArray.length}: ${file.name}`);

            try {
                const photo = await uploadSinglePhoto(file, photoType, purpose, caption, gallery);
                uploadedPhotos.push(photo);
                console.log(`✅ File ${i + 1} uploaded successfully:`, photo.id);
            } catch (error) {
                console.error(`❌ File ${i + 1} upload failed:`, error);

                // If this is a moderation error, return immediately
                if (error.message?.includes('moderation') || error.message?.includes('policy')) {
                    return {
                        ok: false,
                        error: error.message,
                        data: { error: error.message }
                    };
                }

                // For other errors, continue with remaining files but log the failure
                console.warn(`⚠️ Continuing with remaining files after error:`, error.message);
            }
        }

        // If no photos were uploaded successfully, return error
        if (uploadedPhotos.length === 0) {
            return {
                ok: false,
                error: 'No photos were uploaded successfully',
                data: { error: 'No photos were uploaded successfully' }
            };
        }

        // Return success in same format as old uploadMediaFiles()
        console.log(`✅ All uploads complete. ${uploadedPhotos.length} photo(s) uploaded.`);
        return {
            ok: true,
            status: 200,
            data: {
                success: true,
                photos: uploadedPhotos
            }
        };

    } catch (error) {
        console.error('❌ Upload failed:', error);
        return {
            ok: false,
            error: error.message || 'Upload failed',
            data: { error: error.message || 'Upload failed' }
        };
    }
}

/**
 * Upload a single photo through the direct-to-blob pipeline
 *
 * @param {File} file - File to upload
 * @param {string} photoType - Photo type enum value
 * @param {string} purpose - Purpose enum value
 * @param {string} caption - Optional caption
 * @param {string} gallery - Optional gallery name
 * @returns {Promise<Object>} Photo record from backend
 */
async function uploadSinglePhoto(file, photoType, purpose, caption, gallery = null) {
    console.log('📸 uploadSinglePhoto:', file.name);

    // STEP 1: Get image dimensions
    console.log('📏 Getting image dimensions...');
    const dimensions = await getImageDimensions(file);
    console.log('📏 Dimensions:', dimensions);

    // STEP 2: Calculate file hash for deduplication
    console.log('🔢 Calculating file hash...');
    const fileHash = await calculateFileHash(file);
    console.log('🔢 File hash:', fileHash);

    // STEP 3: Request SAS token from backend
    console.log('🎫 Requesting SAS token from backend...');
    const sasResponse = await retryWithBackoff(async () => {
        const response = await apiClient.call('/photos/upload/sas-token', {
            method: 'POST',
            body: JSON.stringify({
                filename: file.name,
                fileSize: file.size,
                mimeType: file.type,
                photoType: photoType,
                purpose: purpose
            })
        });

        // Check if we got valid data (backend returns SAS token directly)
        if (!response || !response.sasUrl) {
            const errorMsg = response?.error || response?.message || 'Failed to get upload token';
            console.error('❌ SAS token request failed:', errorMsg);
            throw new Error(errorMsg);
        }

        return response;
    });

    const { sasUrl, blobName, uploadId } = sasResponse;
    console.log('🎫 Got SAS token. Blob name:', blobName, 'Upload ID:', uploadId);

    // STEP 4: Upload directly to Azure Blob Storage
    console.log('☁️ Uploading to Azure Blob Storage...');
    await retryWithBackoff(async () => {
        // Upload with proper Content-Type for blob persistence
        const uploadResponse = await fetch(sasUrl, {
            method: 'PUT',
            headers: {
                'x-ms-blob-type': 'BlockBlob',
                'Content-Type': file.type
            },
            body: file
        });

        // Log detailed response for debugging
        const responseText = await uploadResponse.text();
        console.log('☁️ Azure response:', {
            status: uploadResponse.status,
            statusText: uploadResponse.statusText,
            ok: uploadResponse.ok,
            headers: Object.fromEntries(uploadResponse.headers.entries()),
            body: responseText
        });

        if (!uploadResponse.ok) {
            throw new Error(`Azure upload failed: ${uploadResponse.status} ${responseText}`);
        }

        console.log('☁️ Upload to Azure successful');
    });

    // STEP 5: Confirm upload with backend (AI moderation happens here)
    console.log('✅ Confirming upload with backend (AI moderation)...');
    const confirmResponse = await retryWithBackoff(async () => {
        const response = await apiClient.call('/photos/upload/confirm', {
            method: 'POST',
            body: JSON.stringify({
                blobName: blobName,
                uploadId: uploadId,
                photoType: photoType,
                purpose: purpose,
                caption: caption ? caption.substring(0, 200) : undefined,
                gallery: gallery || undefined
            })
        });

        // Check if we got valid photo data (backend returns photo directly in response)
        if (!response || !response.photo) {
            const errorMsg = response?.error || response?.message || 'Upload confirmation failed';

            // If moderation failed, throw specific error
            if (errorMsg.includes('moderation') || errorMsg.includes('policy')) {
                throw new Error(`Content policy violation: ${errorMsg}`);
            }

            console.error('❌ Upload confirmation failed:', errorMsg);
            throw new Error(errorMsg);
        }

        return response;
    });

    const photoRecord = confirmResponse.photo;
    console.log('✅ Upload confirmed. Photo record:', photoRecord);

    return photoRecord;
}

/**
 * Check if the new direct upload system is available
 * @returns {Promise<boolean>} - True if backend supports direct upload
 */
export async function isDirectUploadAvailable() {
    try {
        const response = await apiClient.call('/photos/upload/sas-token', {
            method: 'OPTIONS'
        });
        return response.ok;
    } catch (error) {
        console.warn('Direct upload not available:', error.message);
        return false;
    }
}

export default {
    uploadPhotoDirectToBlob,
    isDirectUploadAvailable
};
