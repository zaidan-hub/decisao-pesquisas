

## Bug: desalinhamento entre cabeçalho de supermercado e valores no PDF

### Causa raiz

Em `src/lib/reportGenerator.ts` (linhas 274-290), as colunas de preço têm:

- **Corpo (valores)**: `halign: 'right'` — valores ficam grudados na borda direita da célula
- **Cabeçalho (nome do supermercado)**: sem alinhamento explícito → usa o padrão do `headStyles`, que é centralizado

Resultado: "MartRI" aparece no centro da coluna, mas "R$ 16,80" aparece na ponta direita — visualmente desalinhados, como mostra a imagem.

### Solução

Forçar o mesmo alinhamento (`right`) tanto no cabeçalho quanto no corpo das colunas de preço. Assim o nome do supermercado e os valores ficam todos encostados à direita, perfeitamente alinhados em coluna.

Alteração em `src/lib/reportGenerator.ts`, dentro do loop que define `columnStyles` para as colunas de preço (linha 280-282):

```ts
for (let i = 3; i < headers.length; i++) {
  columnStyles[i] = { halign: 'right' };
}
```

passa a ser:

```ts
for (let i = 3; i < headers.length; i++) {
  columnStyles[i] = { halign: 'right', valign: 'middle' };
}
// E adicionar no autoTable:
headStyles: { fillColor: [66, 66, 66], halign: 'right' }
```

Porém isso afetaria também as colunas Código/Produto/Qntd no cabeçalho. A solução correta é usar `head` como objeto por coluna com estilos individuais, OU sobrescrever só as colunas de preço.

### Abordagem escolhida

Trocar o `head: [headers]` (array de strings) por um array de objetos com estilos individuais por célula, definindo `halign: 'right'` apenas nas células de cabeçalho dos supermercados:

```ts
const headRow = [
  { content: 'Código' },
  { content: 'Produto' },
  { content: 'Qntd' },
  ...nomesSupermercados.map(nome => ({
    content: nome,
    styles: { halign: 'right' }
  }))
];
autoTable(doc, { head: [headRow], ... });
```

Assim o cabeçalho de cada supermercado fica alinhado à direita, exatamente sobre os valores `R$ X,XX` da sua coluna.

### Aplicar também ao relatório de Comparativo da Concorrência

O mesmo padrão deve ser revisado em `generateComparativoConcorrenciaPDF` (linha 492+) caso ele também tenha colunas de preço por supermercado — verificarei e aplicarei o mesmo fix se necessário.

### Arquivo a modificar

- `src/lib/reportGenerator.ts` — ajuste de cabeçalho da tabela para alinhar à direita as colunas de supermercado

