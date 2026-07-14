# Agente rastreador de recibos

Este agente local vigia uma pasta do computador e cria pendencias de conferencia para recibos novos em PDF ou imagem. Ele nao contabiliza a venda sozinho: o recibo aparece no formulario do app, voce confere, escolhe a origem e clica em cadastrar.

## Como configurar

1. Copie `.env.agent.example` para `.env.agent`.
2. Preencha `AGENT_USER_EMAIL` e `AGENT_USER_PASSWORD` com um usuario funcionario ativo.
3. Ajuste `RECIBOS_WATCH_DIR` para a pasta onde os recibos vao cair.
4. Instale as dependencias com `npm install`.
5. Publique as regras atualizadas do Firestore:

```bash
firebase deploy --only firestore:rules
```

Sem esse passo, o agente pode mostrar `Missing or insufficient permissions`.

## Como rodar

Rodar continuamente:

```bash
npm run agent:recibos
```

Processar uma vez e encerrar:

```bash
npm run agent:recibos -- --once
```

Testar sem gravar pendencias no Firestore:

```bash
npm run agent:recibos -- --once --dry-run
```

Escolher uma pasta pela linha de comando:

```bash
npm run agent:recibos -- --dir "C:\Recibos JB"
```

## Como ele evita duplicidade

Cada arquivo recebe um hash (`reciboHash`). O agente guarda os hashes processados em `.jb-store-agent/processados.json` e tambem consulta o Firestore antes de criar uma nova pendencia.

## Fluxo no app

1. Coloque o recibo na pasta configurada.
2. O agente le o arquivo e cria uma pendencia.
3. Abra o dashboard do funcionario.
4. O formulario sera preenchido com cliente, objeto vendido, desconto e valor.
5. Escolha a origem da venda.
6. Confira os campos e clique em `CADASTRAR`.

So depois desse clique a venda entra nos graficos.

## Formatos aceitos

- PDF com texto
- PNG
- JPG/JPEG
- WEBP

PDF puramente escaneado pode exigir conversao para imagem antes de cair na pasta.
