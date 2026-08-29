'use client';

import { use, useState, type FormEvent } from 'react';
import Link from 'next/link';
import {
  useGetV1Keys,
  usePostV1KeysDomains,
  usePutV1KeysDomainsRevoke,
  useGetV1KeysKeyIdDomainsDomainTranslationsStatus,
} from '@/generated/api/default/default';
import { ApiError } from '@/lib/api-mutator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';

// No idempotent "get one key" endpoint exists on fluenza (only the list, and the destructive
// revoke response, per the backend inventory) - find this key in the list the account already
// has to fetch for /keys instead of adding a redundant network round trip.
function TranslationStatus({ keyId, domain }: { keyId: string; domain: string }) {
  const status = useGetV1KeysKeyIdDomainsDomainTranslationsStatus(keyId, domain);

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
  if (status.data.pages.length === 0) {
    return <p className="text-sm text-muted-foreground">No pages tracked for this domain yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Checksum</TableHead>
          <TableHead>Rule</TableHead>
          <TableHead>State</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {status.data.pages.map((page) => (
          <TableRow key={`${page.rule}:${page.checksum}`}>
            <TableCell className="font-mono text-xs">{page.checksum.slice(0, 12)}…</TableCell>
            <TableCell className="font-mono text-xs">{page.rule}</TableCell>
            <TableCell>
              <Badge variant={page.state === 'done' ? 'default' : page.state === 'failed' ? 'destructive' : 'secondary'}>
                {page.state}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
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
  const bindDomain = usePostV1KeysDomains();
  const [domain, setDomain] = useState('');

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

  function handleBind(event: FormEvent) {
    event.preventDefault();
    bindDomain.mutate(
      { data: { keyId, domain } },
      {
        onSuccess: () => {
          setDomain('');
          keys.refetch();
        },
        onError: () => toast.error('Failed to bind domain'),
      }
    );
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
        <form onSubmit={handleBind} className="mb-4 flex max-w-md items-end gap-2">
          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor="domain">Bind a new domain</Label>
            <Input
              id="domain"
              placeholder="example.com"
              required
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              disabled={key.revoked}
            />
          </div>
          <Button type="submit" disabled={bindDomain.isPending || key.revoked}>
            {bindDomain.isPending ? 'Binding…' : 'Bind'}
          </Button>
        </form>

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
