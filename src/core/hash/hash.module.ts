import { Module } from '@nestjs/common';
import { BcryptService } from './bcrypt.service';
import { HASH_SERVICE } from './hash.interface';

@Module({
  providers: [
    {
      provide: HASH_SERVICE,
      useClass: BcryptService,
    },
  ],
  exports: [HASH_SERVICE],
})
export class HashModule {}