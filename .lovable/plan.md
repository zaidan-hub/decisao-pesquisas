

## Expandir busca de produtos por código na tela de Cadastros

### Situação atual

| Tela | Busca por nome | Busca por código |
|------|:-:|:-:|
| Listas (hierarquia) | Sim | Sim |
| Listas (visualização) | Sim | Sim |
| Pesquisador (ProductList) | Sim | Sim |
| **Cadastros (ProdutosPage)** | **Sim** | **Não** |

### Performance

A busca é feita no cliente com `.filter()` sobre o array em memória. Adicionar `|| p.codigo.toLowerCase().includes(...)` é uma operação O(n) de comparação de strings — custo desprezível mesmo com milhares de produtos. Não há risco de lentidão.

### Alteração

**Arquivo: `src/pages/admin/ProdutosPage.tsx`** (linha 78-81)

Alterar o filtro de produtos para incluir o campo `codigo`:

```typescript
// De:
const filteredProdutos = produtos.filter(p => 
  p.nome.toLowerCase().includes(searchTerms.produtos.toLowerCase()) &&
  (!selectedSubgrupo || p.subgrupoId === selectedSubgrupo)
);

// Para:
const filteredProdutos = produtos.filter(p => {
  const term = searchTerms.produtos.toLowerCase();
  const matchesSearch = p.nome.toLowerCase().includes(term) || 
                        p.codigo.toLowerCase().includes(term);
  return matchesSearch && (!selectedSubgrupo || p.subgrupoId === selectedSubgrupo);
});
```

Essa é a única mudança necessária — uma alteração de 4 linhas em um único arquivo.

