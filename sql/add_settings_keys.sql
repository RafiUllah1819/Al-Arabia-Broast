-- Run this once if you already ran seed.sql before the settings module was added.
-- ON CONFLICT DO NOTHING means it will never overwrite values you've already saved.

INSERT INTO settings (key, value) VALUES
  ('restaurant_name',  'Al-Arabia Broast and Pizza Point'),
  ('address',          'Eid Gah Chowk Near Al Madina Hospital Jalala Pur PirWala'),
  ('phone',            '0329-1744074'),
  ('currency_symbol',  'Rs.'),
  ('restaurant_logo',  ''),
  ('receipt_footer',   'Thank you for dining with us!')
ON CONFLICT (key) DO NOTHING;
