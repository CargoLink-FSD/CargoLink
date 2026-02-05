import { test, expect } from '@playwright/test';

test('customer signup flow', async ({ page }) => {
  await page.goto('http://localhost:5173/signup?type=customer');
  
  // Step 1: Personal Info
  await page.fill('input[name="firstName"]', 'John');
  await page.fill('input[name="lastName"]', 'Doe');
  await page.selectOption('select[name="gender"]', 'Male');
  await page.click('button:has-text("Next")');
  
  // Step 2: Contact Info
  await page.fill('input[name="phone"]', '9876543210');
  await page.fill('input[name="email"]', 'john.doe@example.com');
  await page.fill('input[name="dob"]', '1990-01-01');
  await page.click('button:has-text("Next")');
  
  // Step 3: Address
  await page.fill('input[name="street_address"]', '123 Main St');
  await page.fill('input[name="city"]', 'Mumbai');
  await page.fill('input[name="state"]', 'Maharashtra');
  await page.fill('input[name="pin"]', '400001');
  await page.click('button:has-text("Next")');
  
  // Step 4: Password
  await page.fill('input[name="password"]', 'Password123!');
  await page.fill('input[name="confirmPassword"]', 'Password123!');
  await page.check('input[name="terms"]');
  await page.click('button:has-text("Create Account")');
  
  // Wait for redirect
  await page.waitForURL(/\/(login|customer)/, { timeout: 10000 });
  
  const currentUrl = page.url();
  expect(currentUrl).toMatch(/\/(login|customer)/);
});
