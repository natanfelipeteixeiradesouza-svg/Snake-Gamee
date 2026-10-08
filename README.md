# Portal de Jogos

Coleção de jogos feitos com HTML, CSS e JavaScript puros.

## Jogos

| Jogo | Caminho |
|------|---------|
| Jogo da Cobrinha | `jogos/cobrinha/` |
| Tetris | `jogos/tetris/` |

## Estrutura

```
.
├── README.md
├── index.html            # página inicial com o cardápio de jogos
└── jogos/
    ├── cobrinha/
    │   ├── index.html
    │   ├── style.css
    │   └── script.js
    └── tetris/
        ├── index.html
        ├── style.css
        └── script.js
```

## Como rodar

Abra o `index.html` da raiz no navegador (não precisa de servidor nem instalação).

## Como adicionar um novo jogo

1. Crie `jogos/nome-do-jogo/` com `index.html`, `style.css` e `script.js`.
2. No `index.html` da raiz, copie um card e aponte o link para `jogos/nome-do-jogo/`.
3. No novo jogo, inclua um link de volta: `<a href="../../">← Menu de jogos</a>`.

> Use caminhos relativos (sem `/` no começo) para funcionar no GitHub Pages.