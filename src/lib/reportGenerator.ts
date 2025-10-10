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
}

// Gera PDF do relatório
export const generatePDF = (data: RelatorioData) => {
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
  
  // Agrupar produtos por departamento, grupo e subgrupo
  const hierarchy = new Map<string, Map<string, Map<string, Produto[]>>>();
  
  data.produtos.forEach(produto => {
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
  
  // Ordenar e criar linhas da tabela com hierarquia
  const sortedDepartamentos = Array.from(hierarchy.keys()).sort();
  
  sortedDepartamentos.forEach(depNome => {
    // Adicionar linha do departamento (em negrito via estilo)
    tableData.push([{
      content: depNome.toUpperCase(),
      colSpan: 3 + data.coletas.length,
      styles: { fontStyle: 'bold', fontSize: 10, fillColor: [240, 240, 240] }
    }]);
    
    const grupoMap = hierarchy.get(depNome)!;
    const sortedGrupos = Array.from(grupoMap.keys()).sort();
    
    sortedGrupos.forEach(grupoNome => {
      // Adicionar linha do grupo (indentada)
      tableData.push([{
        content: '  ' + grupoNome.toUpperCase(),
        colSpan: 3 + data.coletas.length,
        styles: { fontStyle: 'bold', fontSize: 9, fillColor: [250, 250, 250] }
      }]);
      
      const subgrupoMap = grupoMap.get(grupoNome)!;
      const sortedSubgrupos = Array.from(subgrupoMap.keys()).sort();
      
      sortedSubgrupos.forEach(subgrupoNome => {
        // Adicionar linha do subgrupo (mais indentada)
        tableData.push([{
          content: '    ' + subgrupoNome.toUpperCase(),
          colSpan: 3 + data.coletas.length,
          styles: { fontStyle: 'bold', fontSize: 8 }
        }]);
        
        const produtos = subgrupoMap.get(subgrupoNome)!;
        const produtosOrdenados = produtos.sort((a, b) => a.nome.localeCompare(b.nome));
        
        // Adicionar produtos
        produtosOrdenados.forEach(produto => {
          const qntd = produto.quantidade && produto.unidadeMedida 
            ? `${produto.quantidade} ${produto.unidadeMedida}`
            : produto.quantidade || produto.unidadeMedida || '-';
          
          const row: any[] = [
            produto.codigo,
            produto.nome,
            qntd
          ];

          // Preços por supermercado (priorizar preços editados pelo admin)
          const precos: number[] = [];
          data.coletas.forEach(coleta => {
            const preco = coleta.precosEditadosAdmin?.[produto.id] ?? coleta.precos?.[produto.id] ?? 0;
            precos.push(preco);
            row.push(preco > 0 ? `R$ ${preco.toFixed(2)}` : '-');
          });

          // Calcular máximo e mínimo (apenas preços > 0)
          const precosValidos = precos.filter(p => p > 0);
          if (precosValidos.length > 0) {
            const maxPreco = Math.max(...precosValidos);
            const minPreco = Math.min(...precosValidos);

            // Adicionar símbolos + e -
            for (let i = 0; i < precos.length; i++) {
              if (precos[i] > 0) {
                if (precos[i] === maxPreco) {
                  row[3 + i] += ' +';
                }
                if (precos[i] === minPreco) {
                  row[3 + i] += ' -';
                }
              }
            }
          }

          tableData.push(row);
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
    }
  });

  doc.save(`${data.nomeCliente}_${data.data}.pdf`);
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
          produto.nome
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