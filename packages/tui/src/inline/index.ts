export {
  createPromptSession,
  PromptCancelledError,
  assertNotCancelled,
  promptOrExit,
  isCancel,
  CANCEL
} from '@bunli/runtime/prompt'

export type {
  PromptApi as InlinePromptApi,
  PromptSession as InlinePromptSession,
  PromptSpinnerFactory as InlinePromptSpinnerFactory,
  Spinner as InlineSpinner,
  SpinnerOptions as InlineSpinnerOptions
} from '@bunli/runtime/prompt'
