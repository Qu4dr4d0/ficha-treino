# Treinota

App de celular para anotar o **treino da academia** e a **dieta**, com progressão de carga, registro de reps por série, cronômetro de descanso e uma tela de progresso (calendário dos dias treinados, recordes e evolução de carga por exercício).

> O app se chama **Treinota** (treino + nota). O repositório ainda tem o nome antigo, `ficha-treino`. Os dados salvos no aparelho continuam na chave `ficha:v1`, para não perder o que já existe.

## Por que existe

Planilha de treino e dieta é ruim de abrir no celular. Copiar tudo para um app de anotações ajuda, mas lá não dá para acompanhar a progressão de carga, contar as reps de cada série nem guardar o histórico, porque o treino anterior é sempre sobrescrito. Este app mantém a notação curta de que eu já gosto e soma a ela o que faltava.

## Notação

```
[𝐟] 3x10-12 → Elevação Lateral na Polia (15kg)
(12x10x10)
```

| Parte | Significado |
|---|---|
| `[𝐟]` | Técnica avançada (aqui, feeder: 50% da carga de trabalho × 6 reps) |
| `3x10-12` | 3 séries de 10 a 12 repetições |
| `(15kg)` | Carga usada da última vez |
| `(12x10x10)` | Reps feitas em cada série com essa carga |

## Estrutura

| Caminho | O que é |
|---|---|
| `src/app.html` | Fonte única do app (HTML, CSS e JS numa página). É também o que vai para o Artifact do Claude, por isso não tem `<!doctype>`/`<head>` próprios. |
| `docs/` | O PWA pronto para publicar. É **gerado**: não edite à mão. |
| `tools/build.py` | Gera `docs/` a partir de `src/app.html`: documento completo, manifesto, service worker com versão nova e biblioteca local (offline). |
| `tools/make_icons.js` | Gera os ícones em `docs/icons` (rodar só quando o ícone mudar). |
| `tools/sw.template.js` | Modelo do service worker. |

Depois de mudar `src/app.html`:

```bash
python3 tools/build.py
```

## PWA

O app pode ser instalado no celular como um app comum: ícone na tela inicial, tela cheia e funcionamento sem internet. Para isso, `docs/` precisa ser publicado num endereço HTTPS. Duas opções:

- **GitHub Pages:** Settings → Pages → Source "Deploy from a branch" → branch `master`, pasta `/docs`. Em conta gratuita, o Pages só funciona com o repositório público.
- **Netlify ou Cloudflare Pages:** conecte o repositório (pode continuar privado), sem comando de build, com a pasta de publicação `docs`.

No Android (Chrome ou Samsung Internet): abra o endereço → menu → **Instalar app** / **Adicionar à tela inicial**.

## Estado atual: protótipo

- Tela inicial com um card de treino e um card de dieta; o nome da ficha é editável
- Montagem modular do treino, exercício por exercício: técnica, séries, faixa de reps, nome, última carga e descanso
- Seções de aquecimento, exercícios e cardio, cada uma em sua caixa
- Registro do treino do dia: carga e reps por série, com os valores da última vez já preenchidos
- Cronômetro do treino no topo e cronômetro de descanso no botão de cada exercício (vibra e apita no fim)
- Indicador ↑ quando é hora de subir a carga
- Catálogo com ~600 exercícios em 13 grupos musculares (com variações de pegada e aparelho), busca sem acento enquanto digita, aviso de nome parecido e nomes próprios que entram nas sugestões
- Legenda das técnicas, recolhida por padrão
- Tema claro, escuro ou do sistema; cores dos cards na paleta do Google Keep

Limitações:

- Os dados ficam no `localStorage` do navegador (no PWA instalado, ficam no próprio app). Ainda não há backup.
- A dieta e o histórico de sessões que vêm de fábrica são dados de exemplo.

## Próximos passos

1. Ajustar o design do protótipo até ficar bom.
2. Trocar o `localStorage` por IndexedDB e adicionar exportar/importar backup.
3. Depois: calcular macros e kcal da dieta, e talvez empacotar o app para a Play Store.

## Publicação (Cloudflare Pages)

O site publicado é a pasta `docs/`, gerada por `python3 tools/build.py`. No Cloudflare: Workers & Pages → criar projeto ligado ao GitHub → branch `main`, sem comando de build, pasta de saída `docs`. Cada push na `main` publica; outras branches ganham um link de teste. O `docs/_headers` define cache e cabeçalhos de segurança. Domínio: `treinota.com.br`.
