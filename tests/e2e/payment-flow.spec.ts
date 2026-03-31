import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Setup Supabase Client (Service Role required to bypass RLS for test verification)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const supabase = createClient(supabaseUrl, supabaseKey);

test.describe('Stripe Payment E2E Flow', () => {

  // testUser is populated in beforeEach so it is in scope for all DB assertions
  let testUser: { id: string };

  test.beforeEach(async () => {
    // Retrieve the currently authenticated Supabase test user (service role bypasses RLS)
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error || !data.users.length) throw new Error('No test user found in Supabase auth');
    // Use the first user — replace this with a dedicated test account lookup if needed
    testUser = { id: data.users[0].id };
  });

  test('Successful Payment (4242) and DB Verification', async ({ page }) => {
    // 1. Navigate to checkout (adjust URL to specific test product/route)
    await page.goto('/checkout');
    
    // 2. Fill Stripe Element with Test Card 4242
    const cardNumberInput = page.frameLocator('.__PrivateStripeElement iframe').locator('input[name="cardnumber"]');
    await cardNumberInput.fill('4242 4242 4242 4242');
    
    const expiryInput = page.frameLocator('.__PrivateStripeElement iframe').locator('input[name="exp-date"]');
    await expiryInput.fill('12/30');
    
    const cvcInput = page.frameLocator('.__PrivateStripeElement iframe').locator('input[name="cvc"]');
    await cvcInput.fill('123');

    // 3. Submit Payment
    await page.getByRole('button', { name: /Zahlung pflichtig abschließen/i }).click();

    // 4. Verify Success URL or UI State
    await expect(page).toHaveURL(/\/checkout\/success/);

    // 5. Verify Supabase Database (Wait for webhook to process)
    // Fetch und Poll latest order for THIS specific test user
    // expect.poll wartet, bis der Webhook die DB erfolgreich aktualisiert hat (max 10s)
    await expect.poll(async () => {
      const { data: order, error } = await supabase
        .from('orders')
        .select('payment_intent_id, status')
        .eq('user_id', testUser.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(); // QA-Fix: maybeSingle verhindert Error-Spamming bei 0 Reihen

      // QA-Fix: Echte Fehler (Auth, Network, etc.) hart werfen, nicht schlucken!
      if (error) {
        throw new Error(`Kritischer Supabase DB-Fehler im Payment-Poll: ${error.message}`);
      }

      return order; // Ist null, solange der Webhook nicht gefeuert hat. Poll retried automatisch.
    }, {
      message: 'Timeout: Webhook hat den Order-Status nicht rechtzeitig auf paid gesetzt.',
      timeout: 10000,
    }).toMatchObject({
      payment_intent_id: expect.stringContaining('pi_'),
      status: 'paid'
    });
  });

  test('Failed Payment Error Handling', async ({ page }) => {
    await page.goto('/checkout');
    
    // Use Stripe decline test card (e.g., 4000 0000 0000 0002)
    const cardNumberInput = page.frameLocator('.__PrivateStripeElement iframe').locator('input[name="cardnumber"]');
    await cardNumberInput.fill('4000 0000 0000 0002');
    await page.frameLocator('.__PrivateStripeElement iframe').locator('input[name="exp-date"]').fill('12/30');
    await page.frameLocator('.__PrivateStripeElement iframe').locator('input[name="cvc"]').fill('123');

    await page.getByRole('button', { name: /Zahlung pflichtig abschließen/i }).click();

    // Verify UI shows error message and does not crash
    await expect(page.locator('.stripe-error-message')).toBeVisible();
    await expect(page.locator('.stripe-error-message')).toContainText('Ihre Karte wurde abgelehnt');
  });
});
