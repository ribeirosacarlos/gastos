## Tasks

- [x] 1. Em `src/components/purchases-listing.tsx`, adicionar um `useEffect` logo após `const [rows, setRows] = useState(purchases);` que chama `setRows(purchases)` com `[purchases]` como array de dependências, para sincronizar o estado local sempre que a prop `purchases` mudar (novo filtro aplicado pelo servidor).
- [x] 2. Rodar `npm run lint` e `tsc --noEmit` e corrigir eventuais erros/avisos introduzidos.
- [x] 3. Validar manualmente no `npm run dev`: aplicar filtro de cartão "Santander" em `/purchases` e confirmar que a tabela passa a exibir somente as compras desse cartão. (Confirmado pelo usuário: "agora filtrou certo".)
- [x] 4. Validar manualmente: trocar o filtro para outro cartão e confirmar que a listagem atualiza sem misturar dados do cartão anterior; depois remover o filtro e confirmar retorno à listagem completa.
- [x] 5. Validar manualmente: combinar o filtro de cartão com os filtros de categoria e mês (inclusive uma combinação sem nenhum resultado) e confirmar que a tabela reflete corretamente cada combinação, incluindo o estado vazio.
- [x] 6. Validar manualmente: com um filtro de cartão ativo, editar uma célula inline (ex.: categoria ou descrição) de uma compra na listagem e confirmar que a edição é salva e a lista permanece consistente com o filtro aplicado.
- [x] 7. Validar manualmente que a ordenação por coluna (data, descrição, cartão, categoria, valor) continua funcionando corretamente sobre os dados filtrados.
