import { createPlugin } from '@bunli/core/plugin'
import type { PluginContext } from '@bunli/core/plugin'
import { defineCommand, defineGroup } from '@bunli/core'
import { z } from 'zod'
import type { Agent } from './agents.js'

export interface SkillsPluginOptions {
  /** CLI description for the generated skill. */
  description?: string
  /** Additional agents to register beyond the built-in list. */
  agents?: Agent[]
}

export const skillsPlugin = createPlugin<SkillsPluginOptions>(
  (options = {}) => ({
    name: 'skills',

    setup(context: PluginContext) {
      const skillsGroup = defineGroup({
        name: 'skills',
        description: 'Manage agent skill files',
        commands: [
          defineCommand({
            name: 'sync',
            description: 'Generate and install skill files for detected agents',
            options: {
              global: {
                schema: z.boolean().default(true),
                description: 'Install globally (default) or project-local',
                argumentKind: 'flag'
              },
              force: {
                schema: z.boolean().default(false),
                short: 'f',
                description: 'Force regeneration even if up to date',
                argumentKind: 'flag'
              }
            },
            async handler({ flags, colors, output }) {
              const typedFlags = flags as { global: boolean; force: boolean }

              // Dynamically import to avoid loading fs at plugin registration time
              const { syncSkills } = await import('./sync.js')
              const { detectAgents, builtinAgents } = await import('./agents.js')

              const allAgents = options.agents
                ? [...builtinAgents, ...options.agents]
                : builtinAgents

              const detected = detectAgents(allAgents)

              // Access commands from the CLI — we get them via the plugin context store
              const commands = context.store.get('_skillsCommands') as Map<string, any> | undefined
              if (!commands || commands.size === 0) {
                console.log(colors.yellow('No commands registered. Nothing to sync.'))
                return
              }

              const cliName = context.store.get('_skillsCliName') as string || 'cli'

              const result = await syncSkills(cliName, commands, {
                global: typedFlags.global,
                force: typedFlags.force,
                description: options.description,
                agents: detected
              })

              if (!result.updated && !typedFlags.force) {
                console.log(colors.dim('Skills are up to date.'))
                output({ updated: false, agents: detected.map((a) => a.name) })
                return
              }

              console.log(colors.green(`Synced skills to ${result.paths.length} location(s)`))
              for (const install of result.agents) {
                console.log(colors.dim(`  ${install.agent}: ${install.mode} → ${install.path}`))
              }

              output({
                updated: true,
                paths: result.paths,
                agents: result.agents.map((a) => ({
                  agent: a.agent,
                  path: a.path,
                  mode: a.mode
                }))
              })
            }
          }),

          defineCommand({
            name: 'list',
            description: 'List detected agents on this system',
            async handler({ colors, output }) {
              const { detectAgents, builtinAgents } = await import('./agents.js')

              const allAgents = options.agents
                ? [...builtinAgents, ...options.agents]
                : builtinAgents

              const detected = detectAgents(allAgents)

              if (detected.length === 0) {
                console.log(colors.dim('No agents detected.'))
                output({ agents: [] })
                return
              }

              console.log(`Detected ${detected.length} agent(s):\n`)
              for (const agent of detected) {
                const tag = agent.universal ? colors.dim(' (universal)') : ''
                console.log(`  ${colors.bold(agent.name)}${tag}`)
                console.log(colors.dim(`    ${agent.projectSkillsDir}`))
              }

              output({
                agents: detected.map((a) => ({
                  name: a.name,
                  universal: a.universal,
                  projectSkillsDir: a.projectSkillsDir,
                  globalSkillsDir: a.globalSkillsDir
                }))
              })
            }
          })
        ]
      })

      context.registerCommand(skillsGroup)
    }
  })
)
