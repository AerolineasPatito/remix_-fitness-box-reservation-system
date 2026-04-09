BEGIN;

-- Reparación idempotente de mojibake común (UTF-8 mal interpretado como latin1/windows-1252).
CREATE OR REPLACE FUNCTION public.fix_mojibake_text(input_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    replace(
      replace(
        replace(
          replace(
            replace(
              replace(
                replace(
                  replace(
                    replace(
                      replace(
                        replace(
                          replace(
                            replace(
                              replace(
                                replace(
                                  replace(
                                    replace(
                                      replace(
                                        replace(
                                          replace(
                                            replace(
                                              replace(
                                                replace(
                                                  replace(
                                                    replace(input_text, 'Â¡', '¡'),
                                                    'Â¿', '¿'
                                                  ),
                                                  'Â©', '©'
                                                ),
                                                'Â·', '·'
                                              ),
                                              'Ã¡', 'á'
                                            ),
                                            'Ã©', 'é'
                                          ),
                                          'Ã­', 'í'
                                        ),
                                        'Ã³', 'ó'
                                      ),
                                      'Ãº', 'ú'
                                    ),
                                    'Ã±', 'ñ'
                                  ),
                                  'Ã‘', 'Ñ'
                                ),
                                'Ã¼', 'ü'
                              ),
                              'Ãœ', 'Ü'
                            ),
                            'Ã', 'Á'
                          ),
                          'Ã‰', 'É'
                        ),
                        'Ã', 'Í'
                      ),
                      'Ã“', 'Ó'
                    ),
                    'Ãš', 'Ú'
                  ),
                  'â€”', '—'
                ),
                'â€“', '–'
              ),
              'â€œ', '“'
            ),
            'â€', '”'
          ),
          'â€™', '’'
        ),
        'â€˜', '‘'
      ),
      'â€¢', '•'
    );
$$;

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    UPDATE public.profiles
    SET
      full_name = public.fix_mojibake_text(full_name),
      updated_at = CURRENT_TIMESTAMP
    WHERE full_name IS NOT NULL
      AND (full_name LIKE '%Ã%' OR full_name LIKE '%Â%' OR full_name LIKE '%â%');
  END IF;

  IF to_regclass('public.class_types') IS NOT NULL THEN
    UPDATE public.class_types
    SET
      description = public.fix_mojibake_text(description),
      updated_at = CURRENT_TIMESTAMP
    WHERE description IS NOT NULL
      AND (description LIKE '%Ã%' OR description LIKE '%Â%' OR description LIKE '%â%');
  END IF;

  IF to_regclass('public.whatsapp_templates') IS NOT NULL THEN
    UPDATE public.whatsapp_templates
    SET
      body = public.fix_mojibake_text(body),
      updated_at = CURRENT_TIMESTAMP
    WHERE body IS NOT NULL
      AND (body LIKE '%Ã%' OR body LIKE '%Â%' OR body LIKE '%â%');
  END IF;
END;
$$;

COMMIT;
