# Spec: Duplicar compra na listagem

## 1. Intenção e Visão Geral

Na listagem de compras (`/purchases`), cada linha já expõe as ações "Editar" (abre um modal de edição) e excluir. O objetivo desta feature é adicionar uma nova ação, "Duplicar", que permita ao usuário criar rapidamente uma nova compra a partir de uma já existente, sem precisar preencher tudo de novo do zero.

Ao clicar em "Duplicar" em uma linha, abre-se um modal de criação de compra com todos os campos já preenchidos com os mesmos valores da compra clicada (cartão, descrição, categoria, valor, data, número de parcelas e participantes). O usuário pode ajustar qualquer campo antes de salvar — a duplicação é apenas um atalho de preenchimento, não uma cópia automática sem revisão. Ao salvar, uma compra **nova e independente** é criada; a compra original não é alterada de forma alguma.

A data pré-preenchida deve ser exatamente a mesma data da compra original (mesmo que seja uma data passada) — o usuário decide se quer trocá-la antes de salvar.

## 2. Requisitos Funcionais (Padrão EARS/GEARS)

- **[Req-01]** **When** o usuário clica em "Duplicar" em uma linha da listagem de compras, o sistema **shall** abrir um modal de criação de nova compra com os campos cartão, descrição, categoria, valor, data e número de parcelas pré-preenchidos com os valores exatos da compra clicada.
- **[Req-02]** **When** o modal de duplicação é aberto, o sistema **shall** pré-preencher também os participantes adicionais da divisão (além do dono da compra) com os mesmos participantes da compra original.
- **[Req-03]** **When** o usuário salva o formulário de duplicação sem alterar nenhum campo, o sistema **shall** criar uma nova compra independente com esses mesmos valores, sem modificar a compra original de nenhuma forma (nem seus valores, nem suas parcelas, nem seu status).
- **[Req-04]** **When** o campo de data é pré-preenchido pela duplicação, o sistema **shall** usar exatamente a mesma data da compra original, mesmo que seja uma data passada — não a data de hoje.
- **[Req-05]** **When** o modal de duplicação está aberto, o sistema **shall** permitir que o usuário altere livremente qualquer campo (cartão, descrição, categoria, valor, data, parcelas, participantes) antes de salvar, com o mesmo comportamento de validação já existente para criação de compra.
- **[Req-06]** **If** o usuário fecha o modal de duplicação sem salvar, o sistema **shall** descartar os dados preenchidos, sem criar nenhuma compra e sem alterar a compra original.
- **[Req-07]** **While** a compra original tiver parcelas já pagas, o sistema **shall** permitir a duplicação normalmente (a restrição de edição de valor/parcelas/data em compras com parcela paga se aplica apenas à edição da compra original, nunca à criação da nova compra duplicada).

## 3. Critérios de Aceite

- [ ] Clicar em "Duplicar" em uma compra abre um modal de criação com cartão, descrição, categoria, valor, data, parcelas e participantes idênticos à compra clicada.
- [ ] A data pré-preenchida é a mesma data da compra original, mesmo que seja uma data no passado.
- [ ] Salvar o modal de duplicação sem alterar nada cria uma nova compra com os mesmos dados; a compra original permanece inalterada (mesmo valor, mesmas parcelas, mesmo status de pagamento).
- [ ] É possível alterar qualquer campo (ex.: valor, data, cartão) antes de salvar a duplicata.
- [ ] Fechar o modal sem salvar não cria nenhuma compra nem altera a original.
- [ ] Duplicar uma compra que já tem parcela paga funciona normalmente, sem bloqueio.
- [ ] A ação "Duplicar" está disponível tanto na visão em tabela quanto na visão em cards da listagem (mesmos pontos onde "Editar" e excluir já aparecem hoje).
- [ ] `npm run lint` e `tsc --noEmit` passam sem erros.

## 4. Requisitos Não-Funcionais e Contratos

- **Origem dos dados:** os valores pré-preenchidos vêm exclusivamente dos dados já carregados na listagem para aquela linha (`PurchaseRow`) — nenhuma nova consulta ao banco é necessária para abrir o modal de duplicação.
- **Criação, não edição:** a duplicação deve reutilizar a Server Action de criação já existente (`createPurchase`), nunca `updatePurchase` — a compra original nunca deve ser passada como alvo de mutação nesse fluxo.
- **Validação:** o formulário de duplicação segue as mesmas regras de validação (Zod) já aplicadas à criação normal de compra — nenhuma regra de negócio nova é introduzida.
- **Autorização:** a ação "Duplicar" só deve estar disponível para compras que o usuário já pode ver na listagem (mesma regra de visibilidade/propriedade hoje aplicada às ações "Editar"/excluir) — não deve expor a ação para dados fora do escopo do usuário.
- **Stack:** a implementação deve usar exclusivamente os padrões já definidos em `constitution.md` (Next.js 16 App Router, React 19, TypeScript strict, Zod) — sem novas dependências externas.
