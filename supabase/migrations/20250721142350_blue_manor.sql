/*
  # Add detailed information fields to law firms

  1. New Columns
    - `quick_facts` (text) - Multiline text with basic formatting for quick facts
    - `key_quotes` (text) - Multiline text with basic formatting for key quotes  
    - `insights` (text) - Multiline text with basic formatting for insights
    - `opportunities` (text) - Multiline text with basic formatting for opportunities

  2. Security
    - Maintain existing RLS policies
*/

ALTER TABLE law_firms 
ADD COLUMN IF NOT EXISTS quick_facts text DEFAULT '',
ADD COLUMN IF NOT EXISTS key_quotes text DEFAULT '',
ADD COLUMN IF NOT EXISTS insights text DEFAULT '',
ADD COLUMN IF NOT EXISTS opportunities text DEFAULT '';