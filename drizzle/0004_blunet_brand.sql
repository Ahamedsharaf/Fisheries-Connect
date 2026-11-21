UPDATE records
SET data = json_set(data, '$.body', replace(json_extract(data, '$.body'), 'Fisheries Connect', 'Blunet'))
WHERE type = 'article'
  AND id IN ('article-sainthamaruthu', 'article-seafood')
  AND instr(json_extract(data, '$.body'), 'Fisheries Connect') > 0;

UPDATE records
SET data = json_set(data, '$.answer', replace(json_extract(data, '$.answer'), 'Fisheries Connect', 'Blunet'))
WHERE type = 'faq'
  AND id = 'faq-3'
  AND instr(json_extract(data, '$.answer'), 'Fisheries Connect') > 0;
