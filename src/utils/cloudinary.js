import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    const result = await cloudinary.uploader.upload(localFilePath, {
      resource_type: 'auto', // auto detect file type (image, video, etc.)
     })
     fs.unlinkSync(localFilePath);
     console.log("Cloudinary upload result: ", result, result.url);
    return result;
  } catch (error) {
    console.error("Error uploading to Cloudinary: ", error);
    fs.unlinkSync(localFilePath); // remove the locally saved file if upload fails
    throw error;
  }
}

const deleteFromCloudinary = async (fileUrl) => {
  try {
    // URL se public_id nikalna zaroori hai delete karne ke liye
    const publicId = fileUrl.split('/').pop().split('.')[0];
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Error deleting from Cloudinary:", error);
  }
}

export {uploadOnCloudinary, deleteFromCloudinary};
