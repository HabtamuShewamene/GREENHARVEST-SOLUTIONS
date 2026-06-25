import { z } from 'zod';

export const campaignFormSchema = z.object({
  name: z.string().min(3, 'Campaign name must be at least 3 characters').max(200),
  type: z.enum(['flash_sale', 'discount', 'voucher', 'bundle']),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  discount_type: z.enum(['percentage', 'fixed']),
  discount_value: z.coerce.number().positive('Discount value must be greater than 0'),
  voucher_code: z.string().max(50).optional(),
}).refine(
  (data) => new Date(data.end_date) >= new Date(data.start_date),
  { message: 'End date must be on or after start date', path: ['end_date'] }
).refine(
  (data) => data.discount_type !== 'percentage' || data.discount_value <= 100,
  { message: 'Percentage discount cannot exceed 100%', path: ['discount_value'] }
);

export type CampaignFormValues = z.infer<typeof campaignFormSchema>;

export function validateCampaignForm(data: Record<string, unknown>): string | null {
  const result = campaignFormSchema.safeParse(data);
  if (!result.success) return result.error.issues[0]?.message || 'Validation failed';
  return null;
}
