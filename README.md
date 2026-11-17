# condo-ai

Sistema de gestao condominial V1, desenvolvido com Next.js, TypeScript, Tailwind CSS e Supabase. Inclui autenticacao por link enviado por e-mail, onboarding do condominio e areas de trabalho adaptadas ao perfil do usuario.

## Funcionalidades

- Dashboard e gestao de condominios, blocos, unidades, moradores e veiculos.
- Cadastro e acompanhamento de visitantes e encomendas.
- Chamados de manutencao, cobrancas, comunicados e gestao de membros.
- Rateio de agua e gas por unidade, com divisao igual ou proporcional ao consumo, historico e controle de pagamento.
- Areas de lazer e reservas nao fazem parte desta versao.

## Requisitos e desenvolvimento

- Node.js 20 ou superior e npm.
- Um projeto Supabase configurado para autenticacao por e-mail.

1. Instale as dependencias: `npm install`.
2. Copie `.env.example` para `.env.local` e configure `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Inicie o servidor: `npm run dev`.

O cliente usa a chave publica do Supabase com RLS. A chave `service_role` nao e necessaria para a aplicacao e nunca deve ser exposta no navegador.

## Banco de dados

As migracoes SQL estao em `supabase/migrations/` e devem ser aplicadas em ordem em um banco novo. `supabase/seed.sql` destina-se somente a dados de desenvolvimento.

No projeto Supabase de producao usado pela V1, as migracoes 010 a 021 ja foram aplicadas e registradas com versoes timestamp. As migracoes 001 a 009 nao estao no historico remoto, e a migration 009 local nao representa integralmente o schema remoto. **Nao execute `supabase db push` nem altere manualmente o historico `supabase_migrations` nesse banco ate que essa divergencia seja reconciliada.** Preserve os dados existentes; use um banco isolado para validar a cadeia completa de migracoes.

As policies RLS limitam as consultas por condominio e perfil; moradores ficam restritos a sua unidade. Os RPCs de onboarding e vinculacao de membros usam `SECURITY DEFINER` para realizar operacoes controladas e validam a identidade, o papel e os dados relacionados. O Supabase Security Advisor sinaliza esses dois RPCs porque sao executaveis por usuarios autenticados; a permissao e intencional e deve continuar restrita a `authenticated`.

## Scripts

- `npm run dev`: inicia o servidor local.
- `npm run build`: cria a versao de producao e verifica tipos.
- `npm run start`: inicia a versao de producao.
