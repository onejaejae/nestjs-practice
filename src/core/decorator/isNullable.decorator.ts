import { applyDecorators } from '@nestjs/common';
import { ValidateIf, ValidationOptions } from 'class-validator';

export function IsNullable(validationOptions?: ValidationOptions) {
  return applyDecorators(
    ValidateIf((object, value) => value !== null, validationOptions),
  );
}