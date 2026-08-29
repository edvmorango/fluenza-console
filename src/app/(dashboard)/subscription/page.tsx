'use client';

import {
  useGetV1Subscription,
  useGetV1SubscriptionPlans,
  usePostV1Subscription,
  usePutV1SubscriptionCancel,
} from '@/generated/api/default/default';
import type { PlanResponse } from '@/generated/api/model';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

function formatAmount(cents: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);
}

function PlanCard({ plan }: { plan: PlanResponse }) {
  const createSubscription = usePostV1Subscription();

  function choosePlan() {
    const origin = window.location.origin;
    createSubscription.mutate(
      {
        data: {
          priceId: plan.priceId,
          successUrl: `${origin}/subscription/checkout/complete`,
          cancelUrl: `${origin}/subscription`,
        },
      },
      {
        onSuccess: (checkout) => {
          window.location.href = checkout.url;
        },
        onError: () => toast.error('Failed to start checkout'),
      }
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{plan.productName}</CardTitle>
        <CardDescription>
          {formatAmount(plan.unitAmount, plan.currency)}
          {plan.interval ? ` / ${plan.interval}` : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>{plan.maxKeys} keys</li>
          <li>{plan.maxDomains} domains</li>
          <li>{plan.rateLimitRpm} requests/min</li>
          <li>{plan.rateLimitRpd} requests/day</li>
        </ul>
        <Button onClick={choosePlan} disabled={createSubscription.isPending}>
          {createSubscription.isPending ? 'Redirecting…' : 'Choose plan'}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function SubscriptionPage() {
  const subscription = useGetV1Subscription();
  const plans = useGetV1SubscriptionPlans();
  const cancel = usePutV1SubscriptionCancel();

  return (
    <div className="flex flex-col gap-8">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Current subscription</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {subscription.isPending ? (
            <Skeleton className="h-6 w-24" />
          ) : subscription.isError ? (
            <p className="text-destructive text-sm">Failed to load subscription.</p>
          ) : (
            <>
              <Badge variant={subscription.data.status === 'ACTIVE' ? 'default' : 'secondary'}>
                {subscription.data.status}
              </Badge>
              {subscription.data.status !== 'NONE' && (
                <dl className="text-sm text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1">
                  <dt>Max keys</dt>
                  <dd>{subscription.data.maxKeys}</dd>
                  <dt>Max domains</dt>
                  <dd>{subscription.data.maxDomains}</dd>
                  <dt>Rate limit (rpm)</dt>
                  <dd>{subscription.data.rateLimitRpm}</dd>
                  <dt>Rate limit (rpd)</dt>
                  <dd>{subscription.data.rateLimitRpd}</dd>
                </dl>
              )}
              {(subscription.data.status === 'ACTIVE' || subscription.data.status === 'CANCELING') && (
                <Button
                  variant="outline"
                  className="w-fit"
                  disabled={cancel.isPending || subscription.data.status === 'CANCELING'}
                  onClick={() =>
                    cancel.mutate(undefined, {
                      onSuccess: () => {
                        subscription.refetch();
                        toast.success('Subscription set to cancel at period end');
                      },
                      onError: () => toast.error('Failed to cancel subscription'),
                    })
                  }
                >
                  {subscription.data.status === 'CANCELING'
                    ? 'Cancels at period end'
                    : cancel.isPending
                      ? 'Canceling…'
                      : 'Cancel subscription'}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-4 text-lg font-medium">Plans</h2>
        {plans.isPending ? (
          <Skeleton className="h-40 w-full max-w-2xl" />
        ) : plans.isError ? (
          <Alert variant="destructive" className="max-w-md">
            <AlertDescription>
              Failed to load plans. If this is a fresh dev setup, check that STRIPE_API_KEY in fluenza&apos;s
              secret.env is a real Stripe test key.
            </AlertDescription>
          </Alert>
        ) : plans.data.plans.length === 0 ? (
          <p className="text-sm text-muted-foreground">No plans available.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.data.plans.map((plan) => (
              <PlanCard key={plan.priceId} plan={plan} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
