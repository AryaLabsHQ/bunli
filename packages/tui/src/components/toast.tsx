import { Alert, type AlertTone } from './alert.js'

export interface ToastProps {
  message: string
  title?: string
  tone?: AlertTone
}

export function Toast({ message, title, tone = 'info' }: ToastProps) {
  return <Alert tone={tone} title={title} message={message} />
}
