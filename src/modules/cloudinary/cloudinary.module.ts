import { Module } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';
import '../../config/cloudinary.config';

@Module({
  providers: [CloudinaryService],
  exports: [CloudinaryService],
})
export class CloudinaryModule {}
