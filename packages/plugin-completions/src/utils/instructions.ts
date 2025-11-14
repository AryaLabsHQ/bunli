import type { ShellType } from '../types.js'

export function getInstallInstructions(shell: ShellType, cliName: string): string {
  switch (shell) {
    case 'bash':
      return `
📋 To enable Bash completions:

Option 1 - Load in current session:
  source <(${cliName} completions --shell bash)

Option 2 - Save to completion directory:
  ${cliName} completions --shell bash > /etc/bash_completion.d/${cliName}
  # Or on macOS with Homebrew:
  ${cliName} completions --shell bash > $(brew --prefix)/etc/bash_completion.d/${cliName}

Option 3 - Add to ~/.bashrc:
  echo 'source <(${cliName} completions --shell bash)' >> ~/.bashrc
  source ~/.bashrc
`

    case 'zsh':
      return `
📋 To enable Zsh completions:

Option 1 - Load in current session:
  source <(${cliName} completions --shell zsh)

Option 2 - Save to completion directory:
  ${cliName} completions --shell zsh > ~/.zsh/completions/_${cliName}
  # Add to ~/.zshrc if not already present:
  fpath=(~/.zsh/completions $fpath)
  autoload -U compinit && compinit

Option 3 - System-wide installation:
  ${cliName} completions --shell zsh > /usr/local/share/zsh/site-functions/_${cliName}
  # Restart your shell
`

    case 'fish':
      return `
📋 To enable Fish completions:

Save to Fish completions directory:
  ${cliName} completions --shell fish > ~/.config/fish/completions/${cliName}.fish
  # Completions will be available in new fish sessions

Alternative - System-wide:
  sudo ${cliName} completions --shell fish > /usr/share/fish/vendor_completions.d/${cliName}.fish
`
  }
}
