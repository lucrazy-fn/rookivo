# Rookivo

Análise de partidas de xadrez no navegador, com histórico público do Chess.com, tabuleiro interativo, Stockfish 19 Lite, revisão de lances e puzzles.

## Site

O GitHub Pages publica automaticamente o conteúdo de `main` pelo fluxo em `.github/workflows/pages.yml`. Para ativar, escolha **Settings → Pages → Build and deployment → Source: GitHub Actions** no repositório. Endereço: https://lucrazy-fn.github.io/rookivo/

O Stockfish roda em Web Worker no próprio navegador. O nick consultado é enviado à API pública do Chess.com. A análise e os PGNs importados não são enviados a um servidor de análise. Os resultados ficam na memória da aba e são perdidos ao recarregar.

## Rodar no computador

Requer Node.js 22.13 ou superior. No Windows, abra `iniciar.bat` após extrair o projeto. O script instala as dependências na primeira execução, inicia o servidor local e abre o navegador. Mantenha a janela aberta.

Pelo terminal:

```sh
npm ci
npm run dev
```

Abra http://localhost:5173.

## Verificar

```sh
npm test
npm run typecheck
npm run build:pages
```

O build para GitHub Pages fica em `pages-dist/` e usa o prefixo `/rookivo/`. O `postinstall` copia os arquivos do Stockfish Lite para `public/engine/`, que é servido pelo site e incluído no build estático.

## Uso

- Digite um nick do Chess.com para consultar as partidas públicas, ou importe um PGN.
- Escolha uma partida, navegue pelos lances e use o tabuleiro para explorar variações.
- Clique em **Analisar partida** para ver avaliações, categorias aproximadas, precisão estimada e variantes.
- Abra **Treinador** para uma explicação local baseada na posição e nas variantes calculadas.
- Abra **Puzzles** para treinar com ou sem limite de tempo.

As categorias são heurísticas próprias e podem divergir da revisão oficial do Chess.com. A precisão oficial da API é mostrada quando está disponível; caso contrário, o projeto calcula uma estimativa local. O rating da partida também é uma estimativa experimental.

As peças são SVG originais inspiradas no estilo Staunton. A base de aberturas incluída em `data/openings/` deriva do projeto público lichess-org/chess-openings (CC0). Consulte `data/openings/COPYING.txt` e `public/engine/COPYING.txt` após a instalação para as licenças dos dados e do motor.
