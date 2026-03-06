import { defineCommand, option } from '@bunli/core'
import { z } from 'zod'
import { GalleryShell } from '../gallery/shell.js'
import type { GallerySectionId, GalleryTheme } from '../gallery/model.js'

const galleryCommand = defineCommand({
  name: 'gallery' as const,
  description: 'Browse Bunli component examples and runtime recipes',
  options: {
    theme: option(z.enum(['dark', 'light']).default('dark'), {
      short: 'm',
      description: 'Initial theme preset'
    }),
    section: option(z.enum(['components', 'recipes']).default('components'), {
      short: 's',
      description: 'Initial gallery section'
    }),
    entry: option(z.string().optional(), {
      short: 'e',
      description: 'Open a specific gallery entry id'
    })
  },
  render: ({ flags }) => (
    <GalleryShell
      initialTheme={flags.theme as GalleryTheme}
      initialSectionId={flags.section as GallerySectionId}
      initialEntryId={typeof flags.entry === 'string' && flags.entry.length > 0 ? flags.entry : undefined}
    />
  ),
  handler: async ({ colors }) => {
    console.log(colors.bold('Run in an interactive terminal to browse the TUI Gallery'))
    console.log('Example: bun cli.ts gallery --section recipes')
  }
})

export default galleryCommand
