const { getMissingRequiredFields, isWithinRange } = require('./validators');

const VALID_CAMPAIGN_TYPES = ['flash_sale', 'discount', 'voucher', 'bundle'];
const VALID_DISCOUNT_TYPES = ['percentage', 'fixed'];

const validateCampaignPayload = (payload = {}) => {
  const missing = getMissingRequiredFields(payload, [
    'name', 'type', 'start_date', 'end_date', 'discount_type', 'discount_value',
  ]);

  if (missing.length > 0) {
    return { valid: false, message: `Missing required fields: ${missing.join(', ')}` };
  }

  if (typeof payload.name !== 'string' || payload.name.trim().length < 3) {
    return { valid: false, message: 'Campaign name must be at least 3 characters' };
  }

  if (!VALID_CAMPAIGN_TYPES.includes(payload.type)) {
    return { valid: false, message: `Invalid campaign type. Allowed: ${VALID_CAMPAIGN_TYPES.join(', ')}` };
  }

  if (!VALID_DISCOUNT_TYPES.includes(payload.discount_type)) {
    return { valid: false, message: `Invalid discount type. Allowed: ${VALID_DISCOUNT_TYPES.join(', ')}` };
  }

  const discountValue = Number(payload.discount_value);
  if (Number.isNaN(discountValue) || discountValue <= 0) {
    return { valid: false, message: 'Discount value must be a positive number' };
  }

  if (payload.discount_type === 'percentage' && !isWithinRange(discountValue, 1, 100)) {
    return { valid: false, message: 'Percentage discount must be between 1 and 100' };
  }

  const startDate = new Date(payload.start_date);
  const endDate = new Date(payload.end_date);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return { valid: false, message: 'Start date and end date must be valid dates' };
  }

  if (endDate < startDate) {
    return { valid: false, message: 'End date must be on or after start date' };
  }

  return { valid: true };
};

module.exports = { validateCampaignPayload, VALID_CAMPAIGN_TYPES, VALID_DISCOUNT_TYPES };
