'use client';

import { Suspense, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { usePostV1AccountActivate } from '@/generated/api/default/default';
import { ApiError } from '@/lib/api-mutator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

// The activation link fluenza emails only carries `?token=` - the endpoint also needs the
// account's email, which the link doesn't include, so this page just asks for it.
function ActivateForm() {
  const tokenFromLink = useSearchParams().get('token') ?? '';
  const [email, setEmail] = useState('');
  const [token, setToken] = useState(tokenFromLink);
  const activate = usePostV1AccountActivate();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    activate.mutate({ data: { email, token } });
  }

  if (activate.isSuccess) {
    return (
      <CardContent>
        <p className="text-sm">
          Your account is active.{' '}
          <Link href="/login" className="underline">
            Log in
          </Link>
          .
        </p>
      </CardContent>
    );
  }

  return (
    <CardContent>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {activate.isError && (
          <Alert variant="destructive">
            <AlertDescription>
              {activate.error instanceof ApiError ? activate.error.message : 'Activation failed'}
            </AlertDescription>
          </Alert>
        )}
        {!tokenFromLink && (
          <Alert variant="destructive">
            <AlertDescription>No token found in the link - paste it below.</AlertDescription>
          </Alert>
        )}
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="token">Activation token</Label>
          <Input id="token" required value={token} onChange={(e) => setToken(e.target.value)} />
        </div>
        <Button type="submit" disabled={activate.isPending}>
          {activate.isPending ? 'Activating…' : 'Activate account'}
        </Button>
      </form>
    </CardContent>
  );
}

export default function ActivatePage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Activate your account</CardTitle>
          <CardDescription>Confirm your email to finish setting up fluenza</CardDescription>
        </CardHeader>
        <Suspense>
          <ActivateForm />
        </Suspense>
      </Card>
    </div>
  );
}
