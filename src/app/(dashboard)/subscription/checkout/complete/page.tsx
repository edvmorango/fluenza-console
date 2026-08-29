'use client';

import { Suspense, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { usePostV1SubscriptionCheckoutComplete } from '@/generated/api/default/default';
import { ApiError } from '@/lib/api-mutator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';

// Stripe redirects the browser here after a successful hosted checkout, with ?session_id=...
// appended (see the successUrl built in subscription/page.tsx).
function CompleteCheckout() {
  const sessionId = useSearchParams().get('session_id');
  const complete = usePostV1SubscriptionCheckoutComplete();
  const attempted = useRef(false);

  useEffect(() => {
    if (!sessionId || attempted.current) return;
    attempted.current = true;
    complete.mutate({ data: { sessionId } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  if (!sessionId) {
    return <p className="text-destructive text-sm">No checkout session found.</p>;
  }

  if (complete.isPending || complete.isIdle) {
    return <p className="text-sm text-muted-foreground">Finalizing your subscription…</p>;
  }

  if (complete.isError) {
    return (
      <p className="text-destructive text-sm">
        {complete.error instanceof ApiError ? complete.error.message : 'Failed to complete checkout'}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm">Your subscription is now {complete.data.status}.</p>
      <Link href="/subscription" className={buttonVariants({ className: 'w-fit' })}>
        Back to subscription
      </Link>
    </div>
  );
}

export default function CheckoutCompletePage() {
  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Checkout</CardTitle>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
          <CompleteCheckout />
        </Suspense>
      </CardContent>
    </Card>
  );
}
