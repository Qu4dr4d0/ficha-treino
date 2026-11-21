# Supabase do Treinota

Servidor do app: login e a função que lê fichas de treino por foto com o Claude.
A chave da Anthropic fica só aqui, como segredo do projeto; o app nunca a recebe.

## Peças

- `migrations/001_importar_treino.sql`: tabela `import_usage` e função `bump_import` (limite de importações por dia, por usuário).
- `functions/importar-treino/index.ts`: Edge Function. Recebe `{ image, media_type }` (base64) ou `{ text }`, exige usuário logado, conta o uso do dia e chama o Claude Haiku 5.5 com saída estruturada. Devolve `{ plan, used, max }`.

## Montar o projeto (uma vez)

1. Criar o projeto em supabase.com (região São Paulo).
2. SQL Editor: colar e rodar `migrations/001_importar_treino.sql`.
3. Edge Functions: criar a função `importar-treino` e colar `functions/importar-treino/index.ts`.
4. Edge Functions > Secrets: `ANTHROPIC_API_KEY` com uma chave só para o servidor.
   Opcionais: `IMPORT_MAX_PER_DAY` (padrão 20) e `ALLOWED_ORIGINS` (padrão `https://qu4dr4d0.github.io`, separado por vírgula).
5. No Console da Anthropic, pôr um limite de gasto mensal.

`SUPABASE_URL` e `SUPABASE_ANON_KEY` já existem em toda Edge Function; não precisa criar.

## Custo medido

Teste com 5 fichas bem diferentes (tabela, planilha, foto de papel, post): média de US$ 0,001 por imagem, 2 a 9 segundos.
