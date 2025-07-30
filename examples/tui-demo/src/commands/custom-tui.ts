import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'
import { SimpleTUI, drawBox, drawText, drawProgressBar, drawMenu } from '../simple-tui.js'

export const customTuiCommand = defineCommand({
  name: 'custom',
  description: 'Demonstrate custom TUI implementation',
  options: {
    demo: option(
      z.enum(['dashboard', 'form', 'progress']).default('dashboard'),
      { description: 'TUI demo type', short: 'd' }
    )
  },
  handler: async ({ terminal, colors, flags }) => {
    
    if (!terminal.isInteractive) {
      // Show a static demo when not in interactive mode
      console.log(colors.cyan('Custom TUI Demo (Static Preview)'))
      console.log()
      console.log('In an interactive terminal, this would show:')
      console.log()
      
      if (flags.demo === 'dashboard') {
        console.log('┌─────────────────────────────────────────────────┐')
        console.log('│ ' + colors.bold('TUI Dashboard Demo') + '                              │')
        console.log('├─────────────────────────────────────────────────┤')
        console.log('│ ┌──────────┐  ┌────────────────────────────┐   │')
        console.log('│ │ ' + colors.blue('Menu') + '     │  │ ' + colors.green('Content') + '                   │   │')
        console.log('│ ├──────────┤  ├────────────────────────────┤   │')
        console.log('│ │ ' + colors.cyan('> Overview') + '│  │ Welcome to Bunli TUI!      │   │')
        console.log('│ │   Analytics│  │                            │   │')
        console.log('│ │   Settings │  │ • Box drawing              │   │')
        console.log('│ │   Exit     │  │ • Menu navigation          │   │')
        console.log('│ └──────────┘  │ • Keyboard controls        │   │')
        console.log('│                └────────────────────────────┘   │')
        console.log('└─────────────────────────────────────────────────┘')
        console.log()
        console.log(colors.dim('Use arrow keys to navigate, Enter to select'))
      } else if (flags.demo === 'progress') {
        console.log('┌─────────────────────────────────────────────────┐')
        console.log('│ ' + colors.bold('Progress Demo') + '                                   │')
        console.log('├─────────────────────────────────────────────────┤')
        console.log('│                                                 │')
        console.log('│  Downloading packages...                        │')
        console.log('│                                                 │')
        console.log('│  [' + colors.green('████████████████') + '░░░░░░░░░░░░░░] 50%      │')
        console.log('│                                                 │')
        console.log('│  ' + colors.yellow('Please wait...') + '                                 │')
        console.log('│                                                 │')
        console.log('└─────────────────────────────────────────────────┘')
      } else {
        console.log('Form Demo would show:')
        console.log('  • Interactive text input fields')
        console.log('  • Select dropdowns with arrow navigation')
        console.log('  • Checkboxes and radio buttons')
        console.log('  • Real-time form validation')
      }
      
      console.log()
      console.log(colors.dim('Terminal info:'))
      console.log(colors.dim(`  Size: ${terminal.width}x${terminal.height}`))
      console.log(colors.dim(`  Interactive: ${terminal.isInteractive}`))
      console.log(colors.dim(`  Color support: ${terminal.supportsColor}`))
      return
    }
    
    if (flags.demo === 'dashboard') {
      // Dashboard demo
      let selectedMenu = 0
      const menuItems = ['Overview', 'Analytics', 'Settings', 'Exit']
      
      const tui = new SimpleTUI(() => {
        let output = ''
        
        // Main container
        output += drawBox(1, 1, terminal.width - 2, terminal.height - 2, 'TUI Dashboard Demo')
        
        // Menu
        output += drawBox(3, 3, 20, 8, 'Menu')
        output += drawMenu(5, 5, menuItems, selectedMenu)
        
        // Content area
        output += drawBox(25, 3, terminal.width - 28, terminal.height - 6, 'Content')
        output += drawText(27, 5, 'Welcome to the Bunli TUI Demo!', 'green')
        output += drawText(27, 7, 'This demonstrates custom TUI capabilities:', 'white')
        output += drawText(29, 9, '• Box drawing with borders', 'cyan')
        output += drawText(29, 10, '• Text positioning and colors', 'cyan')
        output += drawText(29, 11, '• Menu navigation', 'cyan')
        output += drawText(29, 12, '• Progress indicators', 'cyan')
        
        // Status bar
        output += drawText(3, terminal.height - 3, 'Press Ctrl+C to exit', 'dim')
        
        return output
      }, 10)
      
      // Handle keyboard input
      process.stdin.on('data', (key) => {
        const keyStr = key.toString()
        if (keyStr === '\u0003') { // Ctrl+C
          tui.stop()
        } else if (keyStr === '\u001b[A') { // Up arrow
          selectedMenu = Math.max(0, selectedMenu - 1)
        } else if (keyStr === '\u001b[B') { // Down arrow
          selectedMenu = Math.min(menuItems.length - 1, selectedMenu + 1)
        } else if (keyStr === '\r') { // Enter
          if (menuItems[selectedMenu] === 'Exit') {
            tui.stop()
          }
        }
      })
      
      tui.start()
    } else if (flags.demo === 'progress') {
      // Progress demo
      let progress = 0
      
      const tui = new SimpleTUI(() => {
        let output = ''
        
        output += drawBox(5, 5, terminal.width - 10, 15, 'Progress Demo')
        output += drawText(10, 8, 'Downloading packages...', 'white')
        output += drawProgressBar(10, 10, terminal.width - 20, progress / 100, `${Math.floor(progress)}%`)
        
        output += drawText(10, 12, progress >= 100 ? 'Download complete!' : 'Please wait...', 
                         progress >= 100 ? 'green' : 'yellow')
        
        output += drawText(10, 17, 'Press Ctrl+C to exit', 'dim')
        
        return output
      }, 30)
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        progress += 2
        if (progress > 100) {
          progress = 100
          clearInterval(progressInterval)
        }
      }, 100)
      
      // Handle exit
      process.stdin.on('data', (key) => {
        const keyStr = key.toString()
        if (keyStr === '\u0003') { // Ctrl+C
          clearInterval(progressInterval)
          tui.stop()
        }
      })
      
      tui.start()
    } else {
      // Form demo
      console.log(colors.cyan('Form Demo'))
      console.log('Interactive forms would be displayed here')
      console.log('This would show:')
      console.log('  • Text input fields')
      console.log('  • Select dropdowns')
      console.log('  • Checkboxes and radio buttons')
      console.log('  • Form validation')
    }
  }
})