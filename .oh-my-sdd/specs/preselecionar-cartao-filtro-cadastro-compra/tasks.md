## Tasks

- [x] 1. Em `src/app/(app)/purchases/page.tsx`, alterar o link "Nova compra" para incluir `?cardId=<id>` quando houver um filtro de cartão ativo na URL atual.
- [x] 2. Em `src/app/(app)/purchases/new/page.tsx`, aceitar `searchParams` (`{ cardId?: string }`), validar o `cardId` recebido contra os cartões ativos já carregados e derivar `filterCardId` (válido) ou `undefined` (ausente/inválido).
- [x] 3. Em `src/app/(app)/purchases/new/page.tsx`, passar `defaultCardId={filterCardId ?? user?.lastUsedCardId ?? undefined}` e um novo prop `returnCardId={filterCardId}` para `NewPurchaseForm`.
- [x] 4. Em `src/app/(app)/purchases/new/purchase-form.tsx`, adicionar `returnCardId?: string` a `NewPurchaseFormProps` e usá-lo para montar o destino do `router.push` após salvar (`/purchases?cardId=<returnCardId>` quando presente, `/purchases` caso contrário).
- [x] 5. Em `src/components/quick-add-fab.tsx`, ler `cardId` da URL atual (via `useSearchParams`/`usePathname`, só quando `pathname === "/purchases"`), validar contra `cards`, e calcular o `defaultCardId` efetivo repassado a `QuickAddSheet` com prioridade sobre o `defaultCardId` recebido do layout.
- [x] 6. Em `src/components/quick-add-sheet.tsx`, ajustar `handleOpenChange` para também chamar `reset(defaultValues(initialCardId))` quando o sheet abre (não só quando fecha), garantindo que o campo de cartão reflita o filtro mais recente na primeira abertura.
- [x] 7. Rodar `npm run lint` e `tsc --noEmit` e corrigir eventuais erros/avisos introduzidos.
- [ ] 8. Validar manualmente: com filtro "Nubank" ativo em `/purchases`, clicar em "Nova compra" e confirmar que o campo de cartão já vem selecionado com "Nubank".
- [ ] 9. Validar manualmente: salvar essa compra e confirmar retorno para `/purchases` com o filtro "Nubank" ainda aplicado na URL e na listagem.
- [ ] 10. Validar manualmente: sem filtro ativo, repetir os passos 8-9 e confirmar que o comportamento permanece igual ao atual (sem `cardId` na URL de retorno).
- [ ] 11. Validar manualmente: com um `cardId` de filtro inválido/inexistente na URL, abrir "Nova compra" e confirmar que não quebra e cai no comportamento padrão de pré-seleção.
- [ ] 12. Validar manualmente: com filtro "Nubank" ativo, abrir o "Lançamento rápido" pela primeira vez na sessão (sem tê-lo aberto antes) e confirmar que o campo de cartão já vem selecionado com "Nubank".
- [ ] 13. Validar manualmente: salvar pelo "Lançamento rápido" com filtro ativo e confirmar que o usuário permanece em `/purchases` com o filtro intacto.
- [ ] 14. Validar manualmente: abrir o "Lançamento rápido" a partir de outra tela (ex.: dashboard) e confirmar que o comportamento de pré-seleção permanece inalterado.
- [ ] 15. Validar manualmente que, em ambos os formulários, o usuário consegue trocar manualmente o cartão pré-selecionado antes de salvar.
