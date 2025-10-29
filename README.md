# Terroa Vendas

Sistema de gestão de vendas e pedidos para o agronegócio brasileiro, focado nas necessidades da Terroá.

## Tecnologias Utilizadas

- React + TypeScript
- Material-UI
- Supabase (Banco de dados e autenticação)
- React Query
- React Router
- React Hook Form
- Yup (validação)

## Requisitos

- Node.js 18 ou superior
- npm ou yarn

## Instalação

### Desenvolvimento Local

1. Clone o repositório:
```bash
git clone [URL_DO_REPOSITÓRIO]
cd SAAS_TERROA
```

2. Instale as dependências:
```bash
npm install
# ou
yarn install
```

3. Configure as variáveis de ambiente:
Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:
```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
VITE_BACKUP_SCHEDULER_API_KEY=sua_chave_api_backup
```

4. Execute o projeto em modo de desenvolvimento:
```bash
npm run dev
# ou
yarn dev
```

O projeto estará disponível em `http://localhost:5173`

### Deploy na Vercel

1. **Conecte seu repositório GitHub à Vercel**
2. **Configure as variáveis de ambiente** na Vercel
3. **Deploy automático** será feito a cada push

Veja a seção [Deploy](#deploy) para instruções detalhadas.

## Estrutura do Projeto

```
src/
  ├── components/     # Componentes reutilizáveis
  ├── pages/         # Páginas da aplicação
  ├── lib/           # Configurações e utilitários
  ├── types/         # Definições de tipos TypeScript
  ├── theme.ts       # Configuração do tema Material-UI
  ├── App.tsx        # Componente principal
  └── main.tsx       # Ponto de entrada da aplicação
```

## Funcionalidades

- Autenticação de usuários
- Gestão de clientes
- Gestão de produtos
- Gestão de pedidos
- Relatórios de vendas
- Cálculo de comissões
- Geração de PDF de pedidos

## Deploy

### Deploy na Vercel (Recomendado)

1. **Acesse [vercel.com](https://vercel.com)** e faça login
2. **Clique em "New Project"**
3. **Conecte seu repositório GitHub**
4. **Configure as variáveis de ambiente**:
   - `VITE_SUPABASE_URL`: URL do seu projeto Supabase
   - `VITE_SUPABASE_ANON_KEY`: Chave anônima do Supabase
   - `VITE_BACKUP_SCHEDULER_API_KEY`: Chave da API de backup (opcional)

5. **Clique em "Deploy"**

### Configuração das Variáveis de Ambiente

No painel da Vercel, vá em **Settings > Environment Variables** e adicione:

```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anonima
VITE_BACKUP_SCHEDULER_API_KEY=sua_chave_backup
```

### Deploy Automático

- ✅ **Push para main**: Deploy automático em produção
- ✅ **Pull Requests**: Preview automático
- ✅ **Domínio personalizado**: Disponível na Vercel

## Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes. 