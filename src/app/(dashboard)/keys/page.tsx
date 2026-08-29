'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useGetV1Keys, usePostV1Keys, usePutV1KeysRevoke } from '@/generated/api/default/default';
import type { CreateKeyResponse } from '@/generated/api/model';
import { ApiError } from '@/lib/api-mutator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

function CreateKeyDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [created, setCreated] = useState<CreateKeyResponse | null>(null);
  const createKey = usePostV1Keys();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    createKey.mutate(
      { data: { label: label || undefined } },
      {
        onSuccess: (key) => {
          setCreated(key);
          onCreated();
        },
        onError: () => toast.error('Failed to create key'),
      }
    );
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      // Reset once the dialog is dismissed, not while the secret is still on screen.
      setLabel('');
      setCreated(null);
      createKey.reset();
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>New key</Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>Key created</DialogTitle>
              <DialogDescription>
                This secret is shown once and can&apos;t be retrieved again. Copy it now.
              </DialogDescription>
            </DialogHeader>
            <Input readOnly value={created.secret} onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" />
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Create a new key</DialogTitle>
              <DialogDescription>Optionally label it to tell it apart from your other keys.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2 py-4">
              <Label htmlFor="label">Label (optional)</Label>
              <Input id="label" value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
            {createKey.isError && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>
                  {createKey.error instanceof ApiError ? createKey.error.message : 'Failed to create key'}
                </AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button type="submit" disabled={createKey.isPending}>
                {createKey.isPending ? 'Creating…' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
      </Dialog>
    </>
  );
}

export default function KeysPage() {
  const keys = useGetV1Keys();
  const revokeKey = usePutV1KeysRevoke();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium">API keys</h1>
        <CreateKeyDialog onCreated={() => keys.refetch()} />
      </div>

      {keys.isPending ? (
        <Skeleton className="h-40 w-full" />
      ) : keys.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {keys.error instanceof ApiError ? keys.error.message : 'Failed to load keys'}
          </AlertDescription>
        </Alert>
      ) : keys.data.keys.length === 0 ? (
        <p className="text-sm text-muted-foreground">No keys yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Prefix</TableHead>
              <TableHead>Label</TableHead>
              <TableHead>Domains</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {keys.data.keys.map((key) => (
              <TableRow key={key.id}>
                <TableCell className="font-mono text-xs">
                  <Link href={`/keys/${key.id}`} className="hover:underline">
                    {key.prefix}…
                  </Link>
                </TableCell>
                <TableCell>{key.label ?? '—'}</TableCell>
                <TableCell>{key.domains.length}</TableCell>
                <TableCell>
                  <Badge variant={key.revoked ? 'secondary' : 'default'}>{key.revoked ? 'Revoked' : 'Active'}</Badge>
                </TableCell>
                <TableCell>
                  {!key.revoked && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={revokeKey.isPending}
                      onClick={() =>
                        revokeKey.mutate(
                          { data: { keyId: key.id } },
                          {
                            onSuccess: () => keys.refetch(),
                            onError: () => toast.error('Failed to revoke key'),
                          }
                        )
                      }
                    >
                      Revoke
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
