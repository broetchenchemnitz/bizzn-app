import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Setup Supabase Client (Service Role required to bypass RLS for test verification)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const supabase = createClient(supabaseUrl, supabaseKey);

test.describe('Stripe Payment E2E Flow', () => {
  
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
    await page.waitForTimeout(3000); // Give Webhook time to process
    
    // Fetch latest order for this test user/session
    const { data: order, error } = await supabase
      .from('orders')
      .select('payment_intent_id, status')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    expect(error).toBeNull();
    expect(order?.payment_intent_id).toBeTruthy();
    expect(order?.payment_intent_id).toContain('pi_');
    expect(order?.status).toBe('paid');
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
