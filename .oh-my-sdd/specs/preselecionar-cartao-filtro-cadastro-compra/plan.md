# Plan: Pré-selecionar cartão do filtro no cadastro de compra

## 1. Decisões Arquiteturais

O `cardId` do filtro já é lido corretamente em `src/app/(app)/purchases/page.tsx` (Server Component) e usado na query Prisma. Faltam três frentes de propagação, uma por ponto de entrada do spec, mais um ajuste de sincronização descoberto na investigação:

### 1.1 Página "Nova compra" (Req-01, Req-04, Req-06, Req-07)

- **`src/app/(app)/purchases/page.tsx:84-86`**: o link "Nova compra" passa a incluir o `cardId` do filtro quando presente:
  `href={cardId ? \`/purchases/new?cardId=${cardId}\` : "/purchases/new"}` (a variável `cardId` já existe nesse escopo, vinda de `searchParams`).
- **`src/app/(app)/purchases/new/page.tsx`**: hoje `NewPurchasePage()` não recebe parâmetros. Passa a aceitar `searchParams: Promise<{ cardId?: string }>`, ler `cardId` e validar contra a lista `cards` (mesma query já existente, `isActive: true`) — replicando a mesma validação de "cartão precisa estar ativo" que hoje só existe dentro de `NewPurchaseForm`. Se válido, chamamos esse valor de `filterCardId`; se ausente/inválido, `filterCardId` é `undefined` (cobre Req-04).
  - `defaultCardId` continua sendo passado como `filterCardId ?? user?.lastUsedCardId ?? undefined` (filtro tem prioridade — Req-01).
  - Um novo prop `returnCardId={filterCardId}` é passado para `NewPurchaseForm`, **desacoplado** de `defaultCardId`: ele não deve cair para `lastUsedCardId` — só existe quando o filtro realmente estava ativo e válido (necessário para Req-07: sem filtro, o retorno não deve ganhar um `cardId` "emprestado" do último cartão usado).
- **`src/app/(app)/purchases/new/purchase-form.tsx`**: `NewPurchaseFormProps` ganha `returnCardId?: string`. Em `onSubmit`, após sucesso, o destino do `router.push` deixa de ser fixo `"/purchases"` e passa a ser `returnCardId ? \`/purchases?cardId=${returnCardId}\` : "/purchases"`. Nenhuma outra lógica do formulário (incluindo `initialCardId`, que já usa `defaultCardId` corretamente) é alterada.

### 1.2 Lançamento rápido — FAB/Sheet (Req-02, Req-03, Req-04)

- **`src/components/quick-add-fab.tsx`**: hoje é puramente client mas só repassa props vindas do `layout.tsx` (Server Component). Passa a chamar `useSearchParams()` e `usePathname()` (mesmo padrão de `src/components/card-filter.tsx`) para ler o `cardId` do filtro **somente quando `pathname === "/purchases"`** (evita aplicar um `cardId` de outra tela por coincidência — cobre a ressalva do Req-03). Calcula um `effectiveDefaultCardId`:
  `filterCardId && cards.some(c => c.id === filterCardId) ? filterCardId : defaultCardId` (onde `defaultCardId` é o prop original vindo de `user.lastUsedCardId`, cobrindo Req-04 e o fallback do Req-03). Repassa `effectiveDefaultCardId` para `QuickAddSheet` no lugar do `defaultCardId` recebido diretamente.
- **`src/components/quick-add-sheet.tsx`**: **ajuste necessário além do spec original, descoberto na investigação de código.** O componente é montado uma única vez pelo `layout.tsx` (persiste entre navegações dentro do grupo de rotas). O valor inicial do campo `cardId` só é sincronizado com a prop `defaultCardId` no momento em que o sheet **fecha** (`handleOpenChange`, bloco `if (!nextOpen) { ... reset(defaultValues(initialCardId)); }`) — nunca quando abre. Isso significa que, na primeíra vez que o usuário abre o "Lançamento rápido" depois de navegar para `/purchases?cardId=X` (sem tê-lo aberto/fechado antes), o campo mostraria o valor antigo, não o cartão filtrado — o mesmo padrão de bug já corrigido na listagem (Story anterior), agora no `useForm`/`reset` do react-hook-form em vez de `useState`. Correção: mover a chamada `reset(defaultValues(initialCardId))` para também rodar quando o sheet **abre** (`nextOpen === true`), garantindo que o campo reflita o `initialCardId` mais recente toda vez que o usuário clica no FAB.

### 1.3 Sem mudanças

- Nenhuma alteração em `src/lib/actions/purchase-actions.ts` (Server Action `createPurchase`), no schema Prisma, nem na query de `/purchases`.
- Filtros de categoria/mês não são tocados (fora de escopo, conforme `spec.md`).

## 2. Esquema de Dados/API

- `NewPurchasePage`: nova assinatura `NewPurchasePage({ searchParams }: { searchParams: Promise<{ cardId?: string }> })`, seguindo o mesmo padrão já usado em `purchases/page.tsx`.
- `NewPurchaseFormProps`: adiciona `returnCardId?: string` (somente leitura, usado no redirecionamento pós-`createPurchase`).
- `QuickAddFabProps`: sem mudança de assinatura pública; a lógica interna passa a derivar o `defaultCardId` efetivo a partir de `useSearchParams()`/`usePathname()` combinados com o prop já existente.
- `QuickAddSheetProps`: sem mudança de assinatura; só muda quando `reset()` é chamado internamente.
- Nenhum contrato de Server Action, schema Zod ou tabela Prisma é alterado.

## 3. Bibliotecas e Dependências

- Nenhuma dependência nova. Usa apenas `useSearchParams`/`usePathname` de `next/navigation` (já usados em `card-filter.tsx`) e a API já existente de `reset()` do `react-hook-form` (já importado em `quick-add-sheet.tsx`).
- Mantém-se estritamente dentro da stack travada por `constitution.md`.

## 4. Riscos e Validação

- **Risco:** mover o `reset()` para também disparar na abertura do sheet pode limpar campos que o usuário eventualmente já tivesse preenchido antes de fechar sem salvar — mas hoje o sheet já reseta ao fechar, então não há estado "meio preenchido" preservado entre uma sessão de abertura e outra; o comportamento observável para o usuário não piora.
- **Risco:** validar `filterCardId` contra `cards` em dois lugares (`purchases/new/page.tsx` e `quick-add-fab.tsx`) duplica a checagem `cards.some(c => c.id === cardId)` já existente nos formulários — aceitável, é a mesma validação simples já usada em `initialCardId`, sem introduzir nova fonte de verdade.
- **Validação manual (sem suíte automatizada, conforme `constitution.md` seção 5):**
  1. Com filtro "Nubank" ativo em `/purchases`, clicar em "Nova compra": campo de cartão deve abrir com "Nubank" selecionado.
  2. Salvar essa compra: deve retornar para `/purchases?cardId=<id-do-nubank>` com o filtro "Nubank" ainda visível na listagem.
  3. Sem filtro ativo, repetir os passos 1-2: comportamento igual ao atual (sem `cardId` na URL de retorno, pré-seleção por `lastUsedCardId`/primeiro cartão).
  4. Desativar o cartão filtrado (ou simular um `cardId` inexistente na URL) e abrir "Nova compra": não deve quebrar, deve cair no comportamento padrão.
  5. Com filtro "Nubank" ativo em `/purchases`, abrir o "Lançamento rápido" pela primeira vez na sessão (sem tê-lo aberto antes): campo de cartão deve mostrar "Nubank" já selecionado.
  6. Salvar pelo "Lançamento rápido" com filtro ativo: usuário permanece em `/purchases` com o filtro intacto (via `router.refresh()`).
  7. Abrir o "Lançamento rápido" a partir de outra tela (ex.: `/dashboard`): comportamento inalterado (sem tentar aplicar `cardId` de filtro).
  8. Em ambos os formulários, trocar manualmente o cartão pré-selecionado antes de salvar e confirmar que a escolha manual prevalece.
  9. Rodar `npm run lint` e `tsc --noEmit`.
