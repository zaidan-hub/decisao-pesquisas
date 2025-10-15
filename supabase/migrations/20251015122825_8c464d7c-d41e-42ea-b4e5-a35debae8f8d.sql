-- Marcar produtos com "Barato" no nome como mais_barato = true
UPDATE produtos 
SET mais_barato = true 
WHERE nome ILIKE '%Barato%';