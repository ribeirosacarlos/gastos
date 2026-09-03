# Plan: Correção do filtro por cartão/banco na listagem de compras

## 1. Decisões Arquiteturais

- **Diagnóstico confirmado no código atual:**
  - `src/app/(app)/purchases/page.tsx` é um Server Component que lê `searchParams` (`cardId`, `category`, `month`) e executa `db.purchase.findMany({ where: { ...(cardId ? { cardId } : {}), ... } })` — o filtro já é aplicado corretamente no banco a cada navegação.
  - `src/components/purchases-listing.tsx:89` inicializa o estado local com `const [rows, setRows] = useState(purchases)`. Como o componente não é remontado entre navegações de filtro (mesma posição na árvore, sem `key`), esse `useState` não reexecuta quando a prop `purchases` muda — `rows` permanece com o valor da primeira renderização.
  - `rows` é a única fonte usada por `displayRows`/`sortedRows`/`totalCents` (linhas 103-127), então toda a UI renderiza dados desatualizados após trocar o filtro.
  - `setRows` também é usado em dois pontos (linhas 149 e 192) para atualização otimista após edição inline (via `updatePurchase`, Server Action). A correção não pode remover esse uso.

- **Abordagem escolhida:** sincronizar `rows` com a prop `purchases` via `useEffect` com `[purchases]` como dependência, em vez de remontar o componente com `key`.
  - **Por quê não usar `key={cardId+category+month}` no componente pai:** forçaria remount completo a cada troca de filtro, resetando também `view` (tabela/cards), `sortKey`/`sortDir` e qualquer edição em andamento (`editingCell`/`editingPurchaseId`) — comportamento não pedido pelo spec e que regride UX hoje existente (Req-04).
  - **Por quê `useEffect` é seguro para o fluxo de edição inline existente:** `purchases` (a prop) só muda quando o servidor re-renderiza a página (troca de filtro via `router.push`, ou `revalidatePath` após uma Server Action de edição). Nos dois casos, o valor mais atualizado é o que deve prevalecer — inclusive após uma edição inline bem-sucedida, o `useEffect` vai simplesmente confirmar `rows` com os dados já persistidos, o que é o comportamento correto (fecha o ciclo otimista → real sem reintroduzir dados desatualizados).

- **Mudança pontual:** em `src/components/purchases-listing.tsx`, logo após a declaração de `const [rows, setRows] = useState(purchases);`, sincronizar `rows` com a prop durante a renderização (em vez de `useEffect`), seguindo o padrão de "ajustar estado a partir de uma mudança de prop" do React:
  ```
  const [prevPurchases, setPrevPurchases] = useState(purchases);
  if (purchases !== prevPurchases) {
    setPrevPurchases(purchases);
    setRows(purchases);
  }
  ```
  **Ajuste em relação à versão original do plano:** a primeira tentativa usou `useEffect(() => setRows(purchases), [purchases])`, mas a regra `react-hooks/set-state-in-effect` do ESLint do projeto bloqueia `setState` síncrono dentro de efeito (gera passe de renderização em cascata). O padrão acima é a alternativa recomendada pela documentação do React para o mesmo objetivo, sem violar essa regra. Nenhuma outra lógica de estado (`view`, `sortKey`, `sortDir`, `editingCell`, `editingPurchaseId`) é alterada.

- **Nenhuma mudança no Server Component** (`src/app/(app)/purchases/page.tsx`): a query Prisma e o `where` já estão corretos conforme o spec (Req-01/02/03/05 dependem apenas da sincronização client-side).

## 2. Esquema de Dados/API

- Nenhum contrato de dados, endpoint, Server Action ou schema Prisma é alterado por esta correção.
- `PurchaseRow` (interface já existente em `purchases-listing.tsx:22-33`) permanece inalterada.
- O fluxo de dados passa a ser: `searchParams` (URL) → Server Component (`purchases/page.tsx`, query já filtrada) → prop `purchases` → `useEffect` sincroniza `rows` no client → `displayRows`/`sortedRows` (já existentes, sem alteração de lógica).

## 3. Bibliotecas e Dependências

- Nenhuma dependência nova. A correção usa apenas `useEffect`, já importado no arquivo (`src/components/purchases-listing.tsx:3`).
- Mantém-se estritamente dentro da stack travada por `constitution.md` (Next.js 16 App Router, React 19, TypeScript strict).

## 4. Riscos e Validação

- **Risco de loop de re-render:** `useEffect(() => setRows(purchases), [purchases])` só re-executa quando a *referência* de `purchases` muda; como o Server Component gera um novo array a cada render do RSC (troca de filtro ou `revalidatePath`), e `setRows` não dispara novo render do Server Component, não há risco de loop infinito.
- **Validação manual (sem suíte automatizada, conforme `constitution.md` seção 5):**
  1. Rodar `npm run dev`, abrir `/purchases`, aplicar filtro de cartão "Santander" e confirmar que somente as compras desse cartão aparecem.
  2. Trocar para outro cartão e confirmar atualização sem misturar dados do filtro anterior.
  3. Remover o filtro e confirmar retorno à listagem completa (respeitando categoria/mês se ativos).
  4. Editar uma célula inline (ex.: categoria) com filtro ativo e confirmar que a edição persiste e a lista continua correta.
  5. Testar combinação de filtro de cartão + categoria + mês sem resultados e confirmar que a tabela mostra vazio (não dados de um filtro anterior).
  6. Rodar `npm run lint` e `tsc --noEmit`.
