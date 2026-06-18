import { ApiProperty } from '@nestjs/swagger';

export class UploadResultDto {
  @ApiProperty({ example: '/uploads/images/2026/05/1716200000000-file.png' })
  url!: string;

  @ApiProperty({ example: '/uploads/images/2026/05/1716200000000-file.png' })
  path!: string;

  @ApiProperty({ example: '1716200000000-file.png' })
  filename!: string;

  @ApiProperty({ example: 'product.png' })
  originalName!: string;

  @ApiProperty({ example: 'image/png' })
  mimeType!: string;

  @ApiProperty({ example: 102400 })
  size!: number;

  @ApiProperty({ example: 'local' })
  storage!: 'local';
}
