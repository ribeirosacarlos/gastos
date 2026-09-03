## Tasks

- [x] 1. Criar `src/components/purchase-duplicate-modal.tsx`, espelhando a estrutura de `purchase-edit-modal.tsx` (Dialog + formulário com os mesmos campos), mas com título "Duplicar compra", sem o bloqueio de `hasPaidInstallment`, `defaultValues` copiados da compra recebida (incluindo a data original) e reaproveitando os tipos `EditablePurchase`/`EditableCardOption` já exportados por `purchase-edit-modal.tsx`.
- [x] 2. No mesmo arquivo, implementar o `onSubmit` usando `purchaseSchema`/`PurchaseInput` e chamando `createPurchase` (não `updatePurchase`), com toast de sucesso e chamada a `onSaved()` + `onOpenChange(false)`.
- [x] 3. Em `src/components/purchases-listing.tsx`, importar `useRouter` de `next/navigation` e adicionar o estado `duplicatingPurchaseId` + o `duplicatingPurchase` derivado (mesmo padrão de `editingPurchaseId`/`editingPurchase`).
- [x] 4. Em `src/components/purchases-listing.tsx`, adicionar o botão "Duplicar" ao lado de "Editar" na coluna de ações da visão em tabela.
- [x] 5. Em `src/components/purchases-listing.tsx`, adicionar o botão "Duplicar" ao lado de "Editar" na área de ações da visão em cards.
- [x] 6. Em `src/components/purchases-listing.tsx`, renderizar `<PurchaseDuplicateModal />` ao lado do `<PurchaseEditModal />` existente, fechando o estado ao `onOpenChange(false)` e chamando `router.refresh()` em `onSaved`.
- [x] 7. Rodar `npm run lint` e `tsc --noEmit` e corrigir eventuais erros/avisos introduzidos.
- [ ] 8. Validar manualmente: clicar em "Duplicar" numa compra (visão tabela) e conferir que todos os campos vêm iguais à original, incluindo a data.
- [ ] 9. Validar manualmente o mesmo fluxo na visão em cards.
- [ ] 10. Validar manualmente: salvar sem alterar nada cria uma nova compra e a original permanece intacta (mesmo valor/parcelas/status).
- [ ] 11. Validar manualmente: alterar um campo antes de salvar e confirmar que a duplicata reflete o valor alterado, não o original.
- [ ] 12. Validar manualmente: fechar o modal sem salvar não cria nenhuma compra nova.
- [ ] 13. Validar manualmente: duplicar uma compra com parcela já paga e confirmar que nenhum campo fica bloqueado.
- [ ] 14. Validar manualmente que a ação "Editar" continua funcionando normalmente, sem regressão.
