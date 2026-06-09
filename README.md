# WebCine Proxy & Custom Player

Este repositório contém um **Proxy Backend** completo em Node.js para o site `https://webcinevs2.com/` integrado com um **Player Frontend** premium e responsivo (estilo Netflix) para assistir a filmes, séries, temporadas, episódios e animes sem anúncios ou bloqueios de CORS/Referer.

## 🚀 Recursos
- **Autenticação Automática**: O backend conecta-se à API original usando o token fornecido (`AMECL7FZ`), salvando e renovando tokens de sessão JWT dinamicamente.
- **Bypass de Streaming**: A rota de stream oficial criptografada/de segurança do WebCine é resolvida no backend através do endpoint `/streaming/resolve-url` com a chave de sessão correspondente.
- **Seletor de Perfil**: Suporte a múltiplos perfis da conta original diretamente na interface.
- **Interface Premium**: Design com estética dark cyberpunk, gradientes em neon, modal de detalhes com seletor de episódios/temporadas e player com efeito **Backglow** neon.
- **Suíte de Testes**: Testes automatizados integrados que validam o fluxo completo de busca e reprodução.

## 📦 Como Usar

1. Clone o repositório e navegue até a pasta:
   ```bash
   git clone https://github.com/deivid22srk/webcine-proxy.git
   cd webcine-proxy
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Inicie o servidor local:
   ```bash
   npm start
   ```

4. Abra no navegador:
   `http://localhost:3000`

## 🧪 Como Executar os Testes

Para rodar os testes automatizados de integração:
```bash
npm test
```
