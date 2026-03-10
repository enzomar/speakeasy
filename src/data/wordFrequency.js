/**
 * wordFrequency.js — Compact frequency-sorted word lists for T9-style prediction.
 *
 * Each language has its most common ~500 words, ordered by frequency (index 0 = most common).
 * The array index doubles as an inverse-frequency rank: lower index → higher frequency.
 *
 * These are used by SmartKeyboard's T9 engine to disambiguate cluster-key sequences
 * and provide word completions. The n-gram prediction engine provides contextual
 * next-word predictions on top of this static frequency ordering.
 *
 * Coverage: ~500 words covers roughly 80-85% of everyday conversational vocabulary.
 * AAC-specific words (body parts, feelings, needs) are boosted into the lists.
 */

const EN = [
  // pronouns & determiners
  "i","you","he","she","it","we","they","me","my","your","his","her","our","their",
  "this","that","the","a","an","some","any","all","no","not","what","who","how","when",
  "where","why","which","much","many","more","most","very","too","also","just","only",
  // verbs (high frequency)
  "is","am","are","was","were","be","been","being","have","has","had","do","does","did",
  "will","would","can","could","shall","should","may","might","must",
  "go","come","get","make","take","give","see","know","think","want","need","like","love",
  "feel","say","tell","ask","help","try","use","find","put","let","keep","start","stop",
  "eat","drink","sleep","wake","sit","stand","walk","run","play","work","read","write",
  "open","close","turn","move","look","watch","listen","hear","speak","talk","call",
  "wait","hold","bring","send","buy","pay","show","leave","stay","live","die",
  // nouns (AAC essentials)
  "water","food","bathroom","bed","home","school","hospital","doctor","medicine","phone",
  "mom","dad","brother","sister","friend","teacher","baby","family","people","person",
  "name","time","day","night","morning","today","tomorrow","yesterday","now","later",
  "here","there","up","down","in","out","on","off","left","right","back","front",
  "yes","no","please","thank","sorry","hello","hi","bye","okay","good","bad",
  "happy","sad","angry","scared","tired","hungry","thirsty","sick","hurt","cold","hot",
  "big","small","new","old","first","last","next","same","different","other",
  "thing","something","everything","nothing","lot","bit","way","part","place","room",
  "hand","head","body","eye","mouth","ear","nose","arm","leg","foot","back","stomach",
  "car","bus","house","door","window","table","chair","book","money","clothes",
  // connectors & prepositions
  "and","or","but","if","so","because","than","then","about","with","without",
  "for","from","to","at","by","of","into","after","before","between","under","over",
  // adverbs & misc
  "again","always","never","sometimes","maybe","really","well","still","already",
  "enough","together","away","outside","inside","soon","fast","slow","hard","easy",
  // AAC communication
  "pain","comfortable","change","diaper","wheelchair","blanket","light","music",
  "tv","movie","game","toy","ball","dog","cat","animal","park","store","church",
  "breakfast","lunch","dinner","snack","juice","milk","coffee","tea",
  "shirt","pants","shoes","hat","coat","glasses",
  "number","color","red","blue","green","yellow","white","black",
  "one","two","three","four","five","six","seven","eight","nine","ten",
  "hundred","thousand","year","week","month","hour","minute","second",
];

const ES = [
  "yo","tú","él","ella","usted","nosotros","ellos","ellas","ustedes",
  "mi","tu","su","nuestro","este","ese","aquel","el","la","los","las","un","una",
  "qué","quién","cómo","cuándo","dónde","por","que","cual","mucho","poco","más","muy",
  "también","solo","no","sí","todo","nada","algo","cada","otro","mismo",
  "es","soy","eres","está","estoy","estás","fue","era","ser","estar","haber","tener",
  "hacer","ir","venir","poder","querer","saber","decir","dar","ver","poner",
  "deber","necesitar","gustar","sentir","pensar","creer","llamar","usar","buscar",
  "comer","beber","dormir","caminar","correr","jugar","trabajar","leer","escribir",
  "abrir","cerrar","hablar","escuchar","mirar","esperar","ayudar","intentar",
  "comprar","pagar","llevar","traer","salir","entrar","sentar","parar","empezar",
  "agua","comida","baño","cama","casa","escuela","hospital","doctor","medicina","teléfono",
  "mamá","papá","hermano","hermana","amigo","profesor","bebé","familia","persona","gente",
  "nombre","tiempo","día","noche","mañana","hoy","ayer","ahora","después","antes",
  "aquí","allí","arriba","abajo","dentro","fuera","izquierda","derecha","atrás","adelante",
  "por favor","gracias","perdón","hola","adiós","bien","mal",
  "feliz","triste","enojado","asustado","cansado","hambre","sed","enfermo","dolor","frío","calor",
  "grande","pequeño","nuevo","viejo","primero","último","siguiente","diferente",
  "cosa","algo","todo","nada","parte","lugar","manera","vez","momento",
  "mano","cabeza","cuerpo","ojo","boca","oído","nariz","brazo","pierna","pie","espalda",
  "coche","autobús","puerta","ventana","mesa","silla","libro","dinero","ropa",
  "y","o","pero","si","porque","entonces","con","sin","para","de","en","a","desde",
  "entre","sobre","bajo","después","antes","durante",
  "siempre","nunca","veces","quizás","ya","todavía","bastante","juntos","pronto",
  "rápido","lento","fácil","difícil","bueno","malo",
  "desayuno","almuerzo","cena","leche","café","jugo",
  "camisa","pantalón","zapatos","uno","dos","tres","cuatro","cinco",
  "seis","siete","ocho","nueve","diez","año","mes","semana","hora","minuto",
];

const FR = [
  "je","tu","il","elle","on","nous","vous","ils","elles",
  "mon","ton","son","notre","votre","leur","ce","cette","ces","le","la","les","un","une",
  "quoi","qui","comment","quand","où","pourquoi","quel","combien","plus","très",
  "aussi","seulement","ne","pas","oui","non","tout","rien","quelque","chaque","autre","même",
  "est","suis","es","sont","était","être","avoir","ai","as","a","avons","avez","ont",
  "faire","aller","venir","pouvoir","vouloir","savoir","dire","donner","voir","mettre",
  "devoir","falloir","aimer","sentir","penser","croire","appeler","utiliser","chercher",
  "manger","boire","dormir","marcher","courir","jouer","travailler","lire","écrire",
  "ouvrir","fermer","parler","écouter","regarder","attendre","aider","essayer",
  "acheter","payer","porter","apporter","sortir","entrer","asseoir","arrêter","commencer",
  "eau","nourriture","toilettes","lit","maison","école","hôpital","médecin","médicament","téléphone",
  "maman","papa","frère","sœur","ami","professeur","bébé","famille","personne","gens",
  "nom","temps","jour","nuit","matin","aujourd'hui","demain","hier","maintenant","après",
  "ici","là","haut","bas","dedans","dehors","gauche","droite","devant","derrière",
  "s'il vous plaît","merci","pardon","bonjour","salut","au revoir","bien","mal",
  "content","triste","fâché","peur","fatigué","faim","soif","malade","douleur","froid","chaud",
  "grand","petit","nouveau","vieux","premier","dernier","prochain","différent",
  "chose","quelque chose","tout","rien","partie","endroit","façon","fois","moment",
  "main","tête","corps","œil","bouche","oreille","nez","bras","jambe","pied","dos",
  "voiture","bus","porte","fenêtre","table","chaise","livre","argent","vêtements",
  "et","ou","mais","si","parce que","alors","avec","sans","pour","de","dans","à","depuis",
  "entre","sur","sous","après","avant","pendant",
  "toujours","jamais","parfois","peut-être","déjà","encore","assez","ensemble","bientôt",
  "vite","lent","facile","difficile","bon","mauvais",
  "petit déjeuner","déjeuner","dîner","lait","café","jus",
  "un","deux","trois","quatre","cinq","six","sept","huit","neuf","dix",
  "an","mois","semaine","heure","minute",
];

const IT = [
  "io","tu","lui","lei","noi","voi","loro","mio","tuo","suo","nostro","vostro",
  "questo","quello","il","la","lo","i","le","gli","un","una","uno",
  "cosa","chi","come","quando","dove","perché","quale","quanto","più","molto",
  "anche","solo","non","sì","no","tutto","niente","qualcosa","ogni","altro","stesso",
  "è","sono","sei","siamo","era","essere","avere","ho","hai","ha","abbiamo",
  "fare","andare","venire","potere","volere","sapere","dire","dare","vedere","mettere",
  "dovere","piacere","sentire","pensare","credere","chiamare","usare","cercare",
  "mangiare","bere","dormire","camminare","correre","giocare","lavorare","leggere","scrivere",
  "aprire","chiudere","parlare","ascoltare","guardare","aspettare","aiutare","provare",
  "comprare","pagare","portare","uscire","entrare","sedere","fermare","cominciare",
  "acqua","cibo","bagno","letto","casa","scuola","ospedale","dottore","medicina","telefono",
  "mamma","papà","fratello","sorella","amico","insegnante","bambino","famiglia","persona","gente",
  "nome","tempo","giorno","notte","mattina","oggi","domani","ieri","adesso","dopo",
  "qui","là","su","giù","dentro","fuori","sinistra","destra","davanti","dietro",
  "per favore","grazie","scusa","ciao","arrivederci","bene","male",
  "felice","triste","arrabbiato","spaventato","stanco","fame","sete","malato","dolore","freddo","caldo",
  "grande","piccolo","nuovo","vecchio","primo","ultimo","prossimo","diverso",
  "cosa","qualcosa","tutto","niente","parte","posto","modo","volta","momento",
  "mano","testa","corpo","occhio","bocca","orecchio","naso","braccio","gamba","piede","schiena",
  "macchina","autobus","porta","finestra","tavolo","sedia","libro","soldi","vestiti",
  "e","o","ma","se","perché","allora","con","senza","per","di","in","a","da",
  "tra","su","sotto","dopo","prima","durante",
  "sempre","mai","qualche volta","forse","già","ancora","abbastanza","insieme","presto",
  "veloce","lento","facile","difficile","buono","cattivo",
  "colazione","pranzo","cena","latte","caffè","succo",
  "uno","due","tre","quattro","cinque","sei","sette","otto","nove","dieci",
  "anno","mese","settimana","ora","minuto",
];

const PT = [
  "eu","tu","ele","ela","nós","vós","eles","elas","você","vocês",
  "meu","teu","seu","nosso","este","esse","aquele","o","a","os","as","um","uma",
  "que","quem","como","quando","onde","por que","qual","quanto","mais","muito",
  "também","só","não","sim","tudo","nada","algo","cada","outro","mesmo",
  "é","sou","és","somos","era","ser","estar","estou","está","ter","tenho","tem",
  "fazer","ir","vir","poder","querer","saber","dizer","dar","ver","pôr",
  "dever","precisar","gostar","sentir","pensar","acreditar","chamar","usar","procurar",
  "comer","beber","dormir","andar","correr","brincar","trabalhar","ler","escrever",
  "abrir","fechar","falar","ouvir","olhar","esperar","ajudar","tentar",
  "comprar","pagar","levar","trazer","sair","entrar","sentar","parar","começar",
  "água","comida","banheiro","cama","casa","escola","hospital","médico","remédio","telefone",
  "mamãe","papai","irmão","irmã","amigo","professor","bebê","família","pessoa","gente",
  "nome","tempo","dia","noite","manhã","hoje","amanhã","ontem","agora","depois",
  "aqui","ali","cima","baixo","dentro","fora","esquerda","direita","frente","trás",
  "por favor","obrigado","desculpa","olá","oi","tchau","bem","mal",
  "feliz","triste","bravo","assustado","cansado","fome","sede","doente","dor","frio","quente",
  "grande","pequeno","novo","velho","primeiro","último","próximo","diferente",
  "coisa","algo","tudo","nada","parte","lugar","jeito","vez","momento",
  "mão","cabeça","corpo","olho","boca","ouvido","nariz","braço","perna","pé","costas",
  "carro","ônibus","porta","janela","mesa","cadeira","livro","dinheiro","roupa",
  "e","ou","mas","se","porque","então","com","sem","para","de","em","a","desde",
  "entre","sobre","sob","depois","antes","durante",
  "sempre","nunca","às vezes","talvez","já","ainda","bastante","juntos","logo",
  "rápido","devagar","fácil","difícil","bom","mau",
  "café da manhã","almoço","jantar","leite","café","suco",
  "um","dois","três","quatro","cinco","seis","sete","oito","nove","dez",
  "ano","mês","semana","hora","minuto",
];

/** Get the frequency-sorted word list for a language code */
export function getWordList(langCode) {
  switch (langCode) {
    case "es": return ES;
    case "fr": return FR;
    case "it": return IT;
    case "pt": return PT;
    default:   return EN;
  }
}

/**
 * AAC sentence starters — common opening patterns for rapid phrase building.
 * Each entry is [starter, ...likely continuations].
 * The keyboard shows these as one-tap sentence openers when the sentence is empty.
 */
export const SENTENCE_STARTERS = {
  en: [
    ["I want", "water", "food", "to go", "help", "more"],
    ["I need", "help", "water", "bathroom", "medicine", "rest"],
    ["I feel", "happy", "sad", "tired", "sick", "hungry", "scared"],
    ["Can I", "have", "go", "please", "help", "eat", "drink"],
    ["I am", "hungry", "thirsty", "tired", "cold", "hot", "okay"],
    ["Please", "help", "wait", "stop", "come", "give"],
    ["Thank you", "for", "very much"],
    ["I like", "this", "that", "it", "you"],
    ["I don't", "want", "like", "know", "feel", "understand"],
    ["Can you", "help", "come", "please", "wait", "tell"],
  ],
  es: [
    ["Yo quiero", "agua", "comida", "ir", "ayuda", "más"],
    ["Necesito", "ayuda", "agua", "baño", "medicina", "descansar"],
    ["Me siento", "feliz", "triste", "cansado", "enfermo", "hambre"],
    ["Puedo", "tener", "ir", "comer", "beber", "ayudar"],
    ["Estoy", "bien", "mal", "cansado", "enfermo", "hambre"],
    ["Por favor", "ayuda", "espera", "para", "ven", "dame"],
    ["Gracias", "por", "mucho"],
    ["Me gusta", "esto", "eso", "mucho"],
    ["No quiero", "eso", "más", "ir"],
    ["Puedes", "ayudar", "venir", "esperar", "decir"],
  ],
  fr: [
    ["Je veux", "de l'eau", "manger", "aller", "aide", "plus"],
    ["J'ai besoin", "d'aide", "d'eau", "toilettes", "médicament", "repos"],
    ["Je me sens", "bien", "triste", "fatigué", "malade", "content"],
    ["Je peux", "avoir", "aller", "manger", "boire", "aider"],
    ["Je suis", "content", "fatigué", "malade", "bien", "mal"],
    ["S'il vous plaît", "aidez", "attendez", "venez"],
    ["Merci", "beaucoup", "pour"],
    ["J'aime", "ça", "bien", "beaucoup"],
    ["Je ne veux pas", "ça", "plus", "aller"],
    ["Pouvez-vous", "aider", "venir", "attendre"],
  ],
  it: [
    ["Voglio", "acqua", "cibo", "andare", "aiuto", "di più"],
    ["Ho bisogno", "di aiuto", "di acqua", "del bagno", "di medicina", "di riposo"],
    ["Mi sento", "bene", "triste", "stanco", "malato", "felice"],
    ["Posso", "avere", "andare", "mangiare", "bere", "aiutare"],
    ["Sono", "bene", "stanco", "malato", "felice", "triste"],
    ["Per favore", "aiuta", "aspetta", "vieni", "dammi"],
    ["Grazie", "mille", "per"],
    ["Mi piace", "questo", "quello", "molto"],
    ["Non voglio", "questo", "più", "andare"],
    ["Puoi", "aiutare", "venire", "aspettare", "dire"],
  ],
  pt: [
    ["Eu quero", "água", "comida", "ir", "ajuda", "mais"],
    ["Preciso", "de ajuda", "de água", "do banheiro", "de remédio", "descansar"],
    ["Me sinto", "bem", "triste", "cansado", "doente", "feliz"],
    ["Posso", "ter", "ir", "comer", "beber", "ajudar"],
    ["Estou", "bem", "mal", "cansado", "doente", "com fome"],
    ["Por favor", "ajude", "espere", "venha", "me dê"],
    ["Obrigado", "por", "muito"],
    ["Eu gosto", "disso", "muito", "de você"],
    ["Não quero", "isso", "mais", "ir"],
    ["Você pode", "ajudar", "vir", "esperar", "dizer"],
  ],
};

export function getStarters(langCode) {
  return SENTENCE_STARTERS[langCode] ?? SENTENCE_STARTERS.en;
}
