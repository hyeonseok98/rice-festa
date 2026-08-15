import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  countLabel?: string;
  description: string;
  actions?: ReactNode;
  titleId?: string;
  variant?: 'page' | 'workspace';
}

export function PageHeader({
  title,
  countLabel,
  description,
  actions,
  titleId,
  variant = 'page',
}: PageHeaderProps) {
  const isWorkspaceHeader = variant === 'workspace';

  return (
    <header
      className={
        isWorkspaceHeader
          ? 'flex min-h-18 flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3 md:px-6'
          : 'flex flex-col justify-between gap-5 md:flex-row md:items-end'
      }
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1
            id={titleId}
            className={
              isWorkspaceHeader
                ? 'text-[1.625rem] font-extrabold tracking-[-0.025em]'
                : 'text-3xl font-extrabold tracking-tight'
            }
          >
            {title}
          </h1>
          {countLabel ? (
            <span className="rounded-md bg-surface-hover px-2 py-1 text-xs font-bold text-muted-foreground tabular-nums">
              {countLabel}
            </span>
          ) : null}
        </div>
        <p className={`${isWorkspaceHeader ? 'mt-1 text-[13px]' : 'mt-2 text-sm'} text-muted-foreground`}>
          {description}
        </p>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
