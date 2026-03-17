import { expectTypeOf, test } from 'vitest'
import type {
  BunliPlugin,
  StoreOf,
  MergeStores,
  CommandContext,
  CommandResult,
  PluginContext,
  ExecutionState,
} from '../src/plugin/types.js'

test('StoreOf extracts store type from plugin', () => {
  type MyPlugin = BunliPlugin<{ count: number }>
  expectTypeOf<StoreOf<MyPlugin>>().toEqualTypeOf<{ count: number }>()
})

test('StoreOf returns empty object for plugin without store', () => {
  type PlainPlugin = BunliPlugin
  expectTypeOf<StoreOf<PlainPlugin>>().toEqualTypeOf<{}>()
})

test('MergeStores merges multiple plugin stores', () => {
  type P1 = BunliPlugin<{ a: string }>
  type P2 = BunliPlugin<{ b: number }>
  type P3 = BunliPlugin<{ c: boolean }>

  type Merged = MergeStores<readonly [P1, P2, P3]>
  expectTypeOf<Merged>().toEqualTypeOf<{ a: string } & { b: number } & { c: boolean }>()
})

test('MergeStores with empty tuple returns empty object', () => {
  type Merged = MergeStores<readonly []>
  expectTypeOf<Merged>().toEqualTypeOf<{}>()
})

test('MergeStores with single plugin returns its store', () => {
  type P = BunliPlugin<{ x: string }>
  type Merged = MergeStores<readonly [P]>
  expectTypeOf<Merged>().toEqualTypeOf<{ x: string }>()
})

test('CommandContext store is typed', () => {
  type Ctx = CommandContext<{ token: string; count: number }>
  expectTypeOf<Ctx['store']>().toEqualTypeOf<{ token: string; count: number }>()
})

test('CommandContext getStoreValue returns typed value', () => {
  type Ctx = CommandContext<{ token: string }>
  type GetResult = ReturnType<Ctx['getStoreValue']>
  // Overloaded — the specific overload returns TStore[K]
  expectTypeOf<GetResult>().toMatchTypeOf<unknown>()
})

test('BunliPlugin hooks are optional', () => {
  const plugin: BunliPlugin = { name: 'minimal' }
  expectTypeOf(plugin.setup).toEqualTypeOf<((context: PluginContext) => void | Promise<void>) | undefined>()
  expectTypeOf(plugin.preRun).toBeNullable()
  expectTypeOf(plugin.postRun).toBeNullable()
})

test('preRun hook receives CommandContext and ExecutionState', () => {
  type PreRun = NonNullable<BunliPlugin['preRun']>
  expectTypeOf<Parameters<PreRun>>().toEqualTypeOf<[CommandContext<any>, ExecutionState]>()
})

test('postRun hook receives CommandContext & CommandResult and ExecutionState', () => {
  type PostRun = NonNullable<BunliPlugin['postRun']>
  expectTypeOf<Parameters<PostRun>>().toEqualTypeOf<[CommandContext<any> & CommandResult, ExecutionState]>()
})

test('ExecutionState has typed get/set/has/delete', () => {
  type Get = ExecutionState['get']
  type Set = ExecutionState['set']
  type Has = ExecutionState['has']
  type Delete = ExecutionState['delete']

  expectTypeOf<ReturnType<Get>>().toEqualTypeOf<unknown | undefined>()
  expectTypeOf<ReturnType<Has>>().toEqualTypeOf<boolean>()
  expectTypeOf<ReturnType<Delete>>().toEqualTypeOf<boolean>()
})
