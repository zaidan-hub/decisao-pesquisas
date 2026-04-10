

## Diagnóstico: Erro "duplicate key value violates unique constraint produtos_codigo_key"

### Causa raiz

A tabela `produtos` possui uma constraint `UNIQUE` na coluna `codigo`. Quando o admin tenta criar um produto com um código que já existe no banco, o banco rejeita a inserção. O sistema exibe o erro bruto do banco de dados ao invés de uma mensagem amigável.

### O que NÃO precisa mudar

A constraint UNIQUE em si faz sentido -- cada produto deve ter um código único. Portanto, não vamos removê-la.

### Correções propostas

**1. Mensagem de erro amigável (ProdutosPage.tsx)**
- No bloco `catch` da função de criação de produto, detectar o erro `produtos_codigo_key` e exibir uma mensagem clara como: *"Já existe um produto com o código 'XXX'. Por favor, use um código diferente."*

**2. Validação prévia antes de inserir**
- Antes de chamar o `insert`, fazer uma consulta rápida para verificar se já existe um produto com aquele código. Se existir, mostrar o erro antes mesmo de tentar a inserção.

### Arquivos a modificar

- `src/pages/admin/ProdutosPage.tsx` -- tratamento de erro na criação e validação prévia do código

