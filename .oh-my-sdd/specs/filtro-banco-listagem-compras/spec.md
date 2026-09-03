# Spec: Correção do filtro por cartão/banco na listagem de compras

## 1. Intenção e Visão Geral

Na tela de listagem de compras (`/purchases`), o usuário pode filtrar as compras exibidas por cartão (ex.: "Santander"). Ao selecionar um cartão no filtro, a URL é atualizada corretamente com `?cardId=...` e o servidor já busca no banco somente as compras daquele cartão — porém a tabela exibida na tela **continua mostrando todas as compras**, como se o filtro não tivesse tido efeito nenhum.

A causa raiz identificada é que o componente cliente responsável por renderizar a lista (`PurchasesListing`) guarda as compras recebidas via prop em um estado local (`useState`) inicializado apenas uma vez, na primeira renderização. Quando o usuário troca o filtro, o Next.js navega para uma nova URL e o servidor devolve uma nova prop `purchases` já filtrada — mas esse componente não é remontado nem sincroniza seu estado interno com a nova prop, então a UI continua renderizando os dados antigos (não filtrados).

O objetivo desta correção é garantir que, sempre que os dados filtrados mudarem no servidor (por troca de cartão, categoria ou mês), a listagem exibida na tela reflita exatamente esses dados — sem exigir reload manual da página.

## 2. Requisitos Funcionais (Padrão EARS/GEARS)

- **[Req-01]** **When** o usuário seleciona um cartão no filtro da listagem de compras, o sistema **shall** atualizar a tabela exibida para mostrar somente as compras associadas àquele cartão.
- **[Req-02]** **When** o usuário limpa o filtro de cartão (seleciona a opção "todos"), o sistema **shall** atualizar a tabela exibida para voltar a mostrar todas as compras visíveis ao usuário (respeitando os demais filtros ativos, se houver).
- **[Req-03]** **When** o servidor retorna uma nova lista de compras filtrada (por cartão, categoria ou mês) para o componente de listagem, o sistema **shall** sincronizar o estado local de renderização com essa nova lista, sem depender de reload manual da página ou de remontagem acidental do componente.
- **[Req-04]** **While** o usuário estiver editando uma compra inline (ex.: descrição, categoria) na listagem, o sistema **shall** preservar esse comportamento de edição inline após a correção da sincronização de dados — a correção não deve regressar a funcionalidade de edição existente.
- **[Req-05]** **If** a combinação de filtros ativos (cartão + categoria + mês) não corresponder a nenhuma compra, o sistema **shall** exibir a listagem vazia correspondente (sem mostrar dados de um filtro anterior).

## 3. Critérios de Aceite

- [ ] Ao filtrar por um cartão específico (ex.: cartão do Santander) na listagem de compras, somente as compras desse cartão aparecem na tabela, imediatamente após a seleção.
- [ ] Ao trocar de um filtro de cartão para outro (ex.: de "Santander" para "Nubank"), a tabela atualiza para refletir o novo cartão selecionado, sem misturar dados do filtro anterior.
- [ ] Ao remover o filtro de cartão, a listagem volta a mostrar todas as compras (respeitando outros filtros ativos, como categoria/mês).
- [ ] Combinar o filtro de cartão com os filtros existentes de categoria e mês continua funcionando corretamente após a correção.
- [ ] A edição inline de campos da compra (categoria, descrição, participantes etc.) na listagem continua funcionando normalmente após a correção.
- [ ] A ordenação da tabela (por coluna) continua funcionando normalmente sobre os dados filtrados.
- [ ] `npm run lint` e `tsc --noEmit` passam sem erros.

## 4. Requisitos Não-Funcionais e Contratos

- **Escopo da correção:** o bug está isolado no componente cliente `src/components/purchases-listing.tsx`, especificamente na forma como o estado local de linhas (`rows`) é inicializado a partir da prop `purchases`. A query Prisma em `src/app/(app)/purchases/page.tsx` já aplica o filtro `cardId` corretamente e **não deve ser alterada** na lógica de `where`.
- **Compatibilidade:** a solução não deve introduzir busca client-side adicional (fetch/Server Action extra) para re-obter as compras — os dados filtrados já chegam corretamente via Server Component; o problema é exclusivamente de sincronização de estado no client.
- **Stack:** a correção deve usar exclusivamente os padrões já definidos em `constitution.md` (Next.js 16 App Router, React 19, TypeScript strict) — sem novas dependências externas.
- **Sem regressão de UX:** estados locais de UI não relacionados aos dados da listagem (ex.: ordenação selecionada, linha em edição) devem continuar se comportando de forma previsível após a correção.
