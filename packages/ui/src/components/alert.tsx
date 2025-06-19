/**
 * Alert component for notifications and messages
 */

import React from 'react'
import { Box, Text, Row } from '@bunli/renderer'
import type { BoxProps } from '@bunli/renderer'

export interface AlertProps extends Omit<BoxProps, 'children'> {
  /**
   * Alert content
   */
  children: React.ReactNode
  /**
   * Alert type
   */
  type?: 'info' | 'success' | 'warning' | 'error'
  /**
   * Title for the alert
   */
  title?: string
  /**
   * Show icon
   */
  showIcon?: boolean
  /**
   * Custom icon
   */
  icon?: string
  /**
   * Dismissible alert
   */
  dismissible?: boolean
  /**
   * Called when dismissed
   */
  onDismiss?: () => void
}

const alertStyles = {
  info: {
    borderColor: 'blue',
    color: 'blue',
    icon: 'ℹ',
  },
  success: {
    borderColor: 'green',
    color: 'green',
    icon: '✓',
  },
  warning: {
    borderColor: 'yellow',
    color: 'yellow',
    icon: '⚠',
  },
  error: {
    borderColor: 'red',
    color: 'red',
    icon: '✖',
  },
}

export function Alert({
  children,
  type = 'info',
  title,
  showIcon = true,
  icon,
  dismissible = false,
  onDismiss,
  style,
  ...props
}: AlertProps) {
  const alertStyle = alertStyles[type]
  const displayIcon = icon || alertStyle.icon
  
  return (
    <Box
      style={{
        border: 'single',
        borderColor: alertStyle.borderColor,
        padding: 1,
        ...style,
      }}
      {...props}
    >
      <Row gap={1}>
        {showIcon && (
          <Text style={{ color: alertStyle.color, bold: true }}>
            {displayIcon}
          </Text>
        )}
        <Box flex={1}>
          {title && (
            <Text style={{ color: alertStyle.color, bold: true }}>
              {title}
            </Text>
          )}
          <Text>{children}</Text>
        </Box>
        {dismissible && (
          <Text 
            style={{ color: 'gray', cursor: 'pointer' }}
            onClick={onDismiss}
          >
            ✕
          </Text>
        )}
      </Row>
    </Box>
  )
}

// Toast notification component
export interface ToastProps extends AlertProps {
  /**
   * Auto-dismiss after milliseconds
   */
  duration?: number
  /**
   * Position on screen
   */
  position?: 'top' | 'bottom'
}

export function Toast({
  duration = 3000,
  position = 'top',
  onDismiss,
  ...props
}: ToastProps) {
  const [visible, setVisible] = React.useState(true)
  
  React.useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setVisible(false)
        onDismiss?.()
      }, duration)
      
      return () => clearTimeout(timer)
    }
  }, [duration, onDismiss])
  
  if (!visible) return null
  
  return (
    <Box
      style={{
        position: 'absolute',
        [position]: 0,
        left: 0,
        right: 0,
        padding: 1,
      }}
    >
      <Alert
        {...props}
        dismissible
        onDismiss={() => {
          setVisible(false)
          onDismiss?.()
        }}
      />
    </Box>
  )
}