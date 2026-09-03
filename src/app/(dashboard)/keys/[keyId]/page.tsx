'use client';

import { use, useMemo, useState } from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import {
  useGetV1Keys,
  usePutV1KeysDomainsRevoke,
  useGetV1KeysKeyIdDomainsDomainTranslationsStatus,
  usePostV1TranslationsRetry,
} from '@/generated/api/default/default';
import type { PageStatusView } from '@/generated/api/model';
import { ApiError } from '@/lib/api-mutator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';

function stateBadgeVariant(state: string) {
  if (state === 'done') return 'default';
  if (state === 'failed') return 'destructive';
  return 'secondary';
}

// Left-to-right order requested for the per-rule status columns.
const STATUS_COLUMNS = ['done', 'running', 'failed'] as const;

// No idempotent "get one key" endpoint exists on fluenza (only the list, and the destructive
// revoke response, per the backend inventory) - find this key in the list the account already
// has to fetch for /keys instead of adding a redundant network round trip.
function RuleGroup({ rule, pages }: { rule: string; pages: PageStatusView[] }) {
  const [open, setOpen] = useState(false);
  const [stateFilter, setStateFilter] = useState<string | null>(null);

  const counts = useMemo(() => {
    const byState = new Map<string, number>();
    for (const page of pages) byState.set(page.state, (byState.get(page.state) ?? 0) + 1);
    return byState;
  }, [pages]);

  const visiblePages = stateFilter ? pages.filter((p) => p.state === stateFilter) : pages;

  function selectFilter(state: string) {
    setStateFilter((current) => (current === state ? null : state));
    setOpen(true);
  }

  return (
    <div className="rounded-md border">
      <div className="flex w-full items-center justify-between gap-3 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="min-w-0 flex-1 truncate text-left font-mono text-sm hover:underline"
        >
          {rule}
        </button>
        <div className="flex shrink-0 gap-2">
          {STATUS_COLUMNS.map((state) => (
            <button key={state} type="button" onClick={() => selectFilter(state)}>
              <Badge
                variant={stateBadgeVariant(state)}
                className={stateFilter === state ? 'ring-2 ring-ring ring-offset-1' : ''}
              >
                {state} {counts.get(state) ?? 0}
              </Badge>
            </button>
          ))}
        </div>
      </div>
      {open && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Page</TableHead>
              <TableHead>Original</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visiblePages.map((page) => (
              <TableRow key={`${page.rule}:${page.checksum}`}>
                <TableCell className="font-mono text-xs">
                  {page.state === 'done' ? (
                    <a
                      href={`https://${page.translatedUri}`}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline"
                    >
                      {page.uri}
                    </a>
                  ) : (
                    page.uri
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  <a href={`https://${page.originalContentUri}`} target="_blank" rel="noreferrer" className="hover:underline">
                    View
                  </a>
                </TableCell>
                <TableCell>
                  <Badge variant={stateBadgeVariant(page.state)}>{page.state}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function TranslationStatus({ keyId, domain }: { keyId: string; domain: string }) {
  const status = useGetV1KeysKeyIdDomainsDomainTranslationsStatus(keyId, domain);
  const retryFailed = usePostV1TranslationsRetry();

  const groups = useMemo(() => {
    if (!status.data) return [];
    const byRule = new Map<string, PageStatusView[]>();
    for (const page of status.data.pages) {
      const list = byRule.get(page.rule) ?? [];
      list.push(page);
      byRule.set(page.rule, list);
    }
    return [...byRule.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [status.data]);

  const failedCount = useMemo(
    () => status.data?.pages.filter((p) => p.state === 'failed').length ?? 0,
    [status.data]
  );

  if (status.isPending) return <Skeleton className="h-24 w-full" />;
  if (status.isError) {
    return (
      <p className="text-sm text-muted-foreground">
        {status.error instanceof ApiError && status.error.status === 404
          ? 'Nothing synced for this domain yet.'
          : 'Failed to load translation status.'}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={failedCount === 0 || retryFailed.isPending}
          onClick={() =>
            retryFailed.mutate(
              { data: { domain } },
              {
                onSuccess: () => {
                  toast.success('Retrying failed pages');
                  status.refetch();
                },
                onError: () => toast.error('Failed to retry pages'),
              }
            )
          }
        >
          <RefreshCw className={retryFailed.isPending ? 'animate-spin' : ''} />
          Retry failed ({failedCount})
        </Button>
        <Button variant="ghost" size="sm" disabled={status.isFetching} onClick={() => status.refetch()}>
          <RefreshCw className={status.isFetching ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </div>
      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pages tracked for this domain yet.</p>
      ) : (
        groups.map(([rule, pages]) => <RuleGroup key={rule} rule={rule} pages={pages} />)
      )}
    </div>
  );
}

function DomainRow({ keyId, domain, onRevoked }: { keyId: string; domain: string; onRevoked: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const revokeDomain = usePutV1KeysDomainsRevoke();

  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm">{domain}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setExpanded((v) => !v)}>
            {expanded ? 'Hide status' : 'View status'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={revokeDomain.isPending}
            onClick={() =>
              revokeDomain.mutate(
                { data: { keyId, domain } },
                { onSuccess: onRevoked, onError: () => toast.error('Failed to revoke domain') }
              )
            }
          >
            Revoke
          </Button>
        </div>
      </div>
      {expanded && (
        <div className="mt-3 border-t pt-3">
          <TranslationStatus keyId={keyId} domain={domain} />
        </div>
      )}
    </div>
  );
}

export default function KeyDetailPage({ params }: PageProps<'/keys/[keyId]'>) {
  const { keyId } = use(params);
  const keys = useGetV1Keys();

  if (keys.isPending) return <Skeleton className="h-40 w-full max-w-md" />;
  if (keys.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Failed to load keys.</AlertDescription>
      </Alert>
    );
  }

  const key = keys.data.keys.find((k) => k.id === keyId);
  if (!key) {
    return <p className="text-sm text-muted-foreground">Key not found.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href="/keys" className="text-sm text-muted-foreground hover:underline">
        ← Back to keys
      </Link>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="font-mono">{key.prefix}…</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{key.label ?? 'No label'}</span>
          <Badge variant={key.revoked ? 'secondary' : 'default'}>{key.revoked ? 'Revoked' : 'Active'}</Badge>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-base font-medium">Domains</h2>
        {key.domains.length === 0 ? (
          <p className="text-sm text-muted-foreground">No domains bound yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {key.domains.map((d) => (
              <DomainRow key={d} keyId={keyId} domain={d} onRevoked={() => keys.refetch()} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
