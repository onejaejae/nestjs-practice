import { BadRequestException, Injectable } from '@nestjs/common';

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuid } from 'uuid';
import { MoinConfigService } from 'src/core/config/config.service';
import { AWSConfig } from 'src/core/config';

@Injectable()
export class FileService {
  private readonly s3Client: S3Client;
  private readonly awsConfig: AWSConfig;

  constructor(private readonly configService: MoinConfigService) {
    this.awsConfig = this.configService.getAwsConfig();

    this.s3Client = new S3Client({
      region: this.awsConfig.s3.REGION,
      credentials: {
        accessKeyId: this.awsConfig.s3.ACCESS_KEY,
        secretAccessKey: this.awsConfig.s3.SECRET_KEY,
      },
    });
  }

  async uploadFile(file: Express.Multer.File) {
    if (!file) throw new BadRequestException('파일을 첨부해주세요.');

    console.log('file1111111', file);

    const fileName = `${uuid()}-${file.originalname}`;
    const bucket = this.awsConfig.s3.BUCKET;
    const region = this.awsConfig.s3.REGION;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return {
      url: `https://${bucket}.s3.${region}.amazonaws.com/${fileName}`,
    };
  }
}
