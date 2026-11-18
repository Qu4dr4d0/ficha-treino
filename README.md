# ficha-treino

App de celular para anotar o **treino da academia** e a **dieta**, com progressão de carga, registro de reps por série, cronômetro de descanso e histórico.

> Nome provisório. O nome do app (hoje chamado de "Ficha") e do repositório pode mudar depois.

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

## Estado atual: protótipo 0.1

`index.html` é um protótipo interativo usado para validar o design. É uma página única que usa Preact e htm via CDN e não precisa de build.

- Tela inicial com um card de treino e um card de dieta
- Montagem modular do treino, exercício por exercício: técnica, séries, faixa de reps, nome, última carga e descanso
- Seções de aquecimento, exercícios e cardio (o cardio fica numa caixa separada)
- Registro do treino do dia: carga e reps por série, com os valores da última vez já preenchidos
- Cronômetro de descanso por exercício, que vibra e apita no fim e depois conta o tempo extra
- Indicador ↑ quando é hora de subir a carga, porque o topo da faixa foi batido em todas as séries
- Histórico por exercício, com gráfico da carga
- Legenda das técnicas, recolhida por padrão
- Tema claro, escuro ou do sistema
- Cores dos cards na paleta do Google Keep, com versões clara e escura

Limitações do protótipo:

- Os dados ficam no `localStorage` do navegador. Isso não é um armazenamento confiável.
- A dieta e o histórico de sessões que vêm de fábrica são dados de exemplo.
- O arquivo não tem `<!doctype>`, `<html>`, `<head>` nem `<body>` porque é publicado como um Artifact do Claude, que adiciona essa estrutura. Para abrir localmente com fidelidade, coloque o conteúdo dentro de um documento HTML com `<!doctype html>`.

## Próximos passos

1. Ajustar o design do protótipo até ficar bom.
2. Construir o app de verdade como **PWA**: instalável na tela inicial, funcionando offline e com histórico em IndexedDB no aparelho.
3. Depois: calcular macros e kcal da dieta, e talvez empacotar o app para a Play Store.
