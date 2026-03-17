export type ValueType = 'string' | 'number' | 'boolean'

type ResolvePrimitive<T extends ValueType> = T extends 'string'
  ? string
  : T extends 'number'
    ? number
    : T extends 'boolean'
      ? boolean
      : never

interface FieldDefBase<V> {
  description?: string
  validate?: (value: V) => void | Promise<void>
}

interface ScalarFieldBase<V> extends FieldDefBase<V> {
  array?: never
}

interface StringFieldDef extends ScalarFieldBase<string> {
  type: 'string'
  default?: string
}

interface NumberFieldDef extends ScalarFieldBase<number> {
  type: 'number'
  default?: number
}

interface BooleanFieldDef extends ScalarFieldBase<boolean> {
  type: 'boolean'
  default?: boolean
}

interface ArrayFieldBase<V> extends FieldDefBase<V> {
  array: true
}

interface StringArrayFieldDef extends ArrayFieldBase<string[]> {
  type: 'string'
  default?: readonly string[]
}

interface NumberArrayFieldDef extends ArrayFieldBase<number[]> {
  type: 'number'
  default?: readonly number[]
}

interface BooleanArrayFieldDef extends ArrayFieldBase<boolean[]> {
  type: 'boolean'
  default?: readonly boolean[]
}

export type FieldDef =
  | StringFieldDef
  | NumberFieldDef
  | BooleanFieldDef
  | StringArrayFieldDef
  | NumberArrayFieldDef
  | BooleanArrayFieldDef

export type FieldsDef = Record<string, FieldDef>

type InferFieldValue<F extends FieldDef> = F extends { array: true }
  ? F extends { default: readonly ResolvePrimitive<F['type']>[] }
    ? ResolvePrimitive<F['type']>[]
    : ResolvePrimitive<F['type']>[] | undefined
  : F extends { default: ResolvePrimitive<F['type']> }
    ? ResolvePrimitive<F['type']>
    : ResolvePrimitive<F['type']> | undefined

export type InferStoreConfig<F extends FieldsDef> = {
  [K in keyof F]: InferFieldValue<F[K]>
}

export type StoreUpdater<TConfig> = (current: TConfig) => NoInfer<TConfig>

export interface StoreOptions<F extends FieldsDef> {
  dirPath: string
  name?: string
  fields: F
  pruneUnknown?: boolean
}

export interface StoreInstance<TConfig> {
  read(): Promise<TConfig>
  write(config: NoInfer<TConfig>): Promise<void>
  update(updater: StoreUpdater<TConfig>): Promise<void>
  patch(partial: Partial<NoInfer<TConfig>>): Promise<void>
  reset(): Promise<void>
}
