import { z } from 'zod';

export const loginSchema = z.object({
  login: z.string().regex(/^\d{5}$/, 'Login musi składać się z 5 cyfr'),
  password: z
    .string()
    .min(8, 'Hasło musi mieć minimum 8 znaków')
    .regex(/[a-zA-Z]/, 'Hasło musi zawierać co najmniej jedną literę')
    .regex(/\d/, 'Hasło musi zawierać co najmniej jedną cyfrę'),
});

export const productSchema = z.object({
  sku: z
    .string()
    .min(1, 'Kod SKU jest wymagany')
    .max(50, 'Kod SKU może mieć maksymalnie 50 znaków'),
  ean: z
    .string()
    .regex(/^\d{8,13}$/, 'EAN musi mieć 8-13 cyfr')
    .optional()
    .or(z.literal('')),
  name: z
    .string()
    .min(2, 'Nazwa musi mieć minimum 2 znaki')
    .max(100, 'Nazwa może mieć maksymalnie 100 znaków'),
  unit: z.string().min(1, 'Jednostka miary jest wymagana'),
  description: z.string().max(500).optional().or(z.literal('')),
});

export const locationSchema = z.object({
  code: z
    .string()
    .min(1, 'Kod lokalizacji jest wymagany')
    .max(20, 'Kod może mieć maksymalnie 20 znaków'),
  type: z.string().min(1, 'Typ lokalizacji jest wymagany'),
  row: z.string().max(10, 'Maksymalnie 10 znaków').optional().or(z.literal('')),
  rack: z.string().max(10, 'Maksymalnie 10 znaków').optional().or(z.literal('')),
  shelf: z.string().max(10, 'Maksymalnie 10 znaków').optional().or(z.literal('')),
});

export const documentPZSchema = z.object({
  supplierId: z.number().min(1, 'Wybierz dostawcę z katalogu'),
  items: z
    .array(
      z.object({
        productId: z.number().min(1, 'Wybierz produkt'),
        quantity: z.number().min(0.001, 'Ilość musi być większa od 0'),
      }),
    )
    .min(1, 'Dokument musi zawierać co najmniej jedną pozycję'),
});

export const documentMMSchema = z
  .object({
    fromLocation: z.string().min(1, 'Lokalizacja źródłowa jest wymagana'),
    toLocation: z.string().min(1, 'Lokalizacja docelowa jest wymagana'),
    items: z
      .array(
        z.object({
          productId: z.number().min(1, 'Wybierz produkt'),
          quantity: z.number().min(0.001, 'Ilość musi być większa od 0'),
        }),
      )
      .min(1, 'Dokument musi zawierać co najmniej jedną pozycję'),
  })
  .refine((d) => d.fromLocation !== d.toLocation, {
    message: 'Lokalizacja źródłowa i docelowa muszą być różne',
    path: ['toLocation'],
  });

export const documentRWSchema = z.object({
  recipient: z.string().min(2, 'Odbiorca jest wymagany'),
  items: z
    .array(
      z.object({
        productId: z.number().min(1, 'Wybierz produkt'),
        quantity: z.number().min(0.001, 'Ilość musi być większa od 0'),
      }),
    )
    .min(1, 'Dokument musi zawierać co najmniej jedną pozycję'),
});

export const taskSchema = z.object({
  type: z.string().min(1, 'Typ zadania jest wymagany'),
  assignedTo: z.string().min(1, 'Przypisz zadanie do magazyniera'),
  productId: z.number().min(1, 'Wybierz produkt'),
  fromLocation: z.string().min(1, 'Lokalizacja źródłowa jest wymagana'),
  toLocation: z.string().optional().or(z.literal('')),
  quantity: z.number().min(0.001, 'Ilość musi być większa od 0'),
});

// Wspólne pola profilu (edycja — bez email)
export const userEditSchema = z.object({
  firstName: z.string().min(2, 'Imię jest wymagane'),
  lastName: z.string().min(2, 'Nazwisko jest wymagane'),
  role: z.string().min(1, 'Rola jest wymagana'),
});

// Schema z emailem — np. testy / kompatybilność
export const userSchema = userEditSchema.extend({
  email: z.string().email('Podaj prawidłowy adres email'),
  password: z.string().optional(),
});

// Tworzenie konta: admin podaje dane i role, haslo ustawia uzytkownik z linku e-mail.
export const userCreateSchema = userEditSchema.extend({
  email: z.string().email('Podaj prawidłowy adres email'),
});

export const setPasswordFromLinkSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'Hasło musi mieć minimum 8 znaków')
      .regex(/[a-zA-Z]/, 'Hasło musi zawierać co najmniej jedną literę')
      .regex(/\d/, 'Hasło musi zawierać co najmniej jedną cyfrę'),
    confirmPassword: z.string().min(1, 'Potwierdź nowe hasło'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Hasła nie są identyczne',
    path: ['confirmPassword'],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Podaj aktualne hasło'),
    newPassword: z
      .string()
      .min(8, 'Hasło musi mieć minimum 8 znaków')
      .regex(/[a-zA-Z]/, 'Hasło musi zawierać co najmniej jedną literę')
      .regex(/\d/, 'Hasło musi zawierać co najmniej jedną cyfrę'),
    confirmPassword: z.string().min(1, 'Potwierdź nowe hasło'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Hasła nie są identyczne',
    path: ['confirmPassword'],
  });

export type LoginFormData = z.infer<typeof loginSchema>;
export type ProductFormData = z.infer<typeof productSchema>;
export type LocationFormData = z.infer<typeof locationSchema>;
export type DocumentPZFormData = z.infer<typeof documentPZSchema>;
export type DocumentMMFormData = z.infer<typeof documentMMSchema>;
export type DocumentRWFormData = z.infer<typeof documentRWSchema>;
export type TaskFormData = z.infer<typeof taskSchema>;
export type UserFormData = z.infer<typeof userCreateSchema>;
export type UserEditFormData = z.infer<typeof userEditSchema>;
export type UserCreateFormData = z.infer<typeof userCreateSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
export type SetPasswordFromLinkFormData = z.infer<typeof setPasswordFromLinkSchema>;
