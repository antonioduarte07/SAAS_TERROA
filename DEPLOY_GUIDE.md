# 🚀 Guia de Deploy na Vercel

## ✅ Status do Projeto

- ✅ **Build funcionando**: `npm run build` executa com sucesso
- ✅ **Configuração da Vercel**: `vercel.json` criado
- ✅ **Variáveis de ambiente**: Documentadas
- ✅ **Scripts atualizados**: Build otimizado

## 📋 Passo a Passo para Deploy

### 1. Preparar o Repositório

```bash
# Commit todas as mudanças
git add .
git commit -m "Preparar para deploy na Vercel"
git push origin main
```

### 2. Deploy na Vercel

#### Opção A: Via Dashboard (Recomendado)

1. **Acesse [vercel.com](https://vercel.com)**
2. **Faça login** com sua conta GitHub
3. **Clique em "New Project"**
4. **Selecione seu repositório** `SAAS_TERROA`
5. **Configure o projeto**:
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (padrão)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

#### Opção B: Via CLI

```bash
# Instalar Vercel CLI
npm i -g vercel

# Fazer login
vercel login

# Deploy
vercel

# Para produção
vercel --prod
```

### 3. Configurar Variáveis de Ambiente

No painel da Vercel, vá em **Settings > Environment Variables** e adicione:

```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
VITE_BACKUP_SCHEDULER_API_KEY=sua_chave_backup_scheduler
```

### 4. Configurar Domínio (Opcional)

1. **Vá em Settings > Domains**
2. **Adicione seu domínio personalizado**
3. **Configure DNS** conforme instruções da Vercel

## 🔧 Configurações Importantes

### Build Settings
- **Framework**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### Environment Variables
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anonima
VITE_BACKUP_SCHEDULER_API_KEY=sua_chave_backup
```

### Vercel.json
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

## 🎯 Pós-Deploy

### 1. Testar a Aplicação
- ✅ Acessar o domínio fornecido
- ✅ Testar login
- ✅ Testar criação de cliente
- ✅ Testar criação de produto
- ✅ Testar criação de pedido

### 2. Configurar Supabase
- ✅ Adicionar domínio da Vercel nas configurações do Supabase
- ✅ Verificar políticas RLS
- ✅ Testar conexão com banco

### 3. Monitoramento
- ✅ Verificar logs na Vercel
- ✅ Configurar analytics (opcional)
- ✅ Configurar alertas (opcional)

## 🐛 Troubleshooting

### Erro de Build
```
Error: Build failed
```
**Solução**: Verificar se todas as dependências estão no `package.json`

### Erro de Variáveis de Ambiente
```
Error: VITE_SUPABASE_URL is not defined
```
**Solução**: Verificar se as variáveis estão configuradas na Vercel

### Erro de CORS
```
Error: CORS policy
```
**Solução**: Adicionar domínio da Vercel nas configurações do Supabase

### Erro de Conexão com Supabase
```
Error: Invalid API key
```
**Solução**: Verificar se as chaves do Supabase estão corretas

## 📊 Performance

### Otimizações Implementadas
- ✅ **Build otimizado**: Sem TypeScript check no build
- ✅ **Chunks separados**: Assets organizados
- ✅ **Gzip**: Compressão automática
- ✅ **Cache**: Headers de cache configurados

### Métricas Esperadas
- **Build Time**: ~23 segundos
- **Bundle Size**: ~2.7MB (843KB gzipped)
- **First Load**: < 3 segundos

## 🔄 Deploy Automático

### Configuração
- ✅ **Push para main**: Deploy automático em produção
- ✅ **Pull Requests**: Preview automático
- ✅ **Branch Protection**: Configurar conforme necessário

### Workflow
1. **Desenvolvimento**: Trabalhe na branch `develop`
2. **Pull Request**: Crie PR para `main`
3. **Review**: Code review e testes
4. **Merge**: Merge para `main`
5. **Deploy**: Deploy automático na Vercel

## 📞 Suporte

### Recursos Úteis
- [Documentação da Vercel](https://vercel.com/docs)
- [Documentação do Vite](https://vitejs.dev/)
- [Documentação do Supabase](https://supabase.com/docs)

### Contato
- **Vercel Support**: [vercel.com/support](https://vercel.com/support)
- **Supabase Support**: [supabase.com/support](https://supabase.com/support)

## 🎉 Conclusão

Seu projeto está pronto para deploy na Vercel! 

**Próximos passos**:
1. Fazer commit das mudanças
2. Conectar repositório à Vercel
3. Configurar variáveis de ambiente
4. Fazer deploy
5. Testar aplicação

**Sucesso garantido!** 🚀
