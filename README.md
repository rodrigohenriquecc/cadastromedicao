# Road Navigator

Aja como um Desenvolvedor Frontend Sênior especialista em React, Tailwind CSS, UI/UX (Glassmorphism) e integrações GIS com react-leaflet.

Estou enviando em anexo uma imagem de referência visual do layout desejado e três arquivos de dados:

CM.xlsx (Dados de serviços e obras).

PLANILHA BI - OFICIAL.csv (Dicionário de georreferenciamento).

malha_dr02.kmz (Traçado geográfico da rodovia).

Crie uma Single Page Application (SPA) chamada "CGR 02 - Sistema de Localização". O aplicativo deve processar os arquivos localmente no navegador (usando bibliotecas como xlsx, papaparse e interpretadores de KML) e exibir os dados em um mapa interativo ocupando 100% da tela (100vh e 100vw).

1. Identidade Visual e UI/UX (Design Moderno):

Utilize o OpenStreetMap padrão no react-leaflet.

Painéis Flutuantes: Todos os painéis e controles devem usar o estilo Glassmorphism (fundo translúcido branco bg-white/80, desfoque de fundo backdrop-blur-md, bordas arredondadas rounded-xl, sombra suave shadow-2xl e borda fina translúcida border border-white/20).

Painel Esquerdo (Controles): Posicionado no canto inferior esquerdo (conforme imagem). Deve ser compacto, limpo e bem organizado.

Painel Direito (Legenda): Posicionado no canto superior direito (conforme imagem).

Use a biblioteca lucide-react para todos os ícones da interface e marcadores do mapa.

2. Lógica de Processamento de Dados (O Cruzamento):

Crie uma área de "Drag & Drop" discreta no painel esquerdo ou permita que a aplicação leia os arquivos por default (simulando a carga inicial).

Algoritmo de Referenciamento Linear: Para cada linha do arquivo CM.xlsx lido, pegue o valor da coluna SP e KM INICIAL. Busque no arquivo PLANILHA BI - OFICIAL.csv as linhas que correspondam à mesma rodovia (SP) e encontre o KM mais próximo matematicamente do KM INICIAL. Extraia a LATITUDE e LONGITUDE encontradas para gerar a coordenada exata daquele serviço.

Armazene os dados processados em um estado (useState, useMemo) para garantir performance e evitar re-renderizações desnecessárias.

3. Funcionalidades do Painel Esquerdo (Controles e Filtros):

Dropdown "Rodovia": Preenchido dinamicamente removendo duplicatas da coluna SP (ex: SP-280, SP 079).

Input Numérico "Km": Para o usuário digitar o quilômetro exato.

Botão "Localizar": Cor azul vibrante, texto branco. Ao ser clicado, a câmera do mapa (useMap hook) deve animar (flyTo) para a Lat/Lon correspondente àquela rodovia e KM com zoom de nível 15.

Filtros de Camada (Checkboxes customizados):

Atuação (Fresa)

Câmeras CM

Sensores CM

Pontes e Obras

Regra de Filtro: Ao desmarcar uma opção, os marcadores correspondentes devem desaparecer do mapa reativamente.

4. Funcionalidades do Mapa (Marcadores e KML):

Traçado KML/KMZ: Crie um componente que leia o malha_dr02.kmz enviado e plote os polígonos/linhas (Polyline) da malha rodoviária sobre o mapa base, com cor azul translúcida (weight: 4, color: #3b82f6).

Renderização de Marcadores: Para cada serviço processado com sucesso na Etapa 2, crie um Marker customizado.

Baseado na coluna DATA (comparada com a data atual), defina a cor do pino:

Azul: Atual (6 meses ou menos).

Vermelho: 6 meses sem atualizar.

Preto: Sem atuação recente (ou data vazia).

Popups Inteligentes: Ao clicar em um pino no mapa, exiba um Popup moderno contendo os dados do CM.xlsx: DESCRIÇÃO DO SERVIÇO, DATA, KM INICIAL, KM FINAL e QNTD ( final ). Formate os dados adequadamente para fácil leitura.

5. Estrutura de Código Requerida:

Use TypeScript para garantir tipagem dos dados cruzados.

Divida a aplicação em componentes lógicos (ex: MapContainer, ControlPanel, LegendPanel, LayerManager).

Trate possíveis erros no parse dos arquivos (ex: KMs que não encontram correspondência na planilha de BI) evitando que a aplicação quebre, ignorando os pontos sem coordenadas (silenciosamente) e renderizando os válidos.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e07e375b-d75a-4393-81d1-a44ee49306e3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
