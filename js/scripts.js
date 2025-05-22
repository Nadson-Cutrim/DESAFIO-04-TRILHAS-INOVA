
// Função para verificar se o elemento está visível na tela
const collapse = document.getElementById('collapse')
const nav = document.getElementById('nav')
const ancora = document.querySelectorAll('nav a')

// Verifica se collapse e nav existem antes de adicionar eventos
if (collapse && nav) {
  collapse.addEventListener('click', () => {
    nav.classList.toggle('collapse-true')
    collapse.classList.toggle('open')
  })
}
// filtros aplicaves
const estadoSelect = document.getElementById('estado');
const cidadeSelect = document.getElementById('cidade');

// Carrega os estados do Brasil
fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome')
.then(res => res.json())
.then(estados => {
  let maranhaoId = null;

  estados.forEach(estado => {
    const opt = document.createElement('option');
    opt.value = estado.id;
    opt.textContent = estado.nome;

    if (estado.sigla === 'MA') {
      opt.selected = true; 
      maranhaoId = estado.id;
    }

    estadoSelect.appendChild(opt);
  });

  
  if (maranhaoId) {
    carregarCidades(maranhaoId);
    carregarGraficos()
  }
});


function carregarCidades(estadoId) {
  cidadeSelect.innerHTML = '<option value="">Carregando...</option>';

  fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${estadoId}/municipios`)
    .then(res => res.json())
    .then(cidades => {
      cidadeSelect.innerHTML = '<option value="">Selecione uma cidade</option>';
      cidades.forEach(cidade => {
        const opt = document.createElement('option');
        opt.value = cidade.id;
        opt.textContent = cidade.nome;
        cidadeSelect.appendChild(opt);
      });
    });
}

// Quando um estado for selecionado, carrega as cidades
estadoSelect.addEventListener('change', () => {
  const estadoId = estadoSelect.value;
  if (estadoId) {
    carregarCidades(estadoId);
    carregarGraficos()
  }
});

// tratamento dos dados
const token = 'VWFtMhR85XttcftnC0hmdPbvgf8dTPkQwDF86XpI';

async function dadosIdeb() {
  const categoria = [2019, 2017, 2015, 2013, 2011];
  const mediasIdeb = [];
  let estadoId = estadoSelect.value ||21; // maranhao
  let cidadeId = cidadeSelect.value;
  let codigoIbge = cidadeId != ''? estadoId: estadoId;

  for (let ano of categoria) {
    const url = `https://api.qedu.org.br/v1/ideb?id=${codigoIbge}&ano=${ano}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const json = await response.json();
      const dados = json.data; // <-- Corrigido aqui

      if (Array.isArray(dados) && dados.length > 0) {
        const somaIdeb = dados.reduce((soma, item) => soma + parseFloat(item.ideb), 0);
        const media = somaIdeb / dados.length;
        mediasIdeb.push(media.toFixed(2));
      } else {
        console.warn(`Ano ${ano} não retornou dados válidos.`);
        mediasIdeb.push(0);
      }

    } catch (error) {
      console.error(`Erro ao buscar dados do ano ${ano}:`, error.message);
      mediasIdeb.push(null);
    }
  }
  return mediasIdeb;
}


async function dadoAcessoInternet() {
  const errorMsg = document.getElementById('error-ideb');
  const categoria = [2024, 2023, 2022, 2021, 2020];
  const porcentagemInternet = [];
  const porcentagemBandaLarga = [];

  let estadoId = estadoSelect.value || 21;
  let cidadeId = cidadeSelect.value;
  let codigoIbge = cidadeId !== '' ? cidadeId : estadoId;

  const urls = categoria.map(ano =>
    `https://api.qedu.org.br/v1/censo/territorio?ano=${ano}&ibge_id=${codigoIbge}`
  );

  try {
    const responses = await Promise.all(
      urls.map(url =>
        fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        })
      )
    );

    for (let i = 0; i < responses.length; i++) {
      const response = responses[i];

      if (!response.ok) {
        errorMsg.innerHTML = 'Erro ao fazer requisição dos dados de acesso à internet.';
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const json = await response.json();
      const dados = json.data;

      if (Array.isArray(dados) && dados.length > 0) {
        const totalEscolas = dados.reduce((soma, item) => soma + (item.qtd_escolas || 0), 0);
        const totalInternet = dados.reduce((soma, item) => soma + (item.tecnologia_internet || 0), 0);
        const totalBandaLarga = dados.reduce((soma, item) => soma + (item.tecnologia_banda_larga || 0), 0);

        if (totalEscolas > 0) {
          const porcentInternet = (totalInternet / totalEscolas) * 100;
          const porcentBandaLarga = (totalBandaLarga / totalEscolas) * 100;

          porcentagemInternet.push(porcentInternet.toFixed(2));
          porcentagemBandaLarga.push(porcentBandaLarga.toFixed(2));
        } else {
          porcentagemInternet.push(0);
          porcentagemBandaLarga.push(0);
        }
      } else {
        porcentagemInternet.push(0);
        porcentagemBandaLarga.push(0);
      }
    }
  } catch (error) {
    console.error('Erro ao buscar dados:', error.message);
    errorMsg.innerHTML = 'Erro ao carregar os dados de acesso à internet.';
    categoria.forEach(() => {
      porcentagemInternet.push(null);
      porcentagemBandaLarga.push(null);
    });
  }

  return {
    anos: categoria,
    internet: porcentagemInternet,
    bandaLarga: porcentagemBandaLarga
  };
}

async function dadoInfraestrutura() {
  const errorMsg = document.getElementById('error-Infraestrutura');
  const ano = document.getElementById('ano').value || 2024;
  let estadoId = estadoSelect.value || 21; // Maranhão
  let cidadeId = cidadeSelect.value;
  let codigoIbge = cidadeId !== '' ? cidadeId : estadoId;

  // dados retornados
  let soma_acessibilidade_escola = 0;
  let soma_alimentacao_fornecida = 0;
  let soma_alimentacao_agua_filtrada = 0;
  let soma_dependencias_sanitario_dentro_predio = 0;
  let soma_dependencias_sanitario_fora_predio = 0;
  let soma_dependencias_biblioteca = 0;
  let soma_dependencias_cozinha = 0;
  let soma_dependencias_lab_informatica = 0;
  let soma_dependencias_lab_ciencias = 0;
  let soma_dependencias_sala_leitura = 0;
  let soma_dependencias_quadra_esportes = 0;
  let soma_dependencias_sala_diretora = 0;
  let soma_dependencias_sala_professores = 0;
  let soma_dependencias_sala_atendimento_especial = 0;

  
    const url = `https://api.qedu.org.br/v1/censo/territorio?ano=${ano}&ibge_id=${codigoIbge}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        errorMsg.innerHTML = 'Erro ao fazer requisição dos dados de infraestrutura.';
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const json = await response.json();
      const dados = json.data;

      if (Array.isArray(dados) && dados.length > 0) {
        soma_acessibilidade_escola = dados.reduce((soma, item) => soma + (item.acessibilidade_escola || 0), 0);
        soma_alimentacao_fornecida = dados.reduce((soma, item) => soma + (item.alimentacao_fornecida || 0), 0);
        soma_alimentacao_agua_filtrada = dados.reduce((soma, item) => soma + (item.alimentacao_agua_filtrada || 0), 0);
        soma_dependencias_sanitario_dentro_predio = dados.reduce((soma, item) => soma + (item.dependencias_sanitario_dentro_predio || 0), 0);
        soma_dependencias_sanitario_fora_predio = dados.reduce((soma, item) => soma + (item.dependencias_sanitario_fora_predio || 0), 0);
        soma_dependencias_biblioteca = dados.reduce((soma, item) => soma + (item.dependencias_biblioteca || 0), 0);
        soma_dependencias_cozinha = dados.reduce((soma, item) => soma + (item.dependencias_cozinha || 0), 0);
        soma_dependencias_lab_informatica = dados.reduce((soma, item) => soma + (item.dependencias_lab_informatica || 0), 0);
        soma_dependencias_lab_ciencias = dados.reduce((soma, item) => soma + (item.dependencias_lab_ciencias || 0), 0);
        soma_dependencias_sala_leitura = dados.reduce((soma, item) => soma + (item.dependencias_sala_leitura || 0), 0);
        soma_dependencias_quadra_esportes = dados.reduce((soma, item) => soma + (item.dependencias_quadra_esportes || 0), 0);
        soma_dependencias_sala_diretora = dados.reduce((soma, item) => soma + (item.dependencias_sala_diretora || 0), 0);
        soma_dependencias_sala_professores = dados.reduce((soma, item) => soma + (item.dependencias_sala_professores || 0), 0);
        soma_dependencias_sala_atendimento_especial = dados.reduce((soma, item) => soma + (item.dependencias_sala_atendimento_especial || 0), 0);

      } else {
        errorMsg.innerHTML = 'Erro ao tratar os dados de infraestrutura.';
        console.error(`json não foi convertido para array`,dados );
       
      }

    } catch (error) {
      console.error(`Erro ao buscar dados:`, error.message);
    }
   let labels = [
      "Acessibilidade Escola",
      "Alimentação Fornecida",
      "Água Filtrada",
      "Sanitário Dentro do Prédio",
      "Sanitário Fora do Prédio",
      "Biblioteca",
      "Cozinha",
      "Laboratório de Informática",
      "Laboratório de Ciências",
      "Sala de Leitura",
      "Quadra de Esportes",
      "Sala da Diretora",
      "Sala dos Professores",
      "Sala de Atendimento Especial"
    ]
     let values = [
      soma_acessibilidade_escola,
      soma_alimentacao_fornecida,
      soma_alimentacao_agua_filtrada,
      soma_dependencias_sanitario_dentro_predio,
      soma_dependencias_sanitario_fora_predio,
      soma_dependencias_biblioteca,
      soma_dependencias_cozinha,
      soma_dependencias_lab_informatica,
      soma_dependencias_lab_ciencias,
      soma_dependencias_sala_leitura,
      soma_dependencias_quadra_esportes,
      soma_dependencias_sala_diretora,
      soma_dependencias_sala_professores,
      soma_dependencias_sala_atendimento_especial
    ]
  // Retorna os dois arrays para uso no gráfico
  return {
   Labels: labels,
   Values: values
  };
}
