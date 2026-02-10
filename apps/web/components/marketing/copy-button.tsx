'use client';

import { useMemo, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CopyButton({
  text,
  className,
  label = 'Copy',
}: {
  text: string;
  className?: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  const ariaLabel = useMemo(() => (copied ? 'Copied' : label), [copied, label]);

  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center gap-2 rounded-md border border-border/70 bg-background/40 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-border',
        'transition-colors',
        className
      )}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      }}
      aria-label={ariaLabel}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
      <span>{copied ? 'Copied' : 'Copy'}</span>
    </button>
  );
}

