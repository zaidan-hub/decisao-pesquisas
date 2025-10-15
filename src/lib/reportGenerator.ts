import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Produto, Grupo, Subgrupo, Supermercado, Coleta, Departamento } from '@/types';

interface RelatorioData {
  nome: string;
  nomeCliente: string;
  data: string;
  produtos: Produto[];
  coletas: Coleta[];
  supermercados: Supermercado[];
  grupos: Grupo[];
  subgrupos: Subgrupo[];
  departamentos: Departamento[];
  hierarquiaCustomizada?: {
    departamentos?: { [id: string]: string };
    grupos?: { [id: string]: string };
    subgrupos?: { [id: string]: string };
  };
}

// Gera PDF do relatório
export const generatePDF = (data: RelatorioData) => {
  console.log('🔵 GERANDO PDF - Dados recebidos:', data);
  console.log('🔵 Coletas:', data.coletas);
  console.log('🔵 Produtos:', data.produtos);
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Cabeçalho
  doc.setFontSize(16);
  doc.text(data.nomeCliente, pageWidth / 2, 15, { align: 'center' });
  doc.setFontSize(10);
  doc.text(new Date(data.data).toLocaleDateString('pt-BR'), pageWidth / 2, 22, { align: 'center' });

  // Informações das coletas
  let yPos = 30;
  doc.setFontSize(9);
  
  // Agrupar coletas por supermercado
  const coletasPorSupermercado = new Map<string, { data: string, nome: string }>();
  data.coletas.forEach(coleta => {
    const supermercado = data.supermercados.find(s => s.id === coleta.supermercadoId);
    if (supermercado) {
      coletasPorSupermercado.set(supermercado.id, {
        data: new Date(coleta.data).toLocaleDateString('pt-BR'),
        nome: supermercado.nome
      });
    }
  });

  // Verificar se todas as datas são iguais
  const datas = Array.from(coletasPorSupermercado.values()).map(c => c.data);
  const todasDataIguais = datas.every(d => d === datas[0]);

  if (todasDataIguais && datas.length > 0) {
    doc.text(`Data da coleta: ${datas[0]}`, 14, yPos);
    yPos += 5;
    doc.text(`Supermercados: ${Array.from(coletasPorSupermercado.values()).map(c => c.nome).join(', ')}`, 14, yPos);
  } else {
    doc.text('Datas e Supermercados:', 14, yPos);
    yPos += 5;
    coletasPorSupermercado.forEach(({ data, nome }) => {
      doc.text(`  • ${nome}: ${data}`, 14, yPos);
      yPos += 5;
    });
  }

  yPos += 3;

  // Estatísticas
  const produtosPesquisados = data.produtos.length;
  let produtosEncontrados = 0;
  let produtosNaoEncontrados = 0;

  data.produtos.forEach(produto => {
    const temPreco = data.coletas.some(coleta => {
      // Priorizar preços editados pelo admin
      const precoFinal = coleta.precosEditadosAdmin?.[produto.id] ?? coleta.precos?.[produto.id] ?? 0;
      return precoFinal > 0;
    });
    if (temPreco) {
      produtosEncontrados++;
    } else {
      produtosNaoEncontrados++;
    }
  });

  doc.text(`Produtos pesquisados: ${produtosPesquisados}`, 14, yPos);
  yPos += 5;
  doc.text(`Produtos encontrados: ${produtosEncontrados}`, 14, yPos);
  yPos += 5;
  doc.text(`Produtos não encontrados: ${produtosNaoEncontrados}`, 14, yPos);
  yPos += 8;

  // Criar estrutura hierárquica: Departamento -> Grupo -> Subgrupo -> Produtos
  const tableData: any[] = [];
  const symbolsMap = new Map<number, Map<number, string>>(); // rowIndex -> colIndex -> symbol
  let currentRowIndex = 0;
  
  // Agrupar produtos por departamento, grupo e subgrupo
  const hierarchy = new Map<string, Map<string, Map<string, Produto[]>>>();
  
  data.produtos.forEach(produto => {
    const subgrupo = data.subgrupos.find(s => s.id === produto.subgrupoId);
    const grupo = data.grupos.find(g => g.id === produto.grupoId);
    const departamento = grupo?.departamentoId 
      ? data.departamentos.find(d => d.id === grupo.departamentoId)
      : null;
    
    // Usar nomes customizados se disponíveis, senão usar os originais
    const depNome = departamento 
      ? (data.hierarquiaCustomizada?.departamentos?.[departamento.id] || departamento.nome)
      : 'SEM DEPARTAMENTO';
    const grupoNome = grupo
      ? (data.hierarquiaCustomizada?.grupos?.[grupo.id] || grupo.nome)
      : 'SEM GRUPO';
    const subgrupoNome = subgrupo
      ? (data.hierarquiaCustomizada?.subgrupos?.[subgrupo.id] || subgrupo.nome)
      : 'SEM SUBGRUPO';
    
    const depKey = depNome;
    const grupoKey = grupoNome;
    const subgrupoKey = subgrupoNome;
    
    if (!hierarchy.has(depKey)) {
      hierarchy.set(depKey, new Map());
    }
    const grupoMap = hierarchy.get(depKey)!;
    
    if (!grupoMap.has(grupoKey)) {
      grupoMap.set(grupoKey, new Map());
    }
    const subgrupoMap = grupoMap.get(grupoKey)!;
    
    if (!subgrupoMap.has(subgrupoKey)) {
      subgrupoMap.set(subgrupoKey, []);
    }
    subgrupoMap.get(subgrupoKey)!.push(produto);
  });
  
  // Ordenar e criar linhas da tabela com hierarquia
  const sortedDepartamentos = Array.from(hierarchy.keys()).sort();
  
  sortedDepartamentos.forEach(depNome => {
    // Adicionar linha do departamento (em negrito via estilo)
    tableData.push([{
      content: depNome.toUpperCase(),
      colSpan: 3 + data.coletas.length,
      styles: { fontStyle: 'bold', fontSize: 10, fillColor: [240, 240, 240] }
    }]);
    currentRowIndex++;
    
    const grupoMap = hierarchy.get(depNome)!;
    const sortedGrupos = Array.from(grupoMap.keys()).sort();
    
    sortedGrupos.forEach(grupoNome => {
      // Adicionar linha do grupo (indentada)
      tableData.push([{
        content: '  ' + grupoNome.toUpperCase(),
        colSpan: 3 + data.coletas.length,
        styles: { fontStyle: 'bold', fontSize: 9, fillColor: [250, 250, 250] }
      }]);
      currentRowIndex++;
      
      const subgrupoMap = grupoMap.get(grupoNome)!;
      const sortedSubgrupos = Array.from(subgrupoMap.keys()).sort();
      
      sortedSubgrupos.forEach(subgrupoNome => {
        // Adicionar linha do subgrupo (mais indentada)
        tableData.push([{
          content: '    ' + subgrupoNome.toUpperCase(),
          colSpan: 3 + data.coletas.length,
          styles: { fontStyle: 'bold', fontSize: 8 }
        }]);
        currentRowIndex++;
        
        const produtos = subgrupoMap.get(subgrupoNome)!;
        const produtosOrdenados = produtos.sort((a, b) => a.nome.localeCompare(b.nome));
        
        // Adicionar produtos
        produtosOrdenados.forEach(produto => {
          const qntd = produto.quantidade && produto.unidadeMedida 
            ? `${produto.quantidade} ${produto.unidadeMedida}`
            : produto.quantidade || produto.unidadeMedida || '-';
          
          const row: any[] = [
            produto.codigo,
            produto.nome + (produto.maisBarato ? ' (+Barato)' : ''),
            qntd
          ];

          // Preços por supermercado (priorizar preços editados pelo admin)
          const precos: number[] = [];
          const textosMaisBarato: string[] = [];
          let temTextoMaisBarato = false;
          
          data.coletas.forEach(coleta => {
            console.log(`🔵 Produto ${produto.nome} - Coleta ${coleta.id}:`, {
              precosEditadosAdmin: coleta.precosEditadosAdmin,
              precos: coleta.precos,
              precoFinal: coleta.precosEditadosAdmin?.[produto.id] ?? coleta.precos?.[produto.id] ?? 0
            });
            
            const preco = coleta.precosEditadosAdmin?.[produto.id] ?? coleta.precos?.[produto.id] ?? 0;
            const texto = coleta.textosMaisBarato?.[produto.id] || '';
            precos.push(preco);
            textosMaisBarato.push(texto);
            
            if (produto.maisBarato && texto && preco > 0) {
              temTextoMaisBarato = true;
            }
            
            row.push(preco > 0 ? `R$ ${preco.toFixed(2)}` : '-');
          });

          // Calcular máximo e mínimo (apenas preços > 0)
          const precosValidos = precos.filter(p => p > 0);
          if (precosValidos.length > 0) {
            const maxPreco = Math.max(...precosValidos);
            const minPreco = Math.min(...precosValidos);

            // Armazenar símbolos no mapa para desenhar coloridos depois
            if (!symbolsMap.has(currentRowIndex)) {
              symbolsMap.set(currentRowIndex, new Map());
            }
            
            for (let i = 0; i < precos.length; i++) {
              if (precos[i] > 0) {
                if (precos[i] === maxPreco && precos[i] === minPreco) {
                  symbolsMap.get(currentRowIndex)!.set(3 + i, '+ -');
                } else if (precos[i] === maxPreco) {
                  symbolsMap.get(currentRowIndex)!.set(3 + i, '+');
                } else if (precos[i] === minPreco) {
                  symbolsMap.get(currentRowIndex)!.set(3 + i, '-');
                }
              }
            }
          }

          tableData.push(row);
          currentRowIndex++;
          
          // Se for produto mais barato e tiver textos, adicionar linha com as marcas
          if (temTextoMaisBarato) {
            const marcasRow: any[] = ['', '', ''];
            textosMaisBarato.forEach(texto => {
              marcasRow.push(texto || '');
            });
            tableData.push(marcasRow);
            currentRowIndex++;
          }
        });
      });
    });
  });

  // Cabeçalhos da tabela
  const headers = [
    'Código',
    'Produto',
    'Qntd',
    ...Array.from(coletasPorSupermercado.values()).map(c => c.nome)
  ];

  autoTable(doc, {
    head: [headers],
    body: tableData,
    startY: yPos,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [66, 66, 66] },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 50 },
      2: { cellWidth: 25 }
    },
    didDrawCell: (data) => {
      // Aplicar cores aos símbolos + e -
      if (data.section === 'body' && data.column.index >= 3) {
        const rowSymbols = symbolsMap.get(data.row.index);
        if (rowSymbols && rowSymbols.has(data.column.index)) {
          const symbol = rowSymbols.get(data.column.index)!;
          const cellText = data.cell.text[0];
          
          if (cellText && cellText !== '-') {
            // Calcular posição do símbolo após o preço (centralizado verticalmente)
            doc.setFontSize(8);
            const textWidth = doc.getTextWidth(cellText);
            const symbolX = data.cell.x + textWidth + 2;
            const symbolY = data.cell.y + (data.cell.height / 2) + 2.5; // Ajustado para centralizar verticalmente
            
            // Desenhar símbolos com cores
            if (symbol === '+ -' || symbol === '- +') {
              // Desenhar + em azul
              doc.setTextColor(0, 0, 255);
              doc.text('+', symbolX, symbolY);
              // Desenhar - em vermelho
              doc.setTextColor(255, 0, 0);
              doc.text('-', symbolX + doc.getTextWidth('+') + 1, symbolY);
            } else if (symbol === '+') {
              doc.setTextColor(0, 0, 255); // Azul
              doc.text('+', symbolX, symbolY);
            } else if (symbol === '-') {
              doc.setTextColor(255, 0, 0); // Vermelho
              doc.text('-', symbolX, symbolY);
            }
            
            // Resetar cor
            doc.setTextColor(0, 0, 0);
          }
        }
      }
    }
  });

  doc.save(`${data.nomeCliente}_${data.data}.pdf`);
};

// Gera PDF de Produtos Não Encontrados
export const generateProdutosNaoEncontradosPDF = (data: RelatorioData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Cabeçalho
  doc.setFontSize(16);
  doc.text(data.nomeCliente, pageWidth / 2, 15, { align: 'center' });
  doc.setFontSize(10);
  doc.text(new Date(data.data).toLocaleDateString('pt-BR'), pageWidth / 2, 22, { align: 'center' });

  // Informações das coletas
  let yPos = 30;
  doc.setFontSize(9);
  
  // Agrupar coletas por supermercado
  const coletasPorSupermercado = new Map<string, { data: string, nome: string }>();
  data.coletas.forEach(coleta => {
    const supermercado = data.supermercados.find(s => s.id === coleta.supermercadoId);
    if (supermercado) {
      coletasPorSupermercado.set(supermercado.id, {
        data: new Date(coleta.data).toLocaleDateString('pt-BR'),
        nome: supermercado.nome
      });
    }
  });

  // Verificar se todas as datas são iguais
  const datas = Array.from(coletasPorSupermercado.values()).map(c => c.data);
  const todasDataIguais = datas.every(d => d === datas[0]);

  if (todasDataIguais && datas.length > 0) {
    doc.text(`Data da coleta: ${datas[0]}`, 14, yPos);
    yPos += 5;
    doc.text(`Supermercados: ${Array.from(coletasPorSupermercado.values()).map(c => c.nome).join(', ')}`, 14, yPos);
  } else {
    doc.text('Datas e Supermercados:', 14, yPos);
    yPos += 5;
    coletasPorSupermercado.forEach(({ data, nome }) => {
      doc.text(`  • ${nome}: ${data}`, 14, yPos);
      yPos += 5;
    });
  }

  yPos += 3;

  // Identificar produtos não encontrados
  const produtosNaoEncontrados = data.produtos.filter(produto => {
    const temPreco = data.coletas.some(coleta => {
      const precoFinal = coleta.precosEditadosAdmin?.[produto.id] ?? coleta.precos?.[produto.id] ?? 0;
      return precoFinal > 0;
    });
    return !temPreco;
  });

  // Quantidade de produtos não encontrados
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Produtos não encontrados: ${produtosNaoEncontrados.length}`, 14, yPos);
  yPos += 8;

  // Criar estrutura hierárquica para produtos não encontrados
  const tableData: any[] = [];
  const hierarchy = new Map<string, Map<string, Map<string, Produto[]>>>();
  
  produtosNaoEncontrados.forEach(produto => {
    const subgrupo = data.subgrupos.find(s => s.id === produto.subgrupoId);
    const grupo = data.grupos.find(g => g.id === produto.grupoId);
    const departamento = grupo?.departamentoId 
      ? data.departamentos.find(d => d.id === grupo.departamentoId)
      : null;
    
    const depKey = departamento?.nome || 'SEM DEPARTAMENTO';
    const grupoKey = grupo?.nome || 'SEM GRUPO';
    const subgrupoKey = subgrupo?.nome || 'SEM SUBGRUPO';
    
    if (!hierarchy.has(depKey)) {
      hierarchy.set(depKey, new Map());
    }
    const grupoMap = hierarchy.get(depKey)!;
    
    if (!grupoMap.has(grupoKey)) {
      grupoMap.set(grupoKey, new Map());
    }
    const subgrupoMap = grupoMap.get(grupoKey)!;
    
    if (!subgrupoMap.has(subgrupoKey)) {
      subgrupoMap.set(subgrupoKey, []);
    }
    subgrupoMap.get(subgrupoKey)!.push(produto);
  });
  
  // Ordenar e criar linhas da tabela
  const sortedDepartamentos = Array.from(hierarchy.keys()).sort();
  
  sortedDepartamentos.forEach(depNome => {
    tableData.push([{
      content: depNome.toUpperCase(),
      colSpan: 3,
      styles: { fontStyle: 'bold', fontSize: 10, fillColor: [240, 240, 240] }
    }]);
    
    const grupoMap = hierarchy.get(depNome)!;
    const sortedGrupos = Array.from(grupoMap.keys()).sort();
    
    sortedGrupos.forEach(grupoNome => {
      tableData.push([{
        content: '  ' + grupoNome.toUpperCase(),
        colSpan: 3,
        styles: { fontStyle: 'bold', fontSize: 9, fillColor: [250, 250, 250] }
      }]);
      
      const subgrupoMap = grupoMap.get(grupoNome)!;
      const sortedSubgrupos = Array.from(subgrupoMap.keys()).sort();
      
      sortedSubgrupos.forEach(subgrupoNome => {
        tableData.push([{
          content: '    ' + subgrupoNome.toUpperCase(),
          colSpan: 3,
          styles: { fontStyle: 'bold', fontSize: 8 }
        }]);
        
        const produtos = subgrupoMap.get(subgrupoNome)!;
        const produtosOrdenados = produtos.sort((a, b) => a.nome.localeCompare(b.nome));
        
        produtosOrdenados.forEach(produto => {
          const qntd = produto.quantidade && produto.unidadeMedida 
            ? `${produto.quantidade} ${produto.unidadeMedida}`
            : produto.quantidade || produto.unidadeMedida || '-';
          
          tableData.push([
            produto.codigo,
            produto.nome,
            qntd
          ]);
        });
      });
    });
  });

  // Tabela com produtos não encontrados
  autoTable(doc, {
    head: [['Código', 'Produto', 'Qntd']],
    body: tableData,
    startY: yPos,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [66, 66, 66] },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 120 },
      2: { cellWidth: 25 }
    }
  });

  doc.save(`${data.nomeCliente}_${data.data}_nao_encontrados.pdf`);
};

// Gera TXT do relatório
export const generateTXT = (data: RelatorioData) => {
  const lines: string[] = [];

  // Ordenar produtos por nome A-Z
  const produtosOrdenados = [...data.produtos].sort((a, b) => 
    a.nome.localeCompare(b.nome)
  );

  produtosOrdenados.forEach(produto => {
    data.coletas.forEach(coleta => {
      const supermercado = data.supermercados.find(s => s.id === coleta.supermercadoId);
      // Priorizar preços editados pelo admin
      const preco = coleta.precosEditadosAdmin?.[produto.id] ?? coleta.precos?.[produto.id] ?? 0;
      const textoMaisBarato = coleta.textosMaisBarato?.[produto.id] || '';
      
      if (preco > 0) {
        const dataFormatada = new Date(coleta.data)
          .toLocaleDateString('pt-BR')
          .split('/')
          .reverse()
          .join('')
          .replace(/\//g, '');
        
        const linha = [
          dataFormatada,
          produto.codigo,
          supermercado?.nome || 'N/A',
          preco.toFixed(2),
          produto.quantidade || '-',
          produto.unidadeMedida || '-',
          produto.nome + (produto.maisBarato && textoMaisBarato ? ` (${textoMaisBarato})` : '')
        ].join('\t');
        
        lines.push(linha);
      }
    });
  });

  const content = lines.join('\n');
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${data.nomeCliente}_${data.data}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};