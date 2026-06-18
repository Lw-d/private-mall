import { Module } from '@nestjs/common';

import { AdminModule } from '../admin/admin.module';
import { AdminUploadController } from './admin-upload.controller';
import { UploadService } from './upload.service';

@Module({
  imports: [AdminModule],
  controllers: [AdminUploadController],
  providers: [UploadService],
})
export class UploadModule {}
