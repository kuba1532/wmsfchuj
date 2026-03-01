import { describe, it, expect } from 'vitest';
import { loginSchema, productSchema, userSchema, changePasswordSchema } from '@/utils/validators';

describe('Login Schema', () => {
  it('akceptuje prawidłowy login 5-cyfrowy', () => {
    const result = loginSchema.safeParse({ login: '12345', password: 'haslo123' });
    expect(result.success).toBe(true);
  });

  it('odrzuca login krótszy niż 5 cyfr', () => {
    const result = loginSchema.safeParse({ login: '1234', password: 'haslo123' });
    expect(result.success).toBe(false);
  });

  it('odrzuca login z literami', () => {
    const result = loginSchema.safeParse({ login: '123ab', password: 'haslo123' });
    expect(result.success).toBe(false);
  });

  it('odrzuca hasło krótsze niż 8 znaków', () => {
    const result = loginSchema.safeParse({ login: '12345', password: 'abc1' });
    expect(result.success).toBe(false);
  });

  it('odrzuca hasło bez cyfry', () => {
    const result = loginSchema.safeParse({ login: '12345', password: 'abcdefgh' });
    expect(result.success).toBe(false);
  });

  it('odrzuca hasło bez litery', () => {
    const result = loginSchema.safeParse({ login: '12345', password: '12345678' });
    expect(result.success).toBe(false);
  });
});

describe('Product Schema', () => {
  it('akceptuje prawidłowy produkt', () => {
    const result = productSchema.safeParse({ sku: 'SKU-001', name: 'Śruba M8', unit: 'szt' });
    expect(result.success).toBe(true);
  });

  it('odrzuca pusty SKU', () => {
    const result = productSchema.safeParse({ sku: '', name: 'Śruba', unit: 'szt' });
    expect(result.success).toBe(false);
  });

  it('odrzuca SKU w złym formacie', () => {
    const result = productSchema.safeParse({ sku: 'ABC', name: 'Śruba', unit: 'szt' });
    expect(result.success).toBe(false);
  });

  it('odrzuca pustą nazwę', () => {
    const result = productSchema.safeParse({ sku: 'SKU-001', name: '', unit: 'szt' });
    expect(result.success).toBe(false);
  });

  it('odrzuca nazwę dłuższą niż 100 znaków', () => {
    const result = productSchema.safeParse({ sku: 'SKU-001', name: 'a'.repeat(101), unit: 'szt' });
    expect(result.success).toBe(false);
  });
});

describe('User Schema', () => {
  it('akceptuje prawidłowego użytkownika', () => {
    const result = userSchema.safeParse({
      email: 'jan@wms.pl',
      firstName: 'Jan',
      lastName: 'Kowalski',
      role: 'MAGAZYNIER',
    });
    expect(result.success).toBe(true);
  });

  it('odrzuca nieprawidłowy email', () => {
    const result = userSchema.safeParse({
      email: 'nie-email',
      firstName: 'Jan',
      lastName: 'Kowalski',
      role: 'MAGAZYNIER',
    });
    expect(result.success).toBe(false);
  });
});

describe('Change Password Schema', () => {
  it('akceptuje prawidłową zmianę hasła', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'stare123',
      newPassword: 'nowe1234',
      confirmPassword: 'nowe1234',
    });
    expect(result.success).toBe(true);
  });

  it('odrzuca gdy hasła nie pasują', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'stare123',
      newPassword: 'nowe1234',
      confirmPassword: 'inne5678',
    });
    expect(result.success).toBe(false);
  });
});
