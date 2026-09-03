# Plan: Duplicar compra na listagem

## 1. Decisões Arquiteturais

### 1.1 Novo componente `PurchaseDuplicateModal`

O padrão já existente no projeto separa formulário de criação (`NewPurchaseForm`, usa `purchaseSchema`/`createPurchase`) de formulário de edição (`PurchaseEditModalForm` dentro de `src/components/purchase-edit-modal.tsx`, usa `updatePurchaseSchema`/`updatePurchase`) — são componentes irmãos, não uma única abstração parametrizada. A duplicação segue essa mesma linha: um novo arquivo `src/components/purchase-duplicate-modal.tsx`, espelhando a estrutura de `purchase-edit-modal.tsx` (mesmo layout de campos, mesmo `Dialog`/`DialogContent`), mas com as diferenças de negócio do spec:

- **Título:** "Duplicar compra" em vez de "Editar compra".
- **`defaultValues` do `useForm`:** copiados diretamente da linha clicada (`cardId`, `description`, `totalCents`, `purchaseDate` — a mesma data original, sem trocar para hoje —, `installmentsCount`, `category`, `additionalParticipantUserIds`), igual ao que `PurchaseEditModalForm` já faz para popular o formulário de edição.
- **Sem bloqueio de `hasPaidInstallment`:** todo o bloco de aviso amarelo e os `disabled={hasPaidInstallment}` de `PurchaseEditModalForm` são omitidos — a duplicata é sempre uma compra nova, então parcela paga na compra original nunca restringe nada aqui (Req-07).
- **Validação e submit:** usa `purchaseSchema`/`PurchaseInput` (o mesmo schema de criação, não `updatePurchaseSchema`) e chama `createPurchase(parsed.data)` — nunca `updatePurchase`, e nunca referencia o `id` da compra original como alvo de mutação (Req-03).
- **Tipos reaproveitados:** importa `EditablePurchase`/`EditableCardOption` já exportados por `purchase-edit-modal.tsx`, em vez de redeclarar interfaces equivalentes.
- **Props:** `purchase: EditablePurchase | null`, `cards`, `categories`, `participantCandidates`, `onOpenChange: (open: boolean) => void`, `onSaved: () => void` (sem parâmetros — ver 1.3, o `PurchaseDuplicateModal` não faz atualização otimista local, então não precisa devolver os valores salvos).

### 1.2 Ação "Duplicar" na listagem (`src/components/purchases-listing.tsx`)

- Novo estado `const [duplicatingPurchaseId, setDuplicatingPurchaseId] = useState<string | null>(null);`, ao lado do já existente `editingPurchaseId`.
- Novo `duplicatingPurchase` derivado de `rows` com `useMemo`, no mesmo formato de `editingPurchase` (linhas 134-142 atuais) — reaproveita a mesma lógica de montar `additionalParticipantUserIds` a partir de `otherParticipants(row)`.
- Novo botão "Duplicar" (`buttonVariants({ variant: "outline", size: "sm" })`, mesmo estilo do botão "Editar" já existente) adicionado nos dois pontos onde "Editar" já aparece hoje: a coluna de ações da visão em tabela (perto da linha 326-330) e a área de ações da visão em cards (perto da linha 393-400) — mesma paridade entre as duas visões que já existe para "Editar"/excluir (Critério de aceite do spec sobre disponibilidade em ambas as visões).
- `onClick={() => setDuplicatingPurchaseId(row.id)}` abre o modal; a compra original (`editingPurchaseId`) e a duplicação (`duplicatingPurchaseId`) são estados independentes — nada impede (nem precisa impedir) que ambos existam ao mesmo tempo, já que cada modal controla sua própria visibilidade via `purchase !== null`.
- Renderiza `<PurchaseDuplicateModal />` ao lado do `<PurchaseEditModal />` já existente (fim do JSX do componente), fechando com `setDuplicatingPurchaseId(null)` quando `onOpenChange(false)`.

### 1.3 Atualização da lista após duplicar

`createPurchase` retorna apenas `{ error?: string }` (Result pattern já travado por `constitution.md` — nenhuma mudança nesse contrato de Server Action está prevista neste spec) — ou seja, não há um `id`/linha completa para inserir manualmente em `rows` como o `handleModalSaved` da edição faz. Em vez de expandir o contrato de `createPurchase` (fora de escopo), a atualização da listagem após duplicar segue o mesmo padrão já usado por `NewPurchaseForm`/`QuickAddSheet`: chamar `router.refresh()` no callback `onSaved`. Isso já funciona corretamente graças à sincronização de `rows` com a prop `purchases` corrigida na feature `filtro-banco-listagem-compras` (o `purchases-listing.tsx` precisa importar `useRouter` de `next/navigation`, hoje ausente no arquivo).

### 1.4 Sem mudanças

- Nenhuma alteração em `src/lib/actions/purchase-actions.ts`, no schema Prisma, ou nos schemas Zod (`purchaseSchema` já é o correto para este fluxo).
- Nenhuma alteração em `PurchaseEditModal`/`PurchaseEditModalForm` — a duplicação é aditiva, não reaproveita nem modifica o fluxo de edição.

## 2. Esquema de Dados/API

- Novo componente `PurchaseDuplicateModal` (`src/components/purchase-duplicate-modal.tsx`), sem novo contrato de dados — reutiliza `EditablePurchase`/`EditableCardOption` (de `purchase-edit-modal.tsx`) e `PurchaseInput`/`purchaseSchema` (de `src/lib/validation/schemas.ts`), já existentes.
- `purchases-listing.tsx`: dois novos itens de estado local (`duplicatingPurchaseId`, `duplicatingPurchase` derivado) — nenhuma prop nova no componente `PurchasesListing` em si.
- Nenhum endpoint, Server Action ou tabela Prisma nova ou alterada.

## 3. Bibliotecas e Dependências

- Nenhuma dependência nova. Usa `react-hook-form`, `Dialog`/`DialogContent` (`@/components/ui/dialog`), `sonner` (toast) e `useRouter` de `next/navigation` — todos já usados em arquivos irmãos do projeto.
- Mantém-se estritamente dentro da stack travada por `constitution.md`.

## 4. Riscos e Validação

- **Risco:** `router.refresh()` após duplicar refaz a busca no servidor, então há uma pequena janela sem feedback otimista imediato da nova linha (diferente da edição, que atualiza `rows` na hora). Aceitável — é o mesmo comportamento já existente hoje ao criar uma compra pela página "Nova compra" ou pelo "Lançamento rápido"; a duplicação segue exatamente essa mesma expectativa de UX de criação.
- **Risco:** abrir "Duplicar" e "Editar" da mesma linha ao mesmo tempo (ex.: cliques rápidos) — como são dois `Dialog`s controlados por estados independentes, o comportamento do Radix/`Dialog` de mostrar o último aberto por cima é aceitável e não quebra dado nenhum (cada formulário só grava no `onSubmit`).
- **Validação manual (sem suíte automatizada, conforme `constitution.md` seção 5):**
  1. Clicar em "Duplicar" numa compra (visão tabela) e conferir que todos os campos vêm iguais à original, incluindo a data original.
  2. Repetir na visão em cards.
  3. Salvar sem alterar nada: nova compra aparece na listagem após o refresh; compra original permanece com os mesmos valores/parcelas/status.
  4. Alterar um campo (ex.: valor) antes de salvar e confirmar que a duplicata é criada com o valor alterado, não com o original.
  5. Fechar o modal de duplicação sem salvar (botão "Cancelar" ou fora do dialog) e confirmar que nenhuma compra nova é criada.
  6. Duplicar uma compra que já tem parcela paga e confirmar que nenhum campo fica bloqueado/desabilitado.
  7. Confirmar que "Editar" continua funcionando normalmente (sem regressão) depois da mudança.
  8. Rodar `npm run lint` e `tsc --noEmit`.
