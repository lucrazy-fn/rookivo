# Rookivo

Site de análise de xadrez em português. Projeto local executável com React, TypeScript, Vinext/Vite, chess.js e Stockfish 19 Lite (WebAssembly, até dois Web Workers independentes).

O ícone próprio de torre está em `public/rookivo-icon.svg` e também é usado como favicon. O tabuleiro ocupa mais espaço na versão desktop, e a lista de partidas vazia ficou mais compacta.

## Iniciar no Windows com dois cliques

Extraia o ZIP completo e abra `iniciar.bat`. Ele verifica o Node.js, instala as dependencias na primeira execucao e inicia o site. O navegador abre automaticamente assim que o servidor estiver pronto. Mantenha a janela aberta. Para encerrar, pressione Ctrl+C ou feche a janela. Requer Node.js 22.13 ou superior com npm.

## Executar

1. Instale Node.js 22.13 ou superior (recomendado: uma versão LTS com npm).
2. Extraia o ZIP e abra um terminal na pasta que contém `package.json`.
3. Execute:

```sh
npm ci
npm run dev
```

Abra http://localhost:5173. Não abra os arquivos diretamente com `file://`.

O primeiro comando precisa de internet: instala as dependências e copia automaticamente o motor para `public/engine`. O pacote npm de Stockfish contém outras versões grandes do motor, mas apenas a versão Lite de cerca de 1,9 MB é servida ao navegador. Não precisa de chave de API, banco de dados ou conta neste projeto.

Para compilar e executar em modo de produção:

```sh
npm run build
npm start
```

Para verificar o projeto:

```sh
npm test
npm run typecheck
```

Se o PowerShell bloquear `npm.ps1`, use `npm.cmd` no lugar de `npm`; não é necessário alterar a política de execução.

## Como usar

- Digite o nick do Chess.com e pressione Enter ou a seta. O mês mais recente é carregado primeiro.
- Escolha qualquer mês disponível e filtre por ritmo. A lista exibe 12 partidas por página, apenas de xadrez padrão.
- Selecione uma partida. O tabuleiro fica orientado para o jogador consultado.
- Navegue pelos botões, lances ou teclas ← / → / Home / End. O botão de reprodução avança automaticamente.
- Clique em uma peça e no destino ou arraste para criar uma variação legal. Promoções permitem escolher dama, torre, bispo ou cavalo. Use “Voltar à partida” para sair da variação.
- Clique em “Analisar partida”. O Stockfish calcula as posições em sequência, sem bloquear a interface. É possível interromper e continuar de onde parou. As últimas oito combinações de partida e qualidade ficam em memória; repetir uma análise concluída é imediato.
- Em uma variação, “Analisar esta posição” calcula somente a posição exibida.
- Clique no gráfico para ir a uma posição. A barra e o número sempre indicam a vantagem das **brancas**: positivo favorece brancas; negativo, pretas; M indica mate previsto.
- Importe um PGN por texto ou arquivo (até 2 MB), ou experimente a Partida da Ópera. O botão de download exporta o PGN original, sem as variações exploradas e sem anotações do motor.

## Análise e limites

É uma revisão aproximada independente, não uma reprodução do algoritmo proprietário do Chess.com. O resumo segue a ordem e os nomes da referência enviada, com brancas e pretas separadas. Os símbolos aparecem junto à peça, na lista e no resumo. Clique no número de uma categoria para navegar pelos lances daquele jogador.

| Símbolo | Categoria | Critério |
| --- | --- | --- |
| !! | Brilhante | Sacrifício favorável confirmado, com alternativas que não mantêm uma vitória praticamente certa |
| ! | Excelente | Melhor lance crítico, com alternativas significativamente inferiores |
| Livro desenhado | Livro | Par posição/lance registrado na base de aberturas |
| Estrela | Melhor | Primeira escolha do motor |
| Polegar para cima | Ótimo | Perda de até 0,02 na expectativa de resultado |
| ✓ | Bom | Perda de até 0,05 |
| ?! | Imprecisão | Perda de até 0,10 |
| ? | Erro | Perda de até 0,20 |
| × | Chance Perdida | Oportunidade criada por erro adversário e não aproveitada |
| ?? | Capivarada | Perda acima de 0,20 |

### Como a comparação funciona

Cada posição é pesquisada com MultiPV 2. As categorias usam a transformação publicada pelo Lichess a partir de partidas humanas: chance = 1 / (1 + exp(−0,00368208 × cp)), convertida para o lado que jogou. O WDL do Stockfish é preservado apenas para diagnóstico: sua saturação em posições desequilibradas escondia perdas relevantes. Este modelo não é personalizado pelo rating nem reproduz o algoritmo proprietário do Chess.com. Permitir um mate evitável é capivarada; deixar escapar uma sequência de mate é chance perdida.

A escolha feita na partida é comparada às alternativas a partir da MESMA posição. Se ela não estiver nas duas linhas calculadas na mesma profundidade, uma busca searchmoves avalia especificamente esse lance. Isso evita usar apenas a diferença entre a avaliação antes e depois, que pode mudar por causa do horizonte da busca. Quedas superiores a 0,10, mudanças de mate, casos próximos dos limiares e candidatos a símbolos especiais recebem uma busca adicional. Variantes de profundidades diferentes não são comparadas para conceder símbolos especiais. Opções da mesma raiz que diferem até 0,08 peão, com profundidade mínima 12, também podem ser Melhor. As buscas ainda têm tempo finito e podem divergir do Chess.com e entre execuções.

Livro tem precedência e é reconhecido sem iniciar o motor. A base tem 3.865 aberturas e 8.192 pares posição/lance, de lichess-org/chess-openings (CC0). Inclui linhas incomuns e não garante que todo lance teórico seja forte. A versão está em data/openings/REVISION.txt. Execute node scripts/build-book.mjs para reconstruir src/book.json com os TSV incluídos.

Brilhante exige conferência adicional, profundidade mínima 12 nas avaliações principal e jogada, perda de expectativa até 0,02, resultado esperado de pelo menos 0,50 para quem jogou, e segunda alternativa com expectativa abaixo de 0,90 na mesma profundidade da principal. Uma árvore de capturas e recapturas legais de até cinco níveis deve detectar uma oferta de peça com perda de pelo menos um peão líquido, descontando o material já capturado. Uma peça que já estava pendurada e não se moveu não conta. É uma heurística conservadora que pode omitir ou superestimar sacrifícios.

Excelente (!) exige a primeira escolha, conferência adicional, profundidade mínima 12 e segunda alternativa na mesma profundidade, pelo menos 0,10 pior em expectativa e abaixo de 0,65; o lance jogado deve manter pelo menos 0,50. Chance Perdida exige que a expectativa para quem joga passe de menos de 0,65 antes do erro adversário para pelo menos 0,75 e caia abaixo de 0,65 após o lance, com perda de pelo menos 0,10. Essas regras especiais são próprias do projeto.

### Velocidade

- Turbo (padrão): busca básica de 100 ms por posição.
- Equilibrada: 350 ms por posição.
- Detalhada: 1.200 ms por posição.

Buscas específicas e conferências acrescentam tempo quando necessárias. Uma busca específica usa 65% do orçamento básico, no mínimo 60 ms. Uma conferência usa pelo menos 240 ms (ou o dobro do orçamento), e sua busca específica, quando necessária, pelo menos 180 ms. A estimativa na tela indica somente a busca básica restante; o tempo real final também é mostrado.

Na máquina de teste, a partida de exemplo de 34 posições terminou em 5,5 segundos no Turbo com a comparação na mesma posição e conferências. Esse tempo não é garantia para outros aparelhos ou partidas. O motor Lite é menos forte que o completo; a profundidade alcançada aparece na tela.

O histórico é preparado uma vez, evitando reconstruir toda a partida para cada posição. O cache mantém as últimas oito combinações de PGN e qualidade, completas ou parciais. Continuar retoma os cálculos prontos; repetir uma análise concluída é imediato. Trocar de partida cancela a anterior. Recarregar a aba apaga o cache. O gráfico mostra a avaliação da posição; a classificação usa a comparação específica do lance e pode não refletir simplesmente a diferença visual entre pontos consecutivos do gráfico.

Na análise da partida, o motor recebe a sequência de lances, preservando o histórico para repetições. Na análise livre, a posição é analisada isoladamente, sem considerar repetições anteriores. Empates acordados, desistências e derrotas por tempo aparecem no resultado do PGN, mas não implicam que a posição final seja empate ou mate no tabuleiro.

As consultas à API são sequenciais, com cache em memória por cinco minutos, cancelamento ao trocar de busca e limite de espera de 20 segundos. Há mensagens específicas para usuário inexistente, erro de rede e limite de consultas. A API pública pode demorar para atualizar. Não há proxy servidor: uma indisponibilidade ou bloqueio de CORS no Chess.com exige tentar depois ou importar PGN.

O histórico carregado, as variações e os resultados ficam somente na memória da aba: recarregar perde esse estado. O motor roda localmente em Web Worker, sem enviar PGNs a um servidor de análise. A consulta de nick é enviada ao Chess.com. A aparência utiliza Google Fonts com alternativas locais se as fontes não carregarem. O projeto não instala service worker e não promete uso offline completo.

## Arquivos principais

- `app/page.tsx`: interface, histórico, tabuleiro, variações e controle da análise.
- `app/globals.css`: visual responsivo.
- `src/chess.mjs`: leitura de PGN, avaliação terminal, conversão UCI/SAN e classificação.
- `src/engine.mjs`: comunicação UCI com o Web Worker, MultiPV e cancelamento.
- `src/review.mjs`: cache e retomada de análise.
- `app/Piece.tsx`: seis desenhos vetoriais próprios, renderizados em SVG para as duas cores.
- `app/Badge.tsx`: símbolos das categorias.
- `src/book.json` e `data/openings/`: base de aberturas e fontes CC0.
- `src/api.mjs`: acesso ao Chess.com, cache e erros.
- `scripts/prepare-engine.mjs`: prepara o motor após a instalação.
- `tests/`: testes de regras, classificação, API e comunicação com o motor.

O ZIP não inclui `node_modules`, builds nem binários do motor. `npm ci` os prepara usando as versões fixadas em `package-lock.json`.

## Licenças e referências

Código deste projeto: GPL-3.0; consulte `LICENSE`. Dependências mantêm suas licenças próprias. Stockfish/Stockfish.js é GPL-3.0 e chess.js é BSD-2-Clause. Ao redistribuir binários do Stockfish ou hospedar uma versão modificada, forneça também o código-fonte correspondente e os avisos exigidos pela licença. O instalador preserva a licença do motor em `public/engine/COPYING.txt`.

- API oficial: https://www.chess.com/news/view/published-data-api
- Motor, código-fonte e instruções de compilação: https://github.com/nmrugg/stockfish.js
- Distribuição usada: https://www.npmjs.com/package/stockfish/v/19.0.1
- Regras e PGN: https://github.com/jhlywa/chess.js

Projeto independente, sem afiliação com Chess.com.

## Referências da revisão

- Categorias oficiais usadas como referência conceitual: https://support.chess.com/en/articles/8572705-how-are-moves-classified-what-is-a-blunder-or-brilliant-etc
- Base de aberturas CC0: https://github.com/lichess-org/chess-openings
- As peças são SVG originais inspiradas no estilo Staunton. Não dependem de PNG, fontes de símbolos nem imagens remotas.

- Modelo WDL do Stockfish: https://official-stockfish.github.io/docs/stockfish-wiki/Stockfish-FAQ.html

### Interface compacta
No computador, tabuleiro e controles se ajustam à altura da janela. O painel possui abas Resumo e Lances e detalhes, com rolagem interna. Em celulares, as áreas são empilhadas.

Modelo de chances: https://lichess.org/page/accuracy

## Atualização: análise rápida, jogadores e IA

- **Velocidade:** em dispositivos com pelo menos 4 processadores lógicos, dois motores trabalham em paralelo. Nos menores e nas variações livres, apenas um. Resultados são entregues em ordem, preservando cancelamento e retomada. Sacrifícios já examinados são memorizados. Turbo usa 80 ms de busca básica, 50 ms para o lance jogado e 180/100 ms nas conferências. Outros modos ampliam o orçamento.
- **Benchmark local:** kok-r7 × VexLuan, 59 meios-lances: 15,112 s antes e 5,958 s depois. Mesmo Stockfish via adaptador Node; navegador, CPU e profundidade alteram tempos e categorias.
- **Cores:** nomes, peças e colunas Brancas/Pretas são explícitos. Inverter o tabuleiro não troca jogadores. PGNs iniciados pelas pretas usam cor e número reais do lance.
- **Precisão:** o campo `accuracies` da API é mostrado como Chess.com quando disponível. Caso contrário, após análise completa, usamos a fórmula pública de precisão por lance do Lichess, com comparações da mesma posição, média ponderada pela volatilidade e média harmônica. É uma adaptação local, não CAPS nem reprodução exata do Lichess. A precisão oficial não altera as categorias locais.
- **Rating da partida:** heurística experimental, sem calibração estatística. Exige rating válido no PGN e pelo menos 8 lances fora do livro por jogador. Usa precisão LOCAL: rating base + 20 × (precisão − referência), sendo referência = limite(55 + 0,012 × rating base, 55, 90). Resultado limitado a 100–3200 e arredondado a 50. Não mede seu Elo nem reproduz o Chess.com. Sem dados suficientes, mostra —.

### Treinador opcional

1. Analise a partida e selecione um lance.
2. Abra **Treinador** e escolha OpenAI, Google Gemini, Claude/Anthropic, Grok/xAI ou OpenRouter.
3. Informe a chave de API e o ID exato de um modelo habilitado na sua conta. O link junto de Modelo abre o catálogo do serviço. Nenhum modelo específico é presumido disponível em todas as contas.
4. Clique em **Explicar este lance**. A IA recebe posição, lance, cor, avaliações e variantes, sem nomes ou PGN completo.

A chave fica no estado da página, nunca em localStorage, arquivos ou logs do aplicativo. No pedido manual, é enviada ao servidor local e usada para autenticar no provedor escolhido; não é persistida. Trocar de provedor, recarregar ou clicar em Apagar chave da sessão a remove. A API pode cobrar créditos e processar/reter a posição conforme suas políticas. Nenhuma chamada de IA ocorre automaticamente. OpenRouter encaminha ao provedor do modelo escolhido.

A IA pode explicar e sugerir classificações, mas não substitui as avaliações numéricas do Stockfish. Sugestões só alteram os selos após Aplicar sugestões ao resumo; recebem a marca IA e podem ser revertidas. Precisão e rating não são alterados pela IA. Explicações e sugestões podem conter erros.

A rota POST /api/coach aceita somente origem igual e cinco destinos HTTPS fixos, limita entrada e tempo (45 s), e não devolve erros brutos dos provedores. Este é um aplicativo local; publicar para outras pessoas exige autenticação e limites de uso.

Os cinco serviços foram testados com respostas simuladas, incluindo formato, autenticação, erros e proteção da chave. Chamadas pagas reais não foram feitas sem uma chave fornecida pelo usuário.

Referências:
- Precisão na API pública: https://www.chess.com/news/view/published-data-api
- Precisão e agregação: https://lichess.org/page/accuracy
- Categorias: https://support.chess.com/en/articles/8572705-how-are-moves-classified-what-is-a-blunder-or-brilliant-etc
- OpenAI: https://developers.openai.com/api/docs/guides/text
- Gemini: https://ai.google.dev/api/generate-content
- Claude: https://platform.claude.com/docs/en/api/messages
- Grok: https://docs.x.ai/developers/rest-api-reference/inference/responses
- OpenRouter: https://openrouter.ai/docs/api/reference/overview

Em **Lances**, o botão **Conferir este lance com mais profundidade** amplia somente a busca da posição selecionada (1,2 s para alternativas e até 0,65 s para o lance jogado), atualizando a categoria e a estimativa local. O restante da partida e a precisão oficial são preservados. A profundidade efetiva depende do dispositivo.

## Revisão assistida por IA (v5)

**Onde inserir o token:** clique em **IA / token** no topo. O site abre Treinador e foca **Chave de API (token)**. Escolha o serviço, cole a chave e preencha o ID de um modelo habilitado na sua conta. Não compartilhe a chave em chats ou no código.

Depois de concluir a análise do Stockfish:

1. Selecione um lance e clique em **Revisar classificação deste lance**, ou use **Revisar classificações da partida**.
2. A revisão completa divide os lances em lotes de até seis. A interface informa o número máximo de chamadas antes de começar. Não há chamadas automáticas nem tentativas pagas automáticas após falha.
3. Confira o rótulo original, a sugestão e a justificativa. Clique em **Aplicar sugestões ao resumo** para atualizar tabela, lista e símbolo no tabuleiro.
4. Os lances aplicados têm a marca **IA**. Em **Lances**, também aparece o rótulo original do motor. O botão **voltar ao motor** restaura a visão original sem nova chamada de API.

A IA recebe as posições, cor, avaliações, perda de chances, profundidades e variantes do motor. Ela escolhe apenas entre categorias compatíveis: há tolerância de 1 ponto percentual ao redor dos limiares comuns; Melhor exige a melhor linha ou equivalência dentro de 0,08 peão; Brilhante exige evidência de sacrifício; Excelente exige diferença relevante para a segunda linha. Livro e transições de mate inequívocas são preservados. Esses limites evitam que uma resposta sem fundamento transforme uma capivarada em brilhante.

Isso permite julgamento adicional em casos limítrofes e especiais; não torna a IA um motor de xadrez nem reproduz o algoritmo privado do Chess.com. A justificativa ainda pode errar. Cada resposta é validada: índices, duplicatas, categorias e quantidade de lances devem coincidir com o pedido. Respostas inválidas não são aplicadas. A revisão completa ignora lances sem alternativa de categoria compatível, reduzindo chamadas.

Mudar de partida, qualidade ou evidências invalida sugestões incompatíveis. Alterar serviço/modelo/chave cancela a solicitação e limpa as sugestões pendentes. Navegar durante revisão da partida mantém o processamento; navegar durante uma explicação ou revisão individual a cancela. Cancelar conserva os lotes válidos já recebidos para aplicação opcional. Nada é persistido após recarregar.

Testes de revisão usam respostas simuladas dos cinco serviços. Sem uma chave real, qualidade e latência das sugestões de modelos reais não foram aferidas.


## Rookivo — explicação local (v6)
Em Treinador, clique em Explicar com Stockfish após analisar e selecionar um lance. Não precisa de token nem de rede adicional: o texto usa regras, fatos legais do tabuleiro e variantes do motor. Informa capturas, roque, promoção, xeque/mate, classificação, avaliação e alternativa recomendada. Ao navegar, a explicação acompanha o lance. IA externa continua opcional.

Nome anterior: Lancevra. A pesquisa do nome atual está documentada na seção v7.

## Rookivo v7 — tabuleiro
Arraste próprio por pointer events: apenas a peça SVG acompanha o cursor, sem imagem da casa ou fundo. Funciona com mouse e toque, preservando seleção por clique e teclado. Movimentos adjacentes e retorno de lances têm animação de 190 ms, incluindo roque e promoção. Saltos grandes e preferência por movimento reduzido não recebem animação. Soltar fora do tabuleiro cancela o arraste.
Nome Rookivo: pesquisa em 09/11/2026 não encontrou produto homônimo; apareceu uma ocorrência de OCR em jornal histórico. Não constitui consulta de marca nem confirmação de domínio disponível.

## Rookivo v9 — marcações, volume e Corrida de Puzzles

- Marcações seguem os atalhos do Chess.com: seta amarela e casa vermelha por padrão; Ctrl alterna vermelho/amarelo, Alt usa azul e Shift usa verde. O desenho de casa agora é preenchido, e a seta usa um polígono largo. Clique esquerdo limpa as marcações.
- O volume sintetizado dos sons de lance, captura, xeque e mate foi elevado de 0,14 para 0,34. O botão de som continua disponível abaixo do tabuleiro.
- **Corrida de Puzzles** abre pelo topo. São 3 minutos, três erros permitidos, oito posições locais em dificuldade crescente, rodadas contínuas, respostas automáticas e recorde salvo no navegador. Não usa conta, rede ou API paga.

## v10 — treino e setas

O modo **Treinar sem tempo** não tem relógio nem limite de erros; permite pular. Há 13 posições locais, incluindo versões espelhadas validadas. As rodadas continuam indefinidamente, repetindo o catálogo; não há geração infinita de problemas inéditos. Setas de salto de cavalo agora seguem um traçado em L. Cliques direitos marcam a casa inteira e as setas respeitam as cores dos modificadores.

## v11 — símbolo de mate

Ao alcançar uma posição de xeque-mate, o rei derrotado recebe um selo vermelho `#` no tabuleiro. Funciona na análise de partidas, em variações livres e nos puzzles.
