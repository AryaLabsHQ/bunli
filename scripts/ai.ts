export interface ChangesetSummaryInput {
  packageNames: string[]
  bumpTypes: Record<string, 'patch' | 'minor' | 'major'>
  commits: string[]
  filesChanged: string[]
}

export async function generateChangesetSummary(input: ChangesetSummaryInput): Promise<string> {
  const { generateText } = await import('ai')
  const model = process.env.AI_MODEL || 'anthropic/claude-opus-4.5'

  const prompt = `You are writing a changeset description for a release.

Packages:
${input.packageNames.map((name) => `- ${name} (${input.bumpTypes[name]})`).join('\n')}

Commits:
${input.commits.slice(0, 20).map((c) => `- ${c}`).join('\n')}

Files changed:
${input.filesChanged.slice(0, 20).join('\n')}${
    input.filesChanged.length > 20 ? `\n... and ${input.filesChanged.length - 20} more` : ''
  }

Write a concise changeset description (1-3 sentences).
Focus on user-facing changes and benefits. Be specific about what was added, fixed, or changed.
Do not include markdown formatting, bullet points, or headers. Return plain text only.`

  const { text } = await generateText({
    model,
    prompt,
  })

  return text.trim()
}
