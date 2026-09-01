'use client';

import { Suspense, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { usePostV1AccountActivate } from '@/generated/api/default/default';
import { ApiError } from '@/lib/api-mutator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

function ActivateRunner() {
  const token = useSearchParams().get('token') ?? '';
  const activate = usePostV1AccountActivate();
  const firedFor = useRef<string | null>(null);

  useEffect(() => {
    if (token && firedFor.current !== token) {
      firedFor.current = token;
      activate.mutate({ data: { token } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!token) {
    return (
      <CardContent>
        <Alert variant="destructive">
          <AlertDescription>No token found in the link.</AlertDescription>
        </Alert>
      </CardContent>
    );
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

  if (activate.isError) {
    return (
      <CardContent>
        <Alert variant="destructive">
          <AlertDescription>
            {activate.error instanceof ApiError ? activate.error.message : 'Activation failed'}
          </AlertDescription>
        </Alert>
      </CardContent>
    );
  }

  return <CardContent className="text-sm text-muted-foreground">Activating…</CardContent>;
}

export default function ActivatePage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Activate your account</CardTitle>
          <CardDescription>Confirming your account with fluenza</CardDescription>
        </CardHeader>
        <Suspense>
          <ActivateRunner />
        </Suspense>
      </Card>
    </div>
  );
}
