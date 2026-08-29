'use client';

import { useGetV1AccountMe, usePostV1AccountEmailResend } from '@/generated/api/default/default';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function AccountPage() {
  const me = useGetV1AccountMe();
  const resend = usePostV1AccountEmailResend();

  if (me.isPending) {
    return <Skeleton className="h-32 w-full max-w-md" />;
  }

  if (me.isError) {
    return <p className="text-destructive text-sm">Failed to load your account.</p>;
  }

  const account = me.data;

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Account</CardTitle>
        <CardDescription>{account.email}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status</span>
          <Badge variant={account.status === 'ACTIVE' ? 'default' : 'secondary'}>{account.status}</Badge>
        </div>
        {account.status === 'EMAIL_PENDING' && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              Your email hasn&apos;t been verified yet. Check your inbox for the activation link.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-fit"
              disabled={resend.isPending}
              onClick={() =>
                resend.mutate(
                  { data: { email: account.email } },
                  {
                    onSuccess: () => toast.success('Activation email resent'),
                    onError: () => toast.error('Failed to resend activation email'),
                  }
                )
              }
            >
              {resend.isPending ? 'Sending…' : 'Resend activation email'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
