# Plan: Divisão de compra entre múltiplos participantes

## 1. Decisões Arquiteturais

### 1.1 Modelo de dados: participantes como tabela de junção, não mais `isShared`

`Purchase.isShared` (Boolean) é removido. `Purchase.ownerUserId` passa a ser **obrigatório** (hoje é nullable e, por decisão original do projeto, ficava `NULL` justamente quando `isShared=true` — a compra compartilhada não guardava quem era o dono). Um novo modelo de junção `PurchaseParticipant` guarda **todos** os participantes de uma compra, incluindo o dono:

- Toda compra tem pelo menos 1 `PurchaseParticipant` (o dono).
- Compra "não compartilhada" (equivalente ao `isShared=false` de hoje) = exatamente 1 participante (o dono).
- Compra "compartilhada" (equivalente ao `isShared=true` de hoje, agora generalizado) = 2+ participantes.
- "Compartilhada" deixa de ser um campo armazenado — é derivado (`participants.length > 1`) sempre que a UI precisar dessa informação binária (ex.: badge "Compartilhada" na listagem).

Isso resolve o Req-01/05/06/07/10 do spec com uma única fonte de verdade (a lista de participantes), em vez de reintroduzir um segundo booleano paralelo.

### 1.2 Escopo do "gerenciamento de participantes": novo módulo, não expansão do `User`/auth existente

Criação de participante (Req-02/03/04) é uma Server Action nova (`createParticipant`), não uma alteração do fluxo de signup/login (que não existe hoje como fluxo próprio — usuários são criados hoje só via seed). Ela reaproveita `User` + `bcryptjs`, mas vive num arquivo de actions dedicado (`src/lib/actions/participant-actions.ts`), separado de `purchase-actions.ts`, pois é uma responsabilidade distinta (gestão de usuário, não de compra) que outras features futuras (ex.: se `FixedExpense` um dia generalizar também) poderão reaproveitar.

### 1.3 Decisão de fronteira: `getOtherUser()` **não é tocado**

`getOtherUser()` (`src/lib/auth.ts`) é usado hoje tanto pelas telas de compra quanto pelas de gasto fixo (`fixed-expenses/*`). Como o spec explicitamente deixa `FixedExpense` fora de escopo (continua no modelo binário atual), esta feature **não** generaliza `getOtherUser()` — ele continua exatamente como está (`findFirst` pegando "alguém além de mim"), usado só pelas telas de gasto fixo. Uma função nova, `listParticipantCandidates(userId)`, é adicionada em `src/lib/auth.ts` especificamente para os fluxos de compra, retornando **todos** os demais usuários (não só um).

Isso evita que esta feature precise tocar `fixed-expenses/*` (fora de escopo) só porque compartilha uma função utilitária com `purchases/*`.

### 1.4 Divisão de valor: generaliza `splitValue`, remove `userShareCents`

`userShareCents(valueCents, isShared)` é substituído por uma nova função em `src/lib/money.ts`:

```
splitAmongParticipants(totalCents: number, orderedUserIds: string[]): Record<string, number>
```

Implementação por cima do `splitValue(totalCents, orderedUserIds.length)` já existente (mesma lógica de resto distribuído nas primeiras posições, sem perda de centavos — Req-05). A ordem do array importa: **o dono deve sempre ser o primeiro elemento**, garantindo que ele absorva o(s) centavo(s) de resto de forma determinística (em vez de depender de ordenação do banco). Todo call site monta o array como `[ownerUserId, ...otherParticipantIds]`.

### 1.5 Migração de dados (SQLite)

O schema atual permite `Purchase.ownerUserId = NULL` quando compartilhada — não há coluna que hoje identifique o dono nesse caso. O dono real é sempre recuperável via `Card.ownerUserId` (toda compra pertence a um cartão, e a action de criação já garante `card.ownerUserId === quem criou`). A migration Prisma precisa, nesta ordem:

1. Criar a tabela `PurchaseParticipant` (nova).
2. Backfill via SQL: para cada `Purchase`, resolver o dono real como `COALESCE(Purchase.ownerUserId, Card.ownerUserId)` (join por `cardId`) e gravar em `Purchase.ownerUserId`.
3. Backfill de `PurchaseParticipant`: inserir 1 linha (purchaseId, ownerUserId) para toda compra; para as que tinham `isShared=true`, inserir também 1 linha por usuário existente diferente do dono (reproduz o comportamento atual de "compartilhada = todo mundo vê", já que hoje só há 2 usuários).
4. Alterar `Purchase.ownerUserId` para `NOT NULL`.
5. Remover a coluna `Purchase.isShared`.

Esse é um `migration.sql` com SQL cru dentro da migration gerada pelo Prisma (`prisma migrate dev --create-only` + edição manual), não uma migration puramente declarativa — necessário porque envolve transformação de dados existentes, não só shape.

## 2. Esquema de Dados / Contratos de Action

### 2.1 `prisma/schema.prisma`

```
model Purchase {
  ...
  ownerUserId String        // antes: String?
  owner       User          @relation("PurchaseOwner", fields: [ownerUserId], references: [id])
  // isShared removido
  participants PurchaseParticipant[]
  ...
}

model PurchaseParticipant {
  id         String   @id @default(cuid())
  purchaseId String
  purchase   Purchase @relation(fields: [purchaseId], references: [id])
  userId     String
  user       User     @relation("PurchaseParticipant", fields: [userId], references: [id])

  @@unique([purchaseId, userId])
}
```

`User` ganha a relação inversa `purchaseParticipations PurchaseParticipant[] @relation("PurchaseParticipant")`.

### 2.2 Validação (`src/lib/validation/schemas.ts`)

- `purchaseSchema`/`updatePurchaseSchema`: campo `isShared: z.coerce.boolean()` é substituído por `additionalParticipantUserIds: z.array(z.string().min(1)).default([])` (lista de IDs de usuários **além** do dono — o dono é sempre implícito, nunca aparece nessa lista).
- Novo `createParticipantSchema = z.object({ name: z.string().trim().min(1, "Informe o nome do participante") })`.

### 2.3 Server Actions

**`src/lib/actions/purchase-actions.ts`** (`createPurchase`, `updatePurchase`):
- Validam que todo id em `additionalParticipantUserIds` corresponde a um `User` existente (mesmo padrão de validação já usado para `cardId`/`category`) e que **não** contém o próprio `user.userId` (Req-10 no lado de input — o dono nunca é "adicional").
- Dentro da mesma `$transaction` que já existe: gravam `ownerUserId: user.userId` (sempre) e substituem as linhas de `PurchaseParticipant` (em update: delete + createMany; em create: só createMany) para `[user.userId, ...additionalParticipantUserIds]`.
- `toggleInstallmentPaid`, `updatePurchase`, `deletePurchase`: a checagem de visibilidade `purchase.isShared || purchase.ownerUserId === user.userId` vira uma checagem contra `participants` (via `include: { participants: true }` na query já existente, checando `.some(p => p.userId === user.userId)`).

**`src/lib/actions/participant-actions.ts`** (novo arquivo):
- `createParticipant(input: { name: string })`: `requireUser()` → valida com `createParticipantSchema` → gera `username` (normaliza nome: minúsculo, remove acentos via `normalize("NFD")`, remove tudo que não for `[a-z0-9]`) → resolve colisão com sufixo numérico incremental checando `db.user.findUnique({ where: { username } })` em loop → `bcrypt.hash(`${username}123`, <mesmo cost factor usado hoje na criação de usuário>)` → `db.user.create(...)` → retorna `{ id, name, username }`.

**`src/lib/auth.ts`**:
- Nova função `listParticipantCandidates(userId: string): Promise<{ id: string; name: string }[]>` — `db.user.findMany({ where: { id: { not: userId } }, select: { id: true, name: true }, orderBy: { name: "asc" } })`. `getOtherUser()` permanece intocado (uso exclusivo de `fixed-expenses/*`, fora de escopo).

**`src/lib/actions/dashboard-actions.ts`** (`getMonthlyTimeline`):
- Query de `purchaseInstallment` troca `OR: [{ ownerUserId }, { isShared: true }]` por `purchase: { participants: { some: { userId: user.userId } } }`, e passa a incluir `purchase: { include: { card: true, participants: true } }`.
- Cálculo de "minha parte" troca `userShareCents(pi.valueCents, pi.purchase.isShared)` por `splitAmongParticipants(pi.valueCents, [pi.purchase.ownerUserId, ...outros participantes])[user.userId]`.
- Query de `fixedExpenseInstallment` (linha equivalente) **não muda** — `FixedExpense` continua fora de escopo.

### 2.4 UI — componente compartilhado de participantes

Cinco componentes hoje reimplementam o mesmo checkbox `isShared` + texto "Compartilhando com: {otherUserName}" sobre o mesmo `purchaseSchema`/`PurchaseInput`: `purchase-form.tsx` (criar), `edit-purchase-form.tsx` (editar página cheia), `purchase-edit-modal.tsx` (editar modal), `quick-add-sheet.tsx` (lançamento rápido) e `simulate-form.tsx` (simulação). Em vez de repetir a lógica de seleção múltipla + criação inline 5 vezes, criar um único componente client `src/components/participant-picker.tsx`:

- Props: `candidates: { id: string; name: string }[]` (retorno de `listParticipantCandidates`), `value: string[]` (IDs selecionados = `additionalParticipantUserIds`), `onChange`, e um callback `onCreated(newCandidate)` para inserir na lista local o participante recém-criado por `createParticipant` (evita re-fetch da página inteira).
- UI: combobox com busca (mesmo padrão visual de `category-combobox.tsx`) + seleção múltipla (chips/badges reutilizando `user-badge.tsx` para cada participante já selecionado) + linha final "Criar participante '{texto digitado}'" quando a busca não bate com nenhum candidato.
- Cada um dos 5 formulários troca o bloco do checkbox `isShared` por `<Controller name="additionalParticipantUserIds" ... render={... <ParticipantPicker .../>} />`, e a prop `otherUserName` (recebida via `page.tsx`/`layout.tsx`) vira `participantCandidates` (lista completa em vez de 1 nome).

### 2.5 Páginas / data fetching

- `src/app/(app)/layout.tsx`: troca `getOtherUser(session.userId)` por `listParticipantCandidates(session.userId)`, repassando `participantCandidates` até `QuickAddFab` → `QuickAddSheet`.
- `purchases/page.tsx`: query de listagem troca o `OR` por `participants: { some: { userId: user.userId } }`, com `include: { participants: { include: { user: { select: { id: true, name: true } } } } }`; busca `listParticipantCandidates` em vez de `getOtherUser`; `PurchaseRow` (em `purchases-listing.tsx`) troca `isShared: boolean` por `participants: { id: string; name: string }[]`.
- `purchases/new/page.tsx`, `purchases/[id]/page.tsx`, `purchases/[id]/edit/page.tsx`, `simulate/page.tsx`: mesma troca de `getOtherUser` → `listParticipantCandidates`.
- `purchases-listing.tsx` / `purchase-edit-modal.tsx`: badge "Compartilhada com {otherUserName}" vira lista de nomes dos participantes (excluindo o próprio dono, ou mostrando todos — a exibir como "Dividida com: X, Y").
- `purchases/[id]/page.tsx` (detalhe): mesma troca, exibindo a lista completa de participantes da compra (Req-08).

## 3. Bibliotecas e Dependências

Nenhuma dependência nova. Tudo reaproveita o que já está travado na constitution: `bcryptjs` (hash da senha do participante), `zod` (validação), `@prisma/client`/migration SQL cru (já é prática aceita no projeto — ver comentários de "Codigo antigo" em migrations anteriores mencionados no schema), `react-hook-form`/`Controller` (novo campo `additionalParticipantUserIds` no form), padrão visual já usado em `category-combobox.tsx` para o novo `participant-picker.tsx`.
