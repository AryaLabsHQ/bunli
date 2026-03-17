export {
  ShellCompDirective,
  Argument,
  Option,
  Command,
  RootCommand,
  script,
  default as t,
} from './t.js'

export type {
  OptionsMap,
  Complete,
  OptionHandler,
  Completion,
  ArgumentHandler,
} from './t.js'

export {
  noopHandler,
  assertDoubleDashes,
} from './shared.js'

export type { CompletionConfig } from './shared.js'
