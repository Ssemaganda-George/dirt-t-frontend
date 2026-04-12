-- Allow admins to read all payments (guest checkouts have user_id null).
-- Required for getAllTransactionsForAdmin: transactions.reference → payments.order_id → orders.platform_fee

CREATE POLICY "Admins can read all payments"
ON public.payments
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);
