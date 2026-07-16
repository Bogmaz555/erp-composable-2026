import { test, expect } from '@playwright/test';

const CHAINS = [
  { path: '/pm', pattern: /Projekt|PM|Rejestr/i, label: 'PM' },
  { path: '/finance', pattern: /Finanse|milestones|Środki/i, label: 'Finance' },
  { path: '/tax', pattern: /Tax|KSeF|JPK/i, label: 'Tax' },
  { path: '/proc', pattern: /Zaopatrzen|Procurement|Zamówienia/i, label: 'PROC' },
  { path: '/inv', pattern: /Magazyn|INV|Asortyment/i, label: 'INV' },
  { path: '/quality', pattern: /Quality|ISO|NCR|CAPA/i, label: 'Quality' },
  { path: '/mes', pattern: /Kiosk|MES|Shopfloor/i, label: 'MES' },
  { path: '/eam', pattern: /EAM|Work Orders|Harmonogram/i, label: 'EAM' },
  { path: '/crm', pattern: /CRM|CPQ|Pipeline/i, label: 'CRM' },
  { path: '/hr', pattern: /HR|Kadry|Pracownik/i, label: 'HR' },
  { path: '/plm', pattern: /PLM|Inżynieryjne|ECO/i, label: 'PLM' },
];

test.describe('All cross-module chains matrix (W128)', () => {
  for (const step of CHAINS) {
    test(`${step.label} module reachable`, async ({ page }) => {
      await page.goto(step.path);
      await expect(page.locator('body')).toContainText(step.pattern, { timeout: 20000 });
    });
  }
});
