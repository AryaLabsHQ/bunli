import { CopyButton } from '@/components/marketing/copy-button';

export function TerminalCard({
  title = 'Terminal',
  command,
  output,
}: {
  title?: string;
  command: string;
  output?: string;
}) {
  const text = output ? `${command}\n${output}` : command;

  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
        <div className="text-sm font-medium text-foreground">{title}</div>
        <CopyButton text={text} />
      </div>
      <div className="px-4 py-3">
        <pre className="codeblock overflow-x-auto text-sm leading-relaxed">
          <code>
            <span className="text-primary">$ </span>
            {command}
            {output ? `\n${output}` : ''}
          </code>
        </pre>
      </div>
    </div>
  );
}

