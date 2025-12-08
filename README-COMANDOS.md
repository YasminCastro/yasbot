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
