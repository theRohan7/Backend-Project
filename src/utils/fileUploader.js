//    CLOUDINARY

import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';                               //FileSystem    default package in Node JS

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET_KEY 
});


const UploadOnCloudinary = async (localFilePath) =>{
    try {
        if(!localFilePath) return console.error('Could not find File path :( ')
        // upload file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type:'auto'
        })
        //file has been uploaded sucessfully
        // console.log("file is uploaded on Cloudinary", response.url);
        fs.unlinkSync(localFilePath)
        return response

    } catch (error) {
        fs.unlinkSync(localFilePath)  //Removes the locally saved temmporary file as the uploading operation failed.
        return null;

        
    }
}


export {UploadOnCloudinary}