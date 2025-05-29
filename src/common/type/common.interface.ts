type ValueType = string | number | boolean;

export type Union<T> =
  T extends ReadonlyArray<infer U>
    ? Union<U>
    : T extends { [key: string]: infer U }
      ? Union<U>
      : T extends ValueType
        ? T
        : never;
