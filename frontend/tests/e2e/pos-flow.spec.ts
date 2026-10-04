import { test, expect } from '@playwright/test';

test.describe('Restaurant POS Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@stellaar.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('complete order-to-payment flow', async ({ page }) => {
    // Navigate to restaurant tables
    await page.goto('/dashboard/restaurant');
    await expect(page.locator('text=Table 1')).toBeVisible();

    // Start order on Table 1
    await page.click('text=Table 1');
    await expect(page).toHaveURL(/\/dashboard\/restaurant\/table\/1/);

    // Add item to cart
    await page.click('text=Paneer Tikka >> button:has-text("Add")');

    // Verify cart has item
    await expect(page.locator('text=Paneer Tikka')).toBeVisible();
    await expect(page.locator('text=280')).toBeVisible();

    // Verify/Submit KOT
    await page.click('button:has-text("Submit KOT")');

    // Generate bill
    await page.click('button:has-text("Generate Bill")');
    await page.click('button:has-text("Generate Bill")'); // confirm modal

    // Bill should be pending - wait for bill pending state
    await expect(page.locator('text=Bill Pending')).toBeVisible({ timeout: 10000 });

    // Open payment modal
    await page.click('button:has-text("Record Payment")');

    // Select payment mode
    await page.click('button:has-text("Card")');

    // Enter reference
    await page.fill('input[placeholder*="Card"]', 'TXN123456');

    // Pay
    await page.click('button:has-text("Pay & Release")');

    // Table should be released
    await expect(page.locator('text=Table released')).toBeVisible({ timeout: 10000 });
    await page.goto('/dashboard/restaurant');
    await expect(page.locator('text=Table 1')).toBeVisible();
    await expect(page.locator('text=AVAILABLE')).toBeVisible();
  });

  test('blocks new KOT on unpaid bill', async ({ page }) => {
    await page.goto('/dashboard/restaurant');
    
    // Create and bill an order on Table 2
    await page.click('text=Table 2');
    await page.click('text=Butter Chicken >> button:has-text("Add")');
    await page.click('button:has-text("Submit KOT")');
    await page.click('button:has-text("Generate Bill")');
    await page.click('button:has-text("Generate Bill")');
    
    await expect(page.locator('text=Bill Pending')).toBeVisible({ timeout: 10000 });
    
    // Go back to tables and try new order on same table
    await page.goto('/dashboard/restaurant');
    await page.click('text=Table 2');
    
    // Should show unpaid bill error
    await expect(page.locator('text=unpaid bill')).toBeVisible({ timeout: 5000 });
  });

  test('member discount applied', async ({ page }) => {
    await page.goto('/dashboard/restaurant');
    await page.click('text=Table 3');
    
    // Search and select member
    await page.fill('input[placeholder*="Search member"]', 'test');
    await page.click('text=Test Member');
    
    // Add item
    await page.click('text=Butter Chicken >> button:has-text("Add")');
    
    // Generate bill
    await page.click('button:has-text("Generate Bill")');
    await page.click('button:has-text("Generate Bill")');
    
    // Check discount applied (30% off 450 = 135)
    await expect(page.locator('text=Discount')).toBeVisible();
    await expect(page.locator('text=135')).toBeVisible();
  });
});