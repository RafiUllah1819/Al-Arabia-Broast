-- Add restaurant_logo and update Al-Arabia branding in settings.
-- ON CONFLICT DO UPDATE only applies to restaurant_name / address / phone
-- so existing custom values for other keys are preserved.

INSERT INTO settings (key, value) VALUES
  ('restaurant_logo', '')
ON CONFLICT (key) DO NOTHING;

-- Update the restaurant branding to Al-Arabia (only if still default values).
-- If you have already customised these, comment out the UPDATE below.
UPDATE settings SET value = 'Al-Arabia Broast and Pizza Point'
  WHERE key = 'restaurant_name' AND value = 'My Restaurant';

UPDATE settings SET value = 'Eid Gah Chowk Near Al Madina Hospital Jalala Pur PirWala'
  WHERE key = 'address' AND value IN ('', '123 Main Street, City');

UPDATE settings SET value = '0329-1744074'
  WHERE key = 'phone' AND value IN ('', '+1 234 567 890');

UPDATE settings SET value = 'Rs.'
  WHERE key = 'currency_symbol' AND value = '$';

UPDATE settings SET value = 'Thank you for dining with us!'
  WHERE key = 'receipt_footer' AND value = 'Thank you for your order!';
