import { Injectable } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { CloudinaryResponse } from './interfaces/cloudinary-response';
import * as streamifier from 'streamifier';

@Injectable()
export class CloudinaryService {
  async uploadFile(
    file: Express.Multer.File,
    folder: string
  ): Promise<CloudinaryResponse> {
    return new Promise<CloudinaryResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
        },
        (error, result: UploadApiResponse) => {
          if (error) return reject(error);
          const response: CloudinaryResponse = {
            asset_id: result.asset_id,
            public_id: result.public_id,
            version: result.version,
            version_id: result.version_id,
            signature: result.signature,
            width: result.width,
            height: result.height,
            format: result.format,
            resource_type: result.resource_type,
            created_at: result.created_at,
            tags: result.tags,
            bytes: result.bytes,
            type: result.type,
            etag: result.etag,
            placeholder: result.placeholder,
            url: result.url,
            secure_url: result.secure_url,
            folder: result.folder,
            original_filename: result.original_filename
          };
          resolve(response);
        }
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  async deleteFile(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }
}
