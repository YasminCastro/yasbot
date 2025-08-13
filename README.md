# yasbot

Este projeto é um bot desenvolvido para automação de tarefas. Siga as instruções abaixo para rodar o projeto localmente.

## Pré-requisitos

- [Node.js 22.x](https://nodejs.org/) instalado
- [npm](https://www.npmjs.com/) ou [yarn](https://yarnpkg.com/) instalado
- [MongoDB](https://www.mongodb.com/) rodando e acessível

## Instalação

1. Clone o repositório:

   ```bash
   git clone https://github.com/seu-usuario/yasbot.git
   cd yasbot
   ```

2. Instale as dependências:

   ```bash
   npm install
   ```

   ou

   ```bash
   yarn install
   ```

3. Configure as variáveis de ambiente:

Crie um arquivo `.env` na raiz do projeto com o seguinte conteúdo:

```env
MONGO_URI=<sua_uri_mongodb>
DB_NAME=<nome_do_banco>
ADMIN_NUMBERS=62999999999,62988888888
```

## Como rodar em desenvolvimento

```bash
npm run dev
```

ou

```bash
yarn dev
```

## Autenticação o WhatsApp

Ao iniciar, será exibido um QR code no terminal. Escaneie com o Whatsapp para autenticar.

- Em caso de algum erro relacionado com a autenticação, ou caso queira autenticar novamente, basta deletar as pastas `.wwwebjs_auth` e `.wwwebjs_cache`.
