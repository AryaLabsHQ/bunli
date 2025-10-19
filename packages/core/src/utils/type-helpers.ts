/**
 * Type utilities inspired by TanStack Router for advanced type manipulation
 */

// Union to intersection conversion
export type UnionToIntersection<T> = (
  T extends any ? (arg: T) => any : never
) extends (arg: infer T) => any
  ? T
  : never

// Constrain types with fallback
export type Constrain<T, TConstraint, TDefault = TConstraint> =
  | (T extends TConstraint ? T : never)
  | TDefault

// Pick required properties
export type PickRequired<T> = {
  [K in keyof T as undefined extends T[K] ? never : K]: T[K]
}

// Pick optional properties
export type PickOptional<T> = {
  [K in keyof T as undefined extends T[K] ? K : never]: T[K]
}

// Extract primitive types from union
export type ExtractPrimitives<TUnion> = TUnion extends MergeAllPrimitive
  ? TUnion
  : TUnion extends object
    ? never
    : TUnion

// Merge all primitive types
export type MergeAllPrimitive =
  | ReadonlyArray<any>
  | number
  | string
  | bigint
  | boolean
  | symbol
  | undefined
  | null

// Extract objects from union
export type ExtractObjects<TUnion> = TUnion extends MergeAllPrimitive
  ? never
  : TUnion

// Partial merge all objects
export type PartialMergeAllObject<TUnion> =
  ExtractObjects<TUnion> extends infer TObj
    ? [TObj] extends [never]
      ? never
      : {
          [TKey in TObj extends any ? keyof TObj : never]?: TObj extends any
            ? TKey extends keyof TObj
              ? TObj[TKey]
              : never
            : never
        }
    : never

// Partial merge all
export type PartialMergeAll<TUnion> =
  | ExtractPrimitives<TUnion>
  | PartialMergeAllObject<TUnion>

// Merge all objects in union
export type MergeAllObjects<
  TUnion,
  TIntersected = UnionToIntersection<ExtractObjects<TUnion>>,
> = [keyof TIntersected] extends [never]
  ? never
  : {
      [TKey in keyof TIntersected]: TUnion extends any
        ? TUnion[TKey & keyof TUnion]
        : never
    }

// Merge all types in union
export type MergeAll<TUnion> =
  | MergeAllObjects<TUnion>
  | ExtractPrimitives<TUnion>

// No inference utility
export type NoInfer<T> = [T][T extends any ? 0 : never]

// Check if type is any
export type IsAny<TValue, TYesResult, TNoResult = TValue> = 1 extends 0 & TValue
  ? TYesResult
  : TNoResult

// Pick as required
export type PickAsRequired<TValue, TKey extends keyof TValue> = Omit<
  TValue,
  TKey
> &
  Required<Pick<TValue, TKey>>

// Without empty objects
export type WithoutEmpty<T> = T extends any ? ({} extends T ? never : T) : never

// Expand type for better IntelliSense
export type Expand<T> = T extends object
  ? T extends infer O
    ? O extends Function
      ? O
      : { [K in keyof O]: O[K] }
    : never
  : T

// Deep partial
export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>
    }
  : T

// Make difference optional
export type MakeDifferenceOptional<TLeft, TRight> = keyof TLeft &
  keyof TRight extends never
  ? TRight
  : Omit<TRight, keyof TLeft & keyof TRight> & {
      [K in keyof TLeft & keyof TRight]?: TRight[K]
    }

// Check if type is union
export type IsUnion<T, U extends T = T> = (
  T extends any ? (U extends T ? false : true) : never
) extends false
  ? false
  : true

// Check if type is non-empty object
export type IsNonEmptyObject<T> = T extends object
  ? keyof T extends never
    ? false
    : true
  : false

// Assign types
export type Assign<TLeft, TRight> = TLeft extends any
  ? TRight extends any
    ? IsNonEmptyObject<TLeft> extends false
      ? TRight
      : IsNonEmptyObject<TRight> extends false
        ? TLeft
        : keyof TLeft & keyof TRight extends never
          ? TLeft & TRight
          : Omit<TLeft, keyof TRight> & TRight
    : never
  : never

// Intersect assign
export type IntersectAssign<TLeft, TRight> = TLeft extends any
  ? TRight extends any
    ? IsNonEmptyObject<TLeft> extends false
      ? TRight
      : IsNonEmptyObject<TRight> extends false
        ? TLeft
        : TRight & TLeft
    : never
  : never
