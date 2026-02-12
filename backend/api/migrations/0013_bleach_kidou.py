from django.db import migrations, models
import django.db.models.deletion


def seed_bleach_spells(apps, schema_editor):
    BleachSpell = apps.get_model('api', 'BleachSpell')
    if BleachSpell.objects.exists():
        return

    spells = [
        # Hadou - Tier 1 (4.000 P.A)
        {
            'name': 'Shou (Verdade)',
            'number': 1,
            'spell_type': 'hadou',
            'tier': 1,
            'pa_cost': 4000,
            'effect': 'Empurra o oponente para longe sem causar muitos danos.',
            'incantation': (
                'Oh, poderosas palavras dos seres superiores, oh entidades divinas que tudo sabem que '
                'tudo vêem, mostrem a dor aos descrestes, o poder infinito da alma!'
            ),
        },
        {
            'name': 'Byakurai (Trovão branco)',
            'number': 4,
            'spell_type': 'hadou',
            'tier': 1,
            'pa_cost': 4000,
            'effect': 'Atira um trovão do dedo indicador.',
            'incantation': (
                'Oh, dominador! A máscara de carne e sangue, todas as formas, bata suas asas! '
                'Aqueles que foram coroados com o nome "homem". A luz que parte ao meio sonhos '
                'e esperanças! Uma nova luz aparecerá e acabará perfurando as trevas!'
            ),
        },
        {
            'name': 'Tsuzuri Raiden (Relâmpago iminente)',
            'number': 11,
            'spell_type': 'hadou',
            'tier': 1,
            'pa_cost': 4000,
            'effect': (
                'Uma corrente elétrica é capaz de fluir através que qualquer objeto tocado pelo usuário, '
                'qualquer outra pessoa que tocar nesse objeto é atingido pela corrente elétrica.'
            ),
            'incantation': (
                'Venha a mim a energia da alma, aquele que crê em si mesmo poderá alcançar o infinito...'
                'Oh bestas dos relâmpagos, seres que comandam o universo, transforme minha força em raios '
                'e usem-na como instrumento da justiça!'
            ),
        },
        {
            'name': 'Shoutenkyu (Tempo verdadeiro aberto)',
            'number': 20,
            'spell_type': 'hadou',
            'tier': 1,
            'pa_cost': 4000,
            'effect': (
                'Uma Esfera azul média sai das mãos do shinigami, que o joga direto no oponente. '
                'Essa esfera é feita de reiatsu condensado e quando bate com o oponente explodi, paralisando-o.'
            ),
            'incantation': (
                'Grande esfera mística, conjurai sua força e impedirei a evolução repentina do mal sobre '
                'nosso mundo, brilho azul, esmague e prenda!'
            ),
        },
        # Hadou - Tier 2 (8.000 P.A)
        {
            'name': 'Goenzai (Voz estocanda)',
            'number': 29,
            'spell_type': 'hadou',
            'tier': 2,
            'pa_cost': 8000,
            'effect': (
                'O Shinigami solta uma roda de chamas que vai subindo e girando, podendo ser usado como '
                'barreira ou ataque. O fogo irá parar de subir quando voce parar também. No final o fogo '
                'se espalhará para os lados.'
            ),
            'incantation': (
                'Chamas imperdoáveis, proteja seus aliados e afete seus inimigos, espalhando as chamas em '
                'um circulo divino, nenhum escapará, suba até o infinito'
            ),
        },
        {
            'name': 'Shakkahou (Canhão de fogo vermelho)',
            'number': 31,
            'spell_type': 'hadou',
            'tier': 2,
            'pa_cost': 8000,
            'effect': 'Joga uma bola espiritual vermelha no oponente.',
            'incantation': (
                'Oh, dominador! A máscara de carne e sangue, todas as formas, bata suas asas! '
                'Aqueles que foram coroados com o nome "homem". Chama ardente e guerra turbulenta, '
                'separa os oceanos, se eleva e cai, caminha em frente em direção ao sul!'
            ),
        },
        {
            'name': 'Oukasen (Raio de chama amarelo)',
            'number': 32,
            'spell_type': 'hadou',
            'tier': 2,
            'pa_cost': 8000,
            'effect': 'Joga uma bola espiritual amarela no oponente.',
            'incantation': (
                'Oh, dominador! A máscara de carne e sangue, todas as formas, bata suas asas! '
                'Aqueles que foram coroados com o nome "homem". Sol do submundo, renasça em um novo '
                'amanhecer e ofusque a alma dos meus adversários!'
            ),
        },
        {
            'name': 'Soukatsui (Bola de fogo azul)',
            'number': 33,
            'spell_type': 'hadou',
            'tier': 2,
            'pa_cost': 8000,
            'effect': 'Joga uma bola de energia espiritual azul no oponente.',
            'incantation': (
                'Oh, dominador! A máscara de carne e sangue, todas as formas, bata suas asas! '
                'Aqueles que foram coroados com o nome "homem". Verdade e moderação, cravai suas garras '
                'no muro dos sonhos inocentes!'
            ),
        },
        {
            'name': 'Kongoubaku (Material duro explosivo)',
            'number': 34,
            'spell_type': 'hadou',
            'tier': 2,
            'pa_cost': 8000,
            'effect': (
                'Na ponta da arma em que os shinigami segura, seja ela sua zanpakutou ou outra, forma-se '
                'uma grande bola aparentemente de fogo que concentra muita quantidade de energia em pouco espaço. '
                'O shinigami então movimenta-se e atira essa grande bola de energia vermelha em direção ao inimigo. '
                'A esfera de energia explode com um bom poder destrutivo e é capaz de causar queimaduras se acertar '
                'o alvo em cheio.'
            ),
            'incantation': (
                'Esfera macica ardente, sufocas os germes de dentro do material putrefado que reside no centro '
                'da criação. O magma vermelho se eleva até explodir na boca de um vulcão furioso!'
            ),
        },
        # Hadou - Tier 3 (11.000 P.A)
        {
            'name': 'Gakirekkou (Luz destrutiva)',
            'number': 49,
            'spell_type': 'hadou',
            'tier': 3,
            'pa_cost': 11000,
            'effect': (
                'Forma-se um grande círculo de energia verde em frente ao usuário rapidamente. Dele, dezenas '
                'filetes de reiatsu em forma de uma luz cortante vão partindo em direção ao inimigo como uma '
                'metralhadora, tornando a possibilidade de fulga do alvo mínima.'
            ),
            'incantation': (
                'Variancias do universo, peguem a lanterna da sabedoria, com toda a soberania mergulhem '
                'o caveleiro e sua lança na taça do maravilhoso paraíso!'
            ),
        },
        {
            'name': 'Haien (Fogo da perda)',
            'number': 54,
            'spell_type': 'hadou',
            'tier': 3,
            'pa_cost': 11000,
            'effect': 'Uma pequena esfera de fogo que é capaz de queimar qualquer coisa.',
            'incantation': (
                'Eu te convoco dragão infernal, aquele que comanda as chamas do inferno, ser poderoso que nada '
                'teme, mostre-nos seu poder. Oh, fogo infernal que reside no ódio dos desesperados, mostre-nos '
                'a dor do inferno, queime meu inimigo até a morte!'
            ),
        },
        {
            'name': 'Tenran (Orquídea Alda)',
            'number': 58,
            'spell_type': 'hadou',
            'tier': 3,
            'pa_cost': 11000,
            'effect': 'Um poderoso tornado é lançado contra o oponente.',
            'incantation': (
                'Aquele é o senhor dos ventos, deus dos céus. O vento que cruza de Norte ao Sul, Leste ao '
                'oeste, caminhe até a minha direção, elevando tudo ao limite!'
            ),
        },
        {
            'name': 'Raikouhou (Canhão do rugido do trovão)',
            'number': 63,
            'spell_type': 'hadou',
            'tier': 3,
            'pa_cost': 11000,
            'effect': 'Invoca uma grande onda de energia que viaja em frente para aniquilar o alvo.',
            'incantation': (
                'Salpique os ossos da besta! Topo da torre, cristal vermelho, círculo de aço. Mova-se e faça '
                'o vento. Pare e traga a calmaria. O som das lanças hostis preenche o castelo vazio!'
            ),
        },
        # Hadou - Tier 4 (15.000 P.A)
        {
            'name': 'Souren Soukatsui (Bola de fogo azul gêmea)',
            'number': 73,
            'spell_type': 'hadou',
            'tier': 4,
            'pa_cost': 15000,
            'effect': (
                'Cria uma bola azul de energia espiritual parecida com o Soukatsui normal, a diferença é que '
                'se utiliza muito mais reiatsu e as duas mãos e cria um ataque mais devastador.'
            ),
            'incantation': (
                'Oh, dominador! A máscara de carne e sangue, todas as formas, bata suas asas! Aqueles que foram '
                'coroados com o nome "homem". Sobre a parede da chama azul, crave a Lótus Gêmea. '
                'No abismo do desespero, à espera do paraíso distante!'
            ),
        },
        {
            'name': 'Hyougaseiran (Tempestade avassaladora de gelo)',
            'number': 78,
            'spell_type': 'hadou',
            'tier': 4,
            'pa_cost': 15000,
            'effect': (
                'Uma gigantesca, destruidora e avassalodora avalanche de gelo em crida e lançada violentamente '
                'em direção ao inimigo, podendo congelar o mesmo e causar muitos danos.'
            ),
            'incantation': (
                'Aos Mares em fúria, À Sibéria congelante, às lágrimas das valquírias que choram pela morte de '
                'Odin, purifique todo o caminho sujo pela frente e revele pureza que existe num mundo mortal!'
            ),
        },
        {
            'name': 'Hiriougeki Zoku Shinten Raihou (Notavél dragão voador, terremoto divino, canhão de luz)',
            'number': 88,
            'spell_type': 'hadou',
            'tier': 4,
            'pa_cost': 15000,
            'effect': 'Atira um grande e denso raio de puro poder espiritual no oponente.',
            'incantation': (
                'Pelos poderes da terra, levantem sua ordem e controlem o dragão, do qual a força se expalha '
                'dividindo o mundo em 6 formas diferentes, Água/Terra/Fogo/Vento/Luz/ e Trevas, a luz se '
                'condença e a energia se amplia como um canhão, que a irá da terra esteja ao meu comando '
                'como um terremoto. Furia dos ventos, desespero do fogo, forças da agua, impacto das trevas, Apareçam!'
            ),
        },
        # Hadou - Tier 5 (20.000 P.A)
        {
            'name': 'Kurohitsugi (Sarcófago negro)',
            'number': 90,
            'spell_type': 'hadou',
            'tier': 5,
            'pa_cost': 20000,
            'effect': (
                'Hadou de dano massivo, pórem tem um segundo efeito, se o adversário sobreviver ao dano, '
                'sua reiatsu é selada nas mãos e este recebe um segundo dano, a quantidade deste é baseada '
                'na sua reiatsu (Quanto maior a reiatsu do adversário, maior o dano).'
            ),
            'incantation': (
                'Limite de milhares, incapaz de tocar nas trevas, tiro a mão para refletir o seu azul, '
                'a estrada que aquece nas luzes, o vento que inflama as brasas, e o tempo que nos reúne. '
                'Quando todos ouçam minha ordem, bala de luz, oito corpos, nove itens, livro dos céus, '
                'tesouro mórbido, grande roda, torre da fortaleza cinza, objetivo longe de dispersão '
                'luminosa e limpa quando acionada!'
            ),
        },
        {
            'name': 'Ittoukasou (Espada cremadora)',
            'number': 96,
            'spell_type': 'hadou',
            'tier': 5,
            'pa_cost': 20000,
            'effect': (
                'Converte todo poder espiritual do usuário em uma chama espiritual amplificando e causando o '
                'dano. O corpo do usuário é utilizado como catalizador para o kidou, resultando na perda de '
                'um dos membros o qual o kidou é utilizado devido a grande pressão espiritual sobre o membro '
                'O dano equivale 10 vezes a reiatsu do adversário.'
            ),
            'incantation': '-/-',
        },
        # Bakudou - Tier 1 (4.000 P.A)
        {
            'name': 'Sai (Obstruçao)',
            'number': 1,
            'spell_type': 'bakudou',
            'tier': 1,
            'pa_cost': 4000,
            'effect': 'Paralisa os músculos do alvo.',
            'incantation': (
                'Senhor, as almas envolvem tudo e a todos, onde não se pode ver, alguma obstrução ocorre, '
                'te peço, me dê seu poder e me mostre a negação de Deus!'
            ),
        },
        {
            'name': 'Hainawa (Corda rastejante)',
            'number': 4,
            'spell_type': 'bakudou',
            'tier': 1,
            'pa_cost': 4000,
            'effect': 'Amarra o adversário através de uma corda de energia.',
            'incantation': (
                'Oh grande Deus, me empreste seus poderes para selar as almas indesejáveis, me ajude meu senhor, '
                'prenda aqueles que não acreditam no bem maior!'
            ),
        },
        {
            'name': 'Seki (Repulsão)',
            'number': 8,
            'spell_type': 'bakudou',
            'tier': 1,
            'pa_cost': 4000,
            'effect': 'Cria um escudo redondo de 10cm capaz de repelir ataques físicos.',
            'incantation': (
                'Oh Grande escudo , me defenda das catástrofes, me ajude a batalhar até o fim, bloqueie esse '
                'ataque e me ajude a vencer!'
            ),
        },
        {
            'name': 'Geki (Conquista)',
            'number': 9,
            'spell_type': 'bakudou',
            'tier': 1,
            'pa_cost': 4000,
            'effect': 'Desenhando um símbolo no ar, o alvo é preso sentindo muita dor, podendo matá-lo.',
            'incantation': 'Desintegre-se, cão negro de Rondanini! Olhe para si mesmo em terror e rasge sua própria garganta!',
        },
        {
            'name': 'Hörin (Círculo desintegrador)',
            'number': 10,
            'spell_type': 'bakudou',
            'tier': 1,
            'pa_cost': 4000,
            'effect': (
                'Faz com que uma corda laranja com padrões em espiral amarela para exploda a partir da mão do '
                'usuário e para tentar interceptar um alvo. O kidou formado permanece nas mãos do usuário, '
                'permitindo-lhes controlar o caminho pelo qual ele segue, antes e após a captura. O Kidou é '
                'capaz de se conectar com outro de si mesmo se ambos conquistaram um alvo e vincular-los um ao outro.'
            ),
            'incantation': (
                'Deuses correntes das almas domem a violência trazendo a calma, capture e anule o mal inimigo. '
                'Espiral laranja reluzente, silencie!'
            ),
        },
        {
            'name': 'Fushibi (Chama oculta)',
            'number': 12,
            'spell_type': 'bakudou',
            'tier': 1,
            'pa_cost': 4000,
            'effect': (
                'O usuario pode criar uma fina rede de reiatsu quase não vista a olho nu. Quando alguém toca '
                'nela, ela é revelada por completo. Essa rede prende a vitima por alguns instantes e pode '
                'armazenar hadous a desejo de seu dono.'
            ),
            'incantation': (
                'Tecelãs do destino eu as suplico. Oh, Moiras supremas que tudo tecem emprestem-me seu tear '
                'para que eu possa tecer os fios da vida dos meus inimigos com a chama da dor!'
            ),
        },
        # Bakudou - Tier 2 (8.000 P.A)
        {
            'name': 'Sekienton (Fumaça vermelha)',
            'number': 21,
            'spell_type': 'bakudou',
            'tier': 2,
            'pa_cost': 8000,
            'effect': (
                'Utilizando as duas mãos sob uma base (chão ou camada espirtual no ar.) o usuário cria uma '
                'grande quantidade de fumaça vermelha.'
            ),
            'incantation': (
                'Pó vermelho, emerge além das planícies. Oh senhor, aos olhos desapareço, perdoe meu uso, '
                'beneficie a fuga!'
            ),
        },
        {
            'name': 'Kyokkou (Luz curvada)',
            'number': 26,
            'spell_type': 'bakudou',
            'tier': 2,
            'pa_cost': 8000,
            'effect': 'Utilizando a luz ambiente, pode disfarçar pequenas quantias de reiatsu, tornando dificil a visualização.',
            'incantation': (
                'Oh, seres da luz, majestosa divindade dos humanos, mostre-me sua luz para que eu posso cegar '
                'meus inimigos e aplicar-lhes a justiça divina do juízo final!'
            ),
        },
        {
            'name': 'Shitotsu Sansen (Perfuração de três pontas)',
            'number': 30,
            'spell_type': 'bakudou',
            'tier': 2,
            'pa_cost': 8000,
            'effect': (
                'Três raios de luz são criados e lançados contra o oponente, cada raio fixa uma parte do corpo '
                'do oponente numa superfície, os raios de luz formam a figura de um triangulo invertido.'
            ),
            'incantation': (
                'Três divinos, perfure o mal dividido, encare as consequências que o simbolo triangular irá te '
                'fazer, perfurando-te com toda força, venha'
            ),
        },
        {
            'name': 'Tsuriboshi (Estrela suspensa)',
            'number': 37,
            'spell_type': 'bakudou',
            'tier': 2,
            'pa_cost': 8000,
            'effect': (
                'Cria um colchão de Reiatsu com o formato de uma estrela cujo é fixado em objetos próximos por '
                'cordas de Reiatsu, pode parar objetos que estejam caindo e atuar como um colchão de segurança.'
            ),
            'incantation': (
                'A noite cai em total escuridão, trazendo desgraças ou felicidade. A luz tras o caminho da '
                'esperança. A estrela agora sera minhas mãos, assim podemos segurar o ódio e insegurança!'
            ),
        },
        {
            'name': 'Enkosen (Escudo arqueiro)',
            'number': 39,
            'spell_type': 'bakudou',
            'tier': 2,
            'pa_cost': 8000,
            'effect': 'Cria um escudo de Reiatsu condensada capaz de deter ataques inimigos.',
            'incantation': (
                'Zanjutsu e Reiatsu, duas artes para a luta, gritai sua fúria de reiatsu onde se combate o '
                'Zanjutsu mais forte, um escudo condensado eu ponho sobre isto!'
            ),
        },
        {
            'name': 'Hachigyousousai',
            'number': 42,
            'spell_type': 'bakudou',
            'tier': 2,
            'pa_cost': 8000,
            'effect': (
                'Cria uma barreira em torno de uma construção. Pessoas que não tiverem uma grande energia '
                'espiritual não poderão enxergar a barreira e quem a perceber, dificilmente conseguirá quebrá-la.'
            ),
            'incantation': 'Barreira espiritual, seu poder de proteção eu chamo, sem destruição, reinvidico a defesa interior!',
        },
        # Bakudou - Tier 3 (11.000 P.A)
        {
            'name': 'Kakushitsuijaku (Seis estradas da prisão de luz)',
            'number': 58,
            'spell_type': 'bakudou',
            'tier': 3,
            'pa_cost': 11000,
            'effect': 'Localiza qualquer força espiritual.',
            'incantation': 'Coração do Sul, olho do Norte, dedo do Oeste, pé do Leste, cheguem com o vento, e partam com a tempestade!',
        },
        {
            'name': 'Kyoumon',
            'number': 60,
            'spell_type': 'bakudou',
            'tier': 3,
            'pa_cost': 11000,
            'effect': (
                'Cria uma barreira de "vidro", que é muito difícil de ser quebrada pelo lado de fora, mas '
                'facilmente quebrada pelo lado de dentro.'
            ),
            'incantation': (
                'Proteção, meu dever de proteger o bem, só poderá ser negado pelo outro, alma do bem ou mau, '
                'conjure sua proteção!'
            ),
        },
        {
            'name': 'Rikujyoukouro (Seis estradas da prisão de luz)',
            'number': 61,
            'spell_type': 'bakudou',
            'tier': 3,
            'pa_cost': 11000,
            'effect': 'Prende o oponente com seis raios de luz, anulando seus movimentos.',
            'incantation': 'Carruagem do trovão. Ponte da roda que gira. Com a luz divida-o em seis!',
        },
        {
            'name': 'Hyapporankan (Centenas Pregas de Luz)',
            'number': 62,
            'spell_type': 'bakudou',
            'tier': 3,
            'pa_cost': 11000,
            'effect': (
                'Uma única vara de Reiatsu é formada e arremessada contra o oponente, logo a vara se desintegra '
                'em incontáveis varas mais curtas que cercam e prendem o oponente.'
            ),
            'incantation': (
                'Prenda esse demonio indesejável, purifique sua alma, use a luz para limpar a grande descarga '
                'de maldade presente nesse local, materialize sua lança, prenda o mal!'
            ),
        },
        {
            'name': 'Sajou Sabaku (Correntes do Selamento)',
            'number': 63,
            'spell_type': 'bakudou',
            'tier': 3,
            'pa_cost': 11000,
            'effect': (
                'Correntes são invocadas e prendem os braços do oponente junto ao corpo, foi dito que um '
                'Bakudou de Nível 60 não é possível de ser destruído somente com força física.'
            ),
            'incantation': (
                'Os demonios ja não podem mais agir com a força do dominador. As correntes prenderão seu corpo '
                'e o selo prenderá sua alma a desgraça. Ja não se pode mais mover, então caia em desespero!'
            ),
        },
        # Bakudou - Tier 4 (15.000 P.A)
        {
            'name': 'Tozansho (Cristal da montanha invertida)',
            'number': 73,
            'spell_type': 'bakudou',
            'tier': 4,
            'pa_cost': 15000,
            'effect': 'Cria uma barreira com o formato de uma pirâmide ao redor do usuário.',
            'incantation': (
                'Oh grande protetor, crie a base de 4 pontas e suba até o topo do infinito, onde se consegue '
                'ajuda e proteção divina!'
            ),
        },
        {
            'name': 'Gochuu Tekkan (Prisão dos cinco pilares de ferro)',
            'number': 75,
            'spell_type': 'bakudou',
            'tier': 4,
            'pa_cost': 15000,
            'effect': 'Usando esse Bakudou, cinco pilares de ferro se levantam, prendendo o que estiver entre eles.',
            'incantation': (
                'Paredes da areia de ferro, uma pagoda sacerdotal, vagalumes ardentes cobertos de ferro. '
                'Pilar estável, silêncioso até o fim!'
            ),
        },
        {
            'name': 'Tenteikuura (Rede celestial que supera os céus)',
            'number': 77,
            'spell_type': 'bakudou',
            'tier': 4,
            'pa_cost': 15000,
            'effect': 'Transmite uma mensagem para qualquer pessoa na dimensão.',
            'incantation': (
                'A rede preta e branca! 22 pontes! 66 coroas e cinturões, persiga, trovão distante, cume afiado, '
                'terra envolta, noite que se esconde, mar de nuvens, formação azul, complete o círculo e alcance os céus!'
            ),
        },
        {
            'name': 'Kuyou Shibari (Memorial dos enforcados)',
            'number': 79,
            'spell_type': 'bakudou',
            'tier': 4,
            'pa_cost': 15000,
            'effect': (
                'Cria oito buracos negros que emitem energia espiritual no espaço pessoal ao redor do alvo, '
                'com um nono buraco negro a se manifestar no centro do peito do alvo, selando-o.'
            ),
            'incantation': '-/-',
        },
        {
            'name': 'Danku',
            'number': 81,
            'spell_type': 'bakudou',
            'tier': 4,
            'pa_cost': 15000,
            'effect': (
                'Cria uma barreira de Reiatsu com o formato de uma parede retangular que é capaz de deter até '
                'Hadous de nível 89, dito ser uma técnica proibida.'
            ),
            'incantation': (
                'Oh senhor, enviai uma barreira imperial diante de mim, derrube as forças minimas e reduza esta '
                'força em vida, grande parede proibida, apareça!'
            ),
        },
        {
            'name': 'Dai Hachigyousousai',
            'number': 83,
            'spell_type': 'bakudou',
            'tier': 4,
            'pa_cost': 15000,
            'effect': (
                'Usada por Hachigen cria uma barreira em torno de uma construção. Pessoas que não tiverem uma '
                'grande energia espiritual não poderão enxergar a barreira em volta da construção, e quem perceber '
                'a barreira, dificilmente conseguirá quebrá-la.'
            ),
            'incantation': (
                'Grade espiritual, seu poder de proteção eu chamo vigorosamente, sem destruição, dê-me harmonia '
                'entre mim e uma mascara, reinvidico a magnifica proteção interior!'
            ),
        },
        # Bakudou - Tier 5 (20.000 P.A)
        {
            'name': 'Kin (Selo)',
            'number': 99,
            'spell_type': 'bakudou',
            'tier': 5,
            'pa_cost': 20000,
            'effect': 'Prende o braço de um oponente com hastes espirituas de ferro.',
            'incantation': 'Prende o braço de um oponente com hastes espirituas de ferro!',
        },
        {
            'name': 'Bankin (Grande Selo)',
            'number': 99,
            'spell_type': 'bakudou',
            'tier': 5,
            'pa_cost': 20000,
            'effect': (
                'A primeira música (Shiryuu) prende o oponente com ataduras, a segunda(Hyakurensan) o fura '
                'com hastes de metal compridas, a música final(Bankin Taihou) esmaga com um cubo de metal gigante.'
            ),
            'incantation': (
                'Oh Grande sabio, canções são uma grande fonte de poder.\n'
                'A primeira é a força intrigante, Aprisione.\n'
                'A segunda é composição da dor, traga as estacas seladoras e crave no corpo do inimigo.\n'
                "A terceira´ é composição da morte , ninguem escapa do grande peso divino. Afunde!"
            ),
        },
        # Kidou Proibidos
        {
            'name': 'Jikanteishi (Suspensão Temporal)',
            'number': None,
            'spell_type': 'forbidden',
            'tier': 0,
            'pa_cost': 0,
            'effect': (
                'Kidou proibído usado por Tessai Tsukabishi juntamente com Deslocamento Espacial. '
                'É um Kidou que paraliza o tempo em uma determinado área.'
            ),
            'incantation': (
                'Proibição, de uma passagem tranversal para a outra, haja tempo para tudo, deuses parem o tempo '
                'onde tudo atrapalha e permaneça assim até minha punição vim por liberar seu grande poder!'
            ),
        },
        {
            'name': "Kuukanten'i (Deslocamento Espacial)",
            'number': None,
            'spell_type': 'forbidden',
            'tier': 0,
            'pa_cost': 0,
            'effect': (
                'Um Kidou proibído usado por Tessai Tsukabishi juntamente com Suspensão Temporal para teleportar '
                'uma específica porção de espaço de um lugar para outro, teleportando até mesmo outros Kidous ativos.'
            ),
            'incantation': (
                'Ida e Vinda, onde a existencia tem limites, onde o céu toca o inferno, onde o mundo tem demais, '
                'lugares onde tudo acontece, lugares onde cujo não precise andar, demorar, lugares onde não tem '
                'atrapalhação ou coisas pior, Desloque!'
            ),
        },
        {
            'name': 'Shisoukeppu (Cerimônia da Morte com Ventos de Sangue)',
            'number': None,
            'spell_type': 'forbidden',
            'tier': 0,
            'pa_cost': 0,
            'effect': (
                'Este kidou é só pode ser feito em dupla. Para realizar este kidou, é necessário ter a permissão '
                'da central 46, que irá liberar o matrial para o uso desse kidou. Tratam-se de duas caixas que se '
                'dissolvem assim que o kidou vai ser realizado. Dentro das caixas, há uma espécie de duas grandes '
                'lanças, formando assim, quatro lanças. Os dois usuários então teem o objetivo de lançar tais lanças '
                'nos braços ou pernas do usuário. Após esse procedimento, a vítima tem uma lança em cada perna e em '
                'cada braço. Um dos shinigamis usuários ou os dois então conjuram o kidou liberando muita reiatsu para '
                'o kidou fazer efeito. Finalmente a vítima vai se desintegrando e correntes a envolvem junto com um '
                'caixão e as lanças que perfura o mesmo. A vítima então é aprisionada para sempre, sem grandes chances de volta.'
            ),
            'incantation': 'Não existe, por já ter um procedimento muito demorado para ser realizado!',
        },
    ]

    BleachSpell.objects.bulk_create([BleachSpell(**data) for data in spells])


def unseed_bleach_spells(apps, schema_editor):
    BleachSpell = apps.get_model('api', 'BleachSpell')
    BleachSpell.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0012_item_rarity_item_tags_session_map_data_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='BleachSpell',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=150)),
                ('number', models.IntegerField(blank=True, null=True)),
                ('spell_type', models.CharField(choices=[('hadou', 'Hadou'), ('bakudou', 'Bakudou'), ('forbidden', 'Kidou Proibido')], max_length=20)),
                ('tier', models.IntegerField(default=0)),
                ('pa_cost', models.IntegerField(default=0)),
                ('effect', models.TextField(blank=True, default='')),
                ('incantation', models.TextField(blank=True, default='')),
            ],
            options={
                'ordering': ['spell_type', 'number', 'name'],
            },
        ),
        migrations.AddField(
            model_name='character',
            name='bleach_kidou_tier',
            field=models.IntegerField(default=0),
        ),
        migrations.CreateModel(
            name='CharacterBleachSpell',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('mastery', models.IntegerField(default=1)),
                ('acquired_at', models.DateTimeField(auto_now_add=True)),
                ('character', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='bleach_spell_links', to='api.character')),
                ('spell', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='character_links', to='api.bleachspell')),
            ],
            options={
                'ordering': ['-acquired_at'],
                'unique_together': {('character', 'spell')},
            },
        ),
        migrations.CreateModel(
            name='BleachSpellOffer',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tier', models.IntegerField(default=0)),
                ('is_open', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('chosen_at', models.DateTimeField(blank=True, null=True)),
                ('character', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='bleach_spell_offers', to='api.character')),
                ('chosen_spell', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='bleach_spell_offers_chosen', to='api.bleachspell')),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='bleach_spell_offers_created', to='auth.user')),
                ('options', models.ManyToManyField(related_name='offers', to='api.bleachspell')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.RunPython(seed_bleach_spells, unseed_bleach_spells),
    ]
