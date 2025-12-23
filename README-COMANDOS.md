# Comandos do YasBot

## 📢 Comandos para Grupos

| Mensagem/Comando                   | Descrição                                                                | Restrição                                    |
| ---------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------- |
| `!all` ou `!todos`                 | Menciona todos os membros do grupo                                       | Todos (cooldown de 10 minutos)               |
| `oi`, `olá`, `oie`                 | Responde com saudação e um emoji que representa o tempo atual em Goiânia | Todos                                        |
| `oi`, `olá`, `oie`                 | Responde com saudação e uma frase chamando a pessoa de velha             | OLD_PEOPLE_NUMBERS                           |
| `gente`, `gebte`                   | Responde com uma mensagem aleatória tirando a pessoa                     | Grupos registrados (sexta 16h - domingo 19h) |
| `gente`, `gebte`                   | Responde com uma figurinha pedindo pra ficar em casa                     | GLAUCIA_NUMBER ou FERNANDO_NUMBER            |
| `vai chover?`                      | Responde com a probabilidade de chover em Goiânia hoje                   | Todos                                        |
| `vai chover?` + palavras especiais | Resposta especial para perguntas com certas palavras                     | Todos                                        |

## 👑 Comandos Admin (Grupos)

| Mensagem/Comando | Descrição                                    | Restrição     |
| ---------------- | -------------------------------------------- | ------------- |
| `@admin`         | Mostra lista de comandos administrativos     | Somente admin |
| `@add-group`     | Adiciona grupo à lista de grupos gerenciados | Somente admin |
| `@remove-group`  | Remove grupo da lista de grupos gerenciados  | Somente admin |

## 👥 Comandos de Gerenciamento de Usuários (Admin)

| Mensagem/Comando                              | Descrição                                                                    | Restrição     | Exemplo                                   |
| --------------------------------------------- | ---------------------------------------------------------------------------- | ------------- | ----------------------------------------- |
| `@usuario <número> <nome> <data_aniversário>` | Adiciona um novo usuário ao sistema                                          | Somente admin | `@usuario +55 62 8332-1120 Glaucia 16/12` |
| `@remover-usuario <número>`                   | Remove um usuário do sistema pelo número de telefone                         | Somente admin | `@remover-usuario 6283321120`             |
| `@usuarios`                                   | Lista todos os usuários cadastrados com nome, telefone e data de aniversário | Somente admin | `@usuarios`                               |

### 📋 Detalhes dos Comandos de Usuários

#### Adicionar Usuário (`@usuario`)

- **Formato**: `@usuario <número> <nome> <data_aniversário>`
- **Número**: Pode ser informado com ou sem código do país (+55), com espaços ou hífens
  - Exemplos válidos: `+55 62 8332-1120`, `6283321120`, `62 8332-1120`
- **Nome**: Pode conter espaços (ex: "Maria Silva")
- **Data de aniversário**: Formato `DD/MM` (ex: `16/12`, `01/01`)
- **Validações**:
  - O número deve conter DDD + 8 ou 9 dígitos
  - A data deve estar no formato DD/MM válido
  - Não permite adicionar usuários duplicados (mesmo número)

#### Remover Usuário (`@remover-usuario`)

- **Formato**: `@remover-usuario <número>`
- **Número**: Pode ser informado com ou sem código do país, com espaços ou hífens
- **Validações**:
  - Verifica se o usuário existe antes de remover
  - Retorna mensagem de erro se o usuário não for encontrado

#### Listar Usuários (`@usuarios`)

- **Formato**: `@usuarios`
- **Retorno**: Lista todos os usuários cadastrados mostrando:
  - Nome do usuário
  - Número de telefone
  - Data de aniversário (formato DD/MM)
- **Observação**: Se houver muitos usuários, a lista pode ser dividida em múltiplas mensagens

## 🎉 Comandos de Evento (Chat Privado)

| Mensagem/Comando               | Descrição                    | Restrição    |
| ------------------------------ | ---------------------------- | ------------ |
| `confirmar`                    | Confirma presença em evento  | Chat privado |
| `cancelar`                     | Cancela presença em evento   | Chat privado |
| `aniversário` ou `aniversario` | Mostra informações do evento | Chat privado |
| `localização` ou `localizacao` | Envia localização do evento  | Chat privado |
| `convite`                      | Envia convite do evento      | Chat privado |

## 👑 Comandos Admin de Evento (Chat Privado)

| Mensagem/Comando                                                                      | Descrição                                             | Restrição     |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------- |
| `@add-guest <nome> <numero>`                                                          | Adiciona convidado ao evento                          | Somente admin |
| `@remove-guest <numero ou nome>`                                                      | Remove convidado do evento                            | Somente admin |
| `@update-guest <nome> - vai? sim - recebeu convite? sim - é para enviar convite? sim` | Atualiza informações do convidado                     | Somente admin |
| `@get-guests`                                                                         | Lista todos os convidados com status                  | Somente admin |
| `@send-invitation`                                                                    | Envia convites para todos os convidados               | Somente admin |
| `@send-confirmation-reminder`                                                         | Envia lembrete de confirmação para quem não confirmou | Somente admin |

## 📝 Observações

- **Comandos de grupo**: Funcionam apenas em grupos do WhatsApp
- **Comandos de evento**: Funcionam apenas em chats privados (conversas individuais)
- **Comandos admin**: Requerem que o número do usuário esteja na lista `ADMIN_NUMBERS`
- **Grupos registrados**: Alguns comandos (como `gente`) só funcionam em grupos que foram adicionados via `@add-group`
- **Cooldown**: O comando `!all` tem um cooldown de 10 minutos por grupo
- **Horário**: O comando `gente` só funciona de sexta-feira às 16h até domingo às 19h

## 🤖 Funcionalidades Automáticas

- **Resumo diário**: Enviado automaticamente às 07:00 para grupos registrados
- **Previsão do tempo**: Enviada automaticamente às 06:00 para grupos registrados
- **Limpeza de mensagens**: Mensagens antigas são removidas automaticamente à meia-noite
- **Ping de status**: Enviado a cada 10 minutos para manter o bot online
