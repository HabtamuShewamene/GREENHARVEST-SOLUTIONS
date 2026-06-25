import { z } from 'zod';

export const productFormSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters').max(200),
  description: z.string().max(2000).optional(),
  price: z.coerce.number().positive('Price must be greater than 0'),
  stock: z.coerce.number().int('Stock must be a whole number').min(0, 'Stock cannot be negative'),
  category_id: z.string().optional(),
  unit: z.string().optional(),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

export function validateProductStep(step: number, data: Record<string, unknown>): string | null {
  if (step === 1) {
    const result = productFormSchema.pick({ name: true }).safeParse(data);
    if (!result.success) return result.error.issues[0]?.message || 'Invalid product name';
  }
  if (step === 2) {
    const result = productFormSchema.pick({ price: true, stock: true }).safeParse(data);
    if (!result.success) return result.error.issues[0]?.message || 'Invalid price or stock';
  }
  return null;
}

export function validateProductForm(data: Record<string, unknown>): string | null {
  const result = productFormSchema.safeParse(data);
  if (!result.success) return result.error.issues[0]?.message || 'Validation failed';
  return null;
}
