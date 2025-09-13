import { ClassProvider, Inject, Module, OnModuleInit } from '@nestjs/common';
import { MockCacheService } from './cache.service';
import {
  CacheServiceKey,
  ICacheOptions,
  ICacheService,
} from './cache.interface';
import {
  DiscoveryModule,
  DiscoveryService,
  MetadataScanner,
  Reflector,
} from '@nestjs/core';
import { CACHE_KEY } from './cache.decorator';
import { LoggerService } from '../logger/logger.service';

// const redisConnect: FactoryProvider = {
//   provide: RedisClientKey,
//   useFactory: async () => {
//     const client = new Redis({
//       port: 6379,
//       host: '127.0.0.1',
//     });
//     return client;
//   },
// };

const cacheService: ClassProvider = {
  provide: CacheServiceKey,
  useClass: MockCacheService,
};

@Module({
  imports: [DiscoveryModule],
  providers: [cacheService],
  exports: [cacheService],
})
export class CacheModule implements OnModuleInit {
  constructor(
    @Inject(CacheServiceKey) private readonly cacheService: ICacheService,
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly reflector: Reflector,
    private readonly loggerService: LoggerService,
  ) {}

  async onModuleInit() {
    this.wrapCache();
  }

  private wrapMethod(
    originalMethod: any,
    instance: any,
    cacheOptions: ICacheOptions,
  ) {
    const { loggerService, cacheService } = this;
    const { ttl, key, index } = cacheOptions;

    return async function (...args: any[]) {
      const keyIndex = index ?? 0;
      const keyArgument = args[keyIndex];
      const keySuffix = typeof keyArgument === 'string' ? keyArgument : '';
      const cacheKey = `${key}${keySuffix}`;

      try {
        const cachedData = await cacheService.get(cacheKey);
        if (cachedData) {
          loggerService.info(cacheKey, cachedData, 'cache hit');
          return cachedData;
        }
      } catch (error) {
        loggerService.error(
          CACHE_KEY,
          error,
          'there was an error during cache execution',
        );

        const result = await originalMethod.apply(instance, args);
        return result;
      }

      const result = await originalMethod.apply(instance, args);

      try {
        await cacheService.set(cacheKey, result, ttl);
        loggerService.info(cacheKey, result, 'cache miss');
      } catch (error) {
        loggerService.error(
          CACHE_KEY,
          error,
          'there was an error during cache execution',
        );
      } finally {
        return result;
      }
    };
  }

  private wrapInstanceMethods(instance: any) {
    const methodNames = this.metadataScanner.getAllMethodNames(
      Object.getPrototypeOf(instance.instance),
    );

    for (const methodName of methodNames) {
      const originalMethod = instance.instance[methodName];
      const cacheOptions = this.reflector.get(CACHE_KEY, originalMethod);

      if (cacheOptions) {
        instance.instance[methodName] = this.wrapMethod(
          originalMethod,
          instance.instance,
          cacheOptions,
        );
      }
    }
  }

  private getInstances() {
    return this.discoveryService
      .getProviders()
      .filter((v) => v.isDependencyTreeStatic())
      .filter(({ metatype, instance }) => instance && metatype);
  }

  private wrapCache() {
    const instances = this.getInstances();
    for (const instance of instances) {
      this.wrapInstanceMethods(instance);
    }
  }
}
