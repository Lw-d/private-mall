import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, posix, resolve } from 'node:path';

import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { IMAGE_UPLOAD_MAX_SIZE_BYTES, IMAGE_UPLOAD_MIME_EXTENSIONS } from './upload.constants';
import { UploadResultDto } from './dto/upload-result.dto';
import { UploadedImageFile } from './types/uploaded-image-file';

@Injectable()
export class UploadService {
  constructor(private readonly configService: ConfigService) {}

  async saveImage(file?: UploadedImageFile): Promise<UploadResultDto> {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    const extension = IMAGE_UPLOAD_MIME_EXTENSIONS[file.mimetype];
    if (!extension) {
      throw new BadRequestException('Only jpeg, png, webp and gif images are supported');
    }

    if (!file.buffer?.length) {
      throw new BadRequestException('Image file is empty');
    }

    if (file.size > IMAGE_UPLOAD_MAX_SIZE_BYTES) {
      throw new BadRequestException('Image file exceeds 5MB');
    }

    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const subDirectory = posix.join('images', year, month);
    const filename = `${Date.now()}-${randomUUID()}${extension}`;
    const uploadRoot = resolve(
      process.cwd(),
      this.configService.get<string>('UPLOAD_LOCAL_DIR') ?? 'uploads',
    );
    const targetDirectory = resolve(uploadRoot, subDirectory);
    const targetPath = join(targetDirectory, filename);

    await mkdir(targetDirectory, { recursive: true });
    await writeFile(targetPath, file.buffer);

    const publicPath = posix.join('/uploads', subDirectory, filename);

    return {
      url: this.buildPublicUrl(publicPath),
      path: publicPath,
      filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      storage: 'local',
    };
  }

  private buildPublicUrl(publicPath: string) {
    const publicBaseUrl = this.configService.get<string>('PUBLIC_BASE_URL')?.replace(/\/$/, '');
    return publicBaseUrl ? `${publicBaseUrl}${publicPath}` : publicPath;
  }
}
