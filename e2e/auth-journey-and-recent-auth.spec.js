// e2e/auth-journey-and-recent-auth.spec.js
import { test, expect } from '@playwright/test';

test.describe('E2E Real Browser — Auth Journey & Recent Auth (Fase 8.6 — Stage A)', () => {

  test('Desktop (1440x900): renderiza AuthScreen DS2 com painel contextual factual e formulário acessível', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/login');

    // 1. Container e tema
    const authRoot = page.locator('div[data-theme="dark"]');
    await expect(authRoot).toBeVisible();

    // 2. Painel contextual factual deve estar visível no desktop (sem nomenclatura interna)
    await expect(page.getByText('Controle financeiro de alta precisão.')).toBeVisible();
    await expect(page.getByText('Cartões & Faturas')).toBeVisible();
    await expect(page.getByText('Compras Parceladas')).toBeVisible();
    await expect(page.getByText('Divisão Compartilhada')).toBeVisible();
    await expect(page.getByText('Acesso autenticado')).toBeVisible();
    await expect(page.getByText('FinControl 2.0')).toHaveCount(0);
    await expect(page.getByText('Obsidian & Gold')).toHaveCount(0);

    // 3. Formulário de login acessível
    const emailInput = page.getByRole('textbox', { name: /^E-?mail/i });
    const passwordInput = page.locator('#password');
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(emailInput).toHaveAttribute('autocomplete', 'email');
    await expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');

    // 4. Checkbox Lembrar e-mail
    const rememberMeCheckbox = page.getByLabel('Lembrar e-mail');
    await expect(rememberMeCheckbox).toBeVisible();
    await rememberMeCheckbox.check();
    expect(await rememberMeCheckbox.isChecked()).toBe(true);

    // 5. Botão Esqueceu a senha abre modal DS2
    const forgotBtn = page.getByRole('button', { name: /Esqueceu a senha\?/i });
    await forgotBtn.click();

    const resetModalHeading = page.getByRole('heading', { name: 'Recuperar Senha' });
    await expect(resetModalHeading).toBeVisible();

    const resetEmailInput = page.locator('#reset-password-email');
    await expect(resetEmailInput).toBeVisible();
    await resetEmailInput.fill('teste@fincontrol.com');

    // Envia recuperação
    const sendResetBtn = page.getByRole('button', { name: 'Enviar Link' });
    await sendResetBtn.click();

    // Feedback neutro de proteção contra enumeração
    await expect(page.getByText(/Se este e-mail estiver cadastrado/i)).toBeVisible();

    // Fecha modal
    const closeModalBtn = page.getByRole('button', { name: 'Fechar', exact: true });
    await closeModalBtn.click();
    await expect(resetModalHeading).toHaveCount(0);
  });

  test('Mobile (390x844): sem overflow horizontal, touch targets >= 44px e alternância de telas', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login');

    // 1. Ausência de overflow horizontal
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);

    // 2. Painel lateral desktop deve estar oculto no mobile
    await expect(page.getByText('Controle financeiro de alta precisão.')).toBeHidden();

    // 3. Touch targets nos botões e inputs >= 44px
    const submitBtn = page.getByRole('button', { name: 'Entrar', exact: true });
    await expect(submitBtn).toBeVisible();
    const btnBox = await submitBtn.boundingBox();
    expect(btnBox.height).toBeGreaterThanOrEqual(43.5);

    const emailInput = page.getByRole('textbox', { name: /^E-?mail/i });
    const inputBox = await emailInput.boundingBox();
    expect(inputBox.height).toBeGreaterThanOrEqual(43.5);

    // 4. Alternância para modo de cadastro no mobile
    const toggleToRegister = page.getByRole('button', { name: /Não tem uma conta\? Cadastre-se/i });
    await toggleToRegister.click();

    // Verifica campos de cadastro
    await expect(page.getByRole('textbox', { name: /Nome/i })).toBeVisible();
    await expect(page.locator('#confirmPassword')).toBeVisible();
    const createBtn = page.getByRole('button', { name: 'Criar Conta', exact: true });
    await expect(createBtn).toBeVisible();

    // Alterna de volta para login
    const toggleToLogin = page.getByRole('button', { name: /Já possui uma conta\? Entrar/i });
    await toggleToLogin.click();
    await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeVisible();
  });

  test('URL query parameter (?mode=register) abre diretamente no modo de cadastro', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/login?mode=register');

    await expect(page.getByRole('textbox', { name: /Nome/i })).toBeVisible();
    await expect(page.locator('#confirmPassword')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Criar Conta', exact: true })).toBeVisible();
  });

  test('Negative Query: /login?mode=verify&email=fake@example.com não ativa tela de verificação e permanece no login normal', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/login?mode=verify&email=fake@example.com');

    // 1. EmailVerificationView NÃO deve aparecer
    await expect(page.getByText('Enviamos um link de confirmação')).toHaveCount(0);
    await expect(page.getByText('Confirme seu E-mail')).toHaveCount(0);
    await expect(page.getByText('fake@example.com')).toHaveCount(0);

    // 2. Deve permanecer no formulário de login normal
    await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('textbox', { name: /^E-?mail/i })).toBeVisible();
  });

});
