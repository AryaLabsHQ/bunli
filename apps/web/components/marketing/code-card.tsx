import { CopyButton } from '@/components/marketing/copy-button';

export function CodeCard({
  title,
  filename,
  code,
}: {
  title: string;
  filename?: string;
  code: string;
}) {
  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
        <div className="min-w-0">
          <div className="text-sm font-medium text-foreground">{title}</div>
          {filename ? <div className="text-xs text-muted-foreground">{filename}</div> : null}
        </div>
        <CopyButton text={code} />
      </div>
      <div className="px-4 py-3">
        <pre className="codeblock overflow-x-auto text-sm leading-relaxed">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}

