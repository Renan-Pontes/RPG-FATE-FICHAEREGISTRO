# FATE Forge - Mesa do Mestre

Sistema de RPG baseado em FATE Acelerado com atributos ocultos para campanhas de anime (JoJo, JJK, Bleach).

## 🎲 Funcionalidades

### Para Jogadores
- Criar personagem com nome, descrição e imagem
- Ver ficha (skills, habilidades, traços, poderes especiais)
- Gerenciar inventário (equipar, usar consumíveis)
- Transferir itens para outros jogadores
- Notas pessoais
- Rolar dados FATE com animação de cassino
- Usar Fate Points para "Mudar o Destino" (+4 garantido)

### Para o Mestre
- Criar campanhas (JoJo, JJK, Bleach, Genérico)
- Ver stats ocultos de todos os personagens
- Criar e gerenciar NPCs
- Distribuir itens
- Controlar Fate Points dos jogadores
- Projetar imagens para todos os jogadores
- Receber notificações de trocas e rolagens
- Ver total oculto das rolagens (base + bônus)

## 🎯 Sistema de Jogo

### Atributos Ocultos
Os 6 atributos (Força, Destreza, Vigor, Inteligência, Sabedoria, Carisma) são **invisíveis** para os jogadores. Apenas o mestre pode ver e modificar.

### Rolagem de Dados FATE
- 4 dados com faces: **-1**, **0**, **+1**
- Resultado varia de **-4** a **+4**
- Animação estilo "roleta de cassino"
- Jogador vê apenas o resultado dos dados
- Mestre vê: resultado + skill + atributo oculto

### Fate Points - "Mudar o Destino!"
- Gasta 1 ponto para transformar todos os dados em **+1** (total: **+4**)
- Também pode ser usado para manipular a narrativa

### Tipos de Campanha
| Tipo | Poder Especial |
|------|----------------|
| JoJo | Stands (com stats A-E) |
| Jujutsu Kaisen | Técnicas Amaldiçoadas |
| Bleach | Zanpakutou (Shikai/Bankai) |
| Genérico | Apenas Skills |

## 🚀 Como Executar

### Requisitos
- Python 3.10+
- Node.js 18+
- npm ou yarn

### Backend (Django)
```bash
cd backend

# Instalar dependências
pip install -r requirements.txt

# Rodar migrations
python manage.py migrate

# Criar superusuário (mestre)
python manage.py createsuperuser

# Iniciar servidor
python manage.py runserver
```

### Frontend (React + Vite)
```bash
cd frontend

# Instalar dependências
npm install

# Iniciar em desenvolvimento
npm run dev
```

### Acessar
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000/api/
- **Admin Django:** http://localhost:8000/admin/

## 👤 Configurar Mestre

1. Acesse o admin Django: http://localhost:8000/admin/
2. Faça login com o superusuário
3. Vá em **API > Profiles**
4. Edite o profile do usuário e marque **is_game_master**

## 📁 Estrutura

```
rpg-fate/
├── backend/
│   ├── api/
│   │   ├── models.py      # Modelos do banco
│   │   ├── serializers.py # Serializadores REST
│   │   ├── views.py       # Endpoints da API
│   │   └── urls.py        # Rotas
│   ├── backend/
│   │   └── settings.py    # Configurações Django
│   └── manage.py
│
└── frontend/
    ├── src/
    │   ├── components/    # Componentes React
    │   ├── context/       # AuthContext
    │   ├── pages/         # Páginas (Login, Campaigns, Campaign)
    │   ├── api.js         # Funções de API
    │   └── index.css      # Estilos globais
    └── package.json
```

## 🔄 Polling

O frontend atualiza automaticamente a cada **3 segundos**:
- Projeção do mestre (imagem)
- Notificações
- Rolagens recentes (para o mestre)

## 📝 API Endpoints

### Autenticação
- `POST /api/auth/register/` - Registrar
- `POST /api/auth/login/` - Login
- `GET /api/auth/me/` - Usuário atual

### Campanhas
- `GET/POST /api/campaigns/` - Listar/Criar
- `GET /api/campaigns/{id}/party/` - Ver party
- `GET /api/campaigns/{id}/npcs/` - Ver NPCs (mestre)
- `POST /api/campaigns/{id}/update_projection/` - Atualizar projeção
- `GET /api/campaigns/{id}/poll/` - Polling

### Personagens
- `GET/POST /api/characters/` - Listar/Criar
- `PATCH /api/characters/{id}/update_stats/` - Atualizar stats (mestre)
- `POST /api/characters/{id}/add_fate_point/` - Adicionar FP (mestre)
- `POST /api/characters/{id}/use_fate_point/` - Usar FP

### Itens
- `GET/POST /api/items/` - Listar/Criar
- `POST /api/items/{id}/transfer/` - Transferir
- `POST /api/items/{id}/equip/` - Equipar/Desequipar
- `POST /api/items/{id}/use/` - Usar consumível

### Rolagens
- `POST /api/rolls/` - Criar rolagem

## 🎮 Fluxo do Jogo

1. **Mestre** cria campanha e define tipo (JoJo, JJK, etc)
2. **Jogadores** criam seus personagens
3. **Mestre** distribui itens, skills e define stats ocultos
4. Durante a sessão:
   - Jogador descreve ação
   - Mestre pede rolagem
   - Jogador clica em "Rolar Dados" (com animação)
   - Pode usar Fate Point para garantir +4
   - Mestre vê resultado total com bônus ocultos
5. **Mestre** pode projetar imagens na tela principal
6. Trocas de itens são diretas mas notificam o mestre

---

Desenvolvido para sessões de RPG de mesa com tema anime 🎌
