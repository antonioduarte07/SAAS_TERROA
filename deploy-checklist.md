# ✅ Checklist de Deploy na Vercel

## 📋 Pré-Deploy

### 1. Preparação do Código
- [ ] Código commitado no GitHub
- [ ] Todas as dependências instaladas (`npm install`)
- [ ] Build local funcionando (`npm run build`)
- [ ] Testes passando (se houver)

### 2. Variáveis de Ambiente
- [ ] `VITE_SUPABASE_URL` configurada
- [ ] `VITE_SUPABASE_ANON_KEY` configurada
- [ ] `VITE_BACKUP_SCHEDULER_API_KEY` configurada (opcional)

### 3. Configuração do Supabase
- [ ] Projeto Supabase ativo
- [ ] Tabelas criadas e migrações aplicadas
- [ ] Políticas RLS configuradas
- [ ] Domínio configurado para produção (se necessário)

## 🚀 Deploy na Vercel

### 1. Conectar Repositório
- [ ] Acessar [vercel.com](https://vercel.com)
- [ ] Fazer login com GitHub
- [ ] Clicar em "New Project"
- [ ] Selecionar repositório do projeto
- [ ] Configurar nome do projeto

### 2. Configurar Build
- [ ] Framework: Vite (detectado automaticamente)
- [ ] Build Command: `npm run build`
- [ ] Output Directory: `dist`
- [ ] Install Command: `npm install`

### 3. Variáveis de Ambiente
- [ ] Adicionar `VITE_SUPABASE_URL`
- [ ] Adicionar `VITE_SUPABASE_ANON_KEY`
- [ ] Adicionar `VITE_BACKUP_SCHEDULER_API_KEY` (opcional)

### 4. Deploy
- [ ] Clicar em "Deploy"
- [ ] Aguardar build completar
- [ ] Verificar se não há erros
- [ ] Testar aplicação no domínio fornecido

## 🔧 Pós-Deploy

### 1. Testes
- [ ] Acessar aplicação
- [ ] Testar login
- [ ] Testar criação de cliente
- [ ] Testar criação de produto
- [ ] Testar criação de pedido
- [ ] Verificar se dados são salvos no Supabase

### 2. Configurações Adicionais
- [ ] Configurar domínio personalizado (opcional)
- [ ] Configurar analytics (opcional)
- [ ] Configurar monitoramento (opcional)

## 🐛 Troubleshooting

### Erros Comuns

#### Build Error
```
Error: Cannot find module
```
**Solução**: Verificar se todas as dependências estão no `package.json`

#### Environment Variables Error
```
Error: VITE_SUPABASE_URL is not defined
```
**Solução**: Verificar se as variáveis estão configuradas na Vercel

#### Supabase Connection Error
```
Error: Invalid API key
```
**Solução**: Verificar se as chaves do Supabase estão corretas

#### CORS Error
```
Error: CORS policy
```
**Solução**: Configurar domínio na Vercel no Supabase

## 📞 Suporte

Se encontrar problemas:
1. Verificar logs na Vercel
2. Verificar console do navegador
3. Verificar configurações do Supabase
4. Consultar documentação da Vercel
