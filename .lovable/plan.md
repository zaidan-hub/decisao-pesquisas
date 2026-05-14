## Novo tipo de relatório: "Personalizado"

### Visão geral

Adicionar um novo tipo de exportação na aba **Relatórios** chamado "Personalizado". Ele abre um fluxo em modal de duas etapas (lista → criação/edição) com reordenação livre de hierarquia e renomeio de grupos/subgrupos/departamentos por relatório.

---

### 1. Banco de dados

Criar nova tabela `relatorios_personalizados`:

- `id` (uuid, PK)
- `nome` (text) — nome do relatório
- `produtos` (text[]) — IDs dos produtos selecionados, na ordem
- `hierarquia_customizada` (jsonb) — `{ departamentos: {id: nome}, grupos: {id: nome}, subgrupos: {id: nome}, ordem: { departamentos: [...], grupos: { [depId]: [...] }, subgrupos: { [grupoId]: [...] }, produtos: { [subgrupoId]: [...] } }, reassignments: { grupos: { [grupoId]: novoDepartamentoId }, subgrupos: { [subgrupoId]: novoGrupoId } } }`
- `created_at`, `updated_at`

RLS: somente admins (mesmo padrão de `listas`).

---

### 2. Hook

`src/hooks/useRelatoriosPersonalizados.ts` — CRUD análogo a `useListas`.

---

### 3. Modal multi-etapa

Novo componente `src/components/admin/RelatorioPersonalizadoModal.tsx`:

**Etapa A — Lista**
- Lista de relatórios personalizados (checkboxes para multi-seleção)
- Cada item: nome, botões editar / deletar
- Botão "Criar novo relatório personalizado" no topo
- Botão "Gerar relatório" no rodapé direito (habilitado se ≥1 selecionado)

**Etapa B — Criação/Edição**
- Breadcrumb "← Voltar" no topo
- Campo "Nome do Relatório"
- Painel de seleção de produtos (reaproveitar lógica de `ListasPage` para escolher produtos com hierarquia)
- Painel de hierarquia customizada com:
  - Reordenação (↑/↓) de departamentos, grupos, subgrupos e produtos
  - **Mover entre pais**: grupo pode mudar de departamento; subgrupo pode mudar de grupo (popover/select com lista de destinos)
  - Renomear inline departamentos/grupos/subgrupos (não produtos)
- Botão "Salvar"

---

### 4. Integração na aba Relatórios

Em `src/pages/admin/RelatoriosPage.tsx`, adicionar botão/card "Personalizado" junto aos demais tipos. Ao clicar abre o `RelatorioPersonalizadoModal`.

---

### 5. Geração do PDF

Em `src/lib/reportGenerator.ts`, criar função `generateRelatorioPersonalizadoPDF(relatorio, coletas, dadosAuxiliares)`:

- Mesmo cabeçalho do relatório padrão
- Aplica `hierarquia_customizada` (reassignments + nomes renomeados + ordem) ao montar a árvore
- Tabela de produtos x supermercados com símbolos +/- (mesma lógica já corrigida)

Se múltiplos relatórios selecionados → gerar 1 PDF por relatório (downloads separados) ou um único PDF concatenado por `addPage`. **Decisão:** arquivos separados, conforme pedido ("separados caso seja mais de um selecionado").

A geração precisa de coletas — usar as mesmas coletas atualmente filtradas/disponíveis na aba Relatórios (mesmo critério dos outros exports da página).

---

### Arquivos a criar/modificar

**Novos:**
- `src/components/admin/RelatorioPersonalizadoModal.tsx`
- `src/components/admin/RelatorioPersonalizadoEditor.tsx` (etapa B)
- `src/hooks/useRelatoriosPersonalizados.ts`

**Modificados:**
- `src/pages/admin/RelatoriosPage.tsx` — botão "Personalizado" + abrir modal
- `src/lib/reportGenerator.ts` — `generateRelatorioPersonalizadoPDF`
- `src/types/index.ts` — tipo `RelatorioPersonalizado`

**Migration:** criar tabela `relatorios_personalizados` com RLS admin-only.

---

### Pontos de confirmação

1. Para a etapa B, devo reaproveitar **exatamente** o seletor de produtos do modal de Listas (com a mesma UX de checkboxes em cascata) e adicionar por cima as ações de mover/renomear?
2. Ao gerar múltiplos PDFs, baixo os arquivos separadamente (1 download por relatório) — ok?
3. Os dados (coletas) usados na geração devem vir do mesmo filtro/seleção já existente na aba Relatórios (intervalo de datas / coletas atuais)? Ou o usuário escolhe coletas dentro do próprio modal personalizado?