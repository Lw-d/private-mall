import { Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';

import { AdminAuthGuard } from '../admin/guards/admin-auth.guard';
import { ApiCommonErrorResponses } from '../common/decorators/api-common-error-responses.decorator';
import { ApiWrappedOkResponse } from '../common/decorators/api-wrapped-ok-response.decorator';
import { UploadResultDto } from './dto/upload-result.dto';
import { UploadedImageFile } from './types/uploaded-image-file';
import { IMAGE_UPLOAD_MAX_SIZE_BYTES } from './upload.constants';
import { UploadService } from './upload.service';

@ApiTags('admin-uploads')
@ApiBearerAuth()
@ApiCommonErrorResponses({ notFound: false })
@UseGuards(AdminAuthGuard)
@Controller('admin/uploads')
export class AdminUploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('images')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: IMAGE_UPLOAD_MAX_SIZE_BYTES } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiWrappedOkResponse({ type: UploadResultDto, description: 'Upload a product image.' })
  uploadImage(@UploadedFile() file?: UploadedImageFile) {
    return this.uploadService.saveImage(file);
  }
}
