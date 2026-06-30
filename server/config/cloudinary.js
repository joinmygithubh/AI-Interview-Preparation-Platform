import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a file buffer to Cloudinary via an upload stream.
 * @param {Buffer} buffer - the raw file bytes
 * @param {string} folder - destination folder (e.g. 'resumes')
 * @param {string} [resourceType='auto'] - 'image' | 'video' | 'raw' | 'auto'
 * @returns {Promise<import('cloudinary').UploadApiResponse>}
 */
export const uploadToCloudinary = (buffer, folder, resourceType = 'auto') =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType },
      (error, result) => {
        if (error) return reject(error);
        return resolve(result);
      }
    );
    stream.end(buffer);
  });

export default cloudinary;
