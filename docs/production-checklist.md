# Publicacao do NexusTI

## 1. Variaveis da Vercel

Configure em Production, Preview e Development quando aplicavel:

- `NEXT_PUBLIC_SUPABASE_URL`: URL do projeto Supabase.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: chave `sb_publishable_...`.
- `NEXT_PUBLIC_SITE_URL`: dominio canonico HTTPS, sem barra no final.
- `SUPABASE_SECRET_KEY`: chave `sb_secret_...`, somente no servidor.

Nunca use a chave secreta com o prefixo `NEXT_PUBLIC_` e nunca a grave no Git.

## 2. Supabase Auth

Em Authentication:

1. Desative novos cadastros publicos por e-mail.
2. Mantenha Email + Password habilitado para login dos convidados.
3. Defina o tamanho minimo da senha como 8 caracteres.
4. Ative protecao contra senhas vazadas, se disponivel no plano.
5. Mantenha o JWT em 1 hora e a deteccao de reutilizacao de refresh token ativa.
6. Configure o Site URL com o mesmo valor de `NEXT_PUBLIC_SITE_URL`.
7. Adicione `https://SEU-DOMINIO/auth/confirm` nas Redirect URLs.
8. Ative as notificacoes de alteracao de senha.

Para uma aplicacao interna, MFA por aplicativo autenticador e CAPTCHA/Turnstile sao recomendados, especialmente para administradores e recuperacao de senha.

## 3. SMTP e mensagens

Configure SMTP proprio antes de enviar os convites. O SMTP padrao do Supabase e limitado e nao e indicado para producao.

No template **Invite user**, use um link server-side:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/definir-senha">
  Criar minha senha do NexusTI
</a>
```

No template **Reset password**, use:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/redefinir-senha">
  Redefinir minha senha do NexusTI
</a>
```

Desative rastreamento de links no provedor SMTP para evitar que a URL de autenticacao seja reescrita.

## 4. Ordem segura de entrada em producao

1. Aplique todas as migrations e execute os advisors de seguranca e desempenho.
2. Configure dominio, Redirect URLs, SMTP, templates e variaveis da Vercel.
3. Mantenha temporariamente o administrador atual.
4. Na tela **Equipe**, convide primeiro o administrador definitivo.
5. O novo administrador deve aceitar o convite, criar sua senha e validar o acesso.
6. Convide os tecnicos e valide pelo menos uma conta de cada perfil.
7. Limpe chamados, movimentacoes, equipamentos, solicitantes e setores de teste.
8. Remova contas de teste somente depois de confirmar o novo administrador.
9. Gere um novo deploy de producao e execute o teste completo de login e RLS.

## 5. Verificacao final

- Cadastro publico nao aparece e esta desativado no Supabase.
- Um tecnico nao consegue consultar chamados de outro tecnico pela API.
- Apenas administradores acessam `/equipe` e enviam convites.
- Convite e recuperacao chegam pelo dominio SMTP configurado.
- As senhas nunca passam pelo banco `public`; ficam sob responsabilidade do Supabase Auth.
- `.env.local`, chaves e arquivos da Vercel continuam ignorados pelo Git.
