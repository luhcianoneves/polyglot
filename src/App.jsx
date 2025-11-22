import React, { useState, useEffect } from 'react';

// Importando ícones (Adicionei o Volume2)
import { 
  BookOpen, 
  Plus, 
  Settings, 
  RotateCw, 
  Check, 
  X, 
  Languages, 
  Save, 
  Trash2,
  BrainCircuit,
  Volume2
} from 'lucide-react';

// --- COMPONENTES UI AUXILIARES ---

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false }) => {
  const baseStyle = "px-4 py-3 rounded-xl font-bold transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 shadow-sm";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200",
    secondary: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50",
    success: "bg-green-500 text-white hover:bg-green-600 shadow-green-200",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-red-200",
    ghost: "text-gray-500 hover:bg-gray-100 hover:text-gray-700 bg-transparent shadow-none"
  };

  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
};

// --- LÓGICA DO APLICATIVO ---

export default function App() {
  const [view, setView] = useState('home');
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState([]);
  const [supabase, setSupabase] = useState(null);
  const [isSupabaseLoaded, setIsSupabaseLoaded] = useState(false);
  
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');
  const [selectedLang, setSelectedLang] = useState('it'); 

  const [studyIndex, setStudyIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const [config, setConfig] = useState({
    url: '',
    key: ''
  });

  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    script.async = true;
    script.onload = () => {
      console.log("Supabase script loaded");
      setIsSupabaseLoaded(true);
    };
    document.body.appendChild(script);

    return () => {
      if(document.body.contains(script)) {
        document.body.removeChild(script);
      }
    }
  }, []);

  useEffect(() => {
    const savedConfig = localStorage.getItem('polyglot_config');
    const savedCards = localStorage.getItem('polyglot_local_cards');
    
    if (savedConfig) {
      const parsed = JSON.parse(savedConfig);
      setConfig(parsed);
      if (isSupabaseLoaded && parsed.url && parsed.key) {
        initSupabase(parsed.url, parsed.key);
      }
    } else if (savedCards) {
      setCards(JSON.parse(savedCards));
    }
  }, [isSupabaseLoaded]); 

  const initSupabase = (url, key) => {
    try {
      if (window.supabase && window.supabase.createClient) {
        const client = window.supabase.createClient(url, key);
        setSupabase(client);
        fetchCards(client);
      } else {
        console.warn("Supabase ainda não carregou, aguardando...");
      }
    } catch (error) {
      console.error("Erro ao conectar Supabase:", error);
    }
  };

  const fetchCards = async (client) => {
    setLoading(true);
    if (client) {
      const { data, error } = await client
        .from('flashcards')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error && data) setCards(data);
    }
    setLoading(false);
  };

  const handleSaveConfig = () => {
    localStorage.setItem('polyglot_config', JSON.stringify(config));
    if (config.url && config.key) {
      if (window.supabase) {
        initSupabase(config.url, config.key);
        alert('Conectado! Agora seus dados serão salvos na nuvem.');
        setView('home');
      } else {
        alert("A biblioteca está carregando... tente novamente em 5 segundos.");
      }
    } else {
      alert('Preencha os dados para conectar. Usando modo offline por enquanto.');
    }
  };

  const handleAddCard = async () => {
    if (!newFront || !newBack) return;
    setLoading(true);

    const newCard = {
      front: newFront,
      back: newBack,
      language: selectedLang,
      status: 'learning',
      created_at: new Date().toISOString() 
    };

    if (supabase) {
      const { error } = await supabase.from('flashcards').insert([
        { front: newFront, back: newBack, language: selectedLang }
      ]);
      if (!error) {
        await fetchCards(supabase);
        setView('home');
        setNewFront('');
        setNewBack('');
      } else {
        alert('Erro ao salvar no Supabase: ' + error.message);
      }
    } else {
      const updatedCards = [newCard, ...cards];
      setCards(updatedCards);
      localStorage.setItem('polyglot_local_cards', JSON.stringify(updatedCards));
      setView('home');
      setNewFront('');
      setNewBack('');
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if(!confirm("Deletar este cartão?")) return;
    
    if (supabase && id) {
      await supabase.from('flashcards').delete().match({ id });
      fetchCards(supabase);
    } else {
      const updated = cards.filter(c => c.front !== id); 
      setCards(updated);
      localStorage.setItem('polyglot_local_cards', JSON.stringify(updated));
    }
  };

  const handleNextCard = () => {
    setIsFlipped(false);
    if(studyIndex < cards.length - 1) {
      setStudyIndex(studyIndex + 1);
    } else {
      setStudyIndex(cards.length); 
    }
  };

  // --- NOVA FUNÇÃO DE ÁUDIO ---
  const speak = (text, lang, e) => {
    e.stopPropagation(); // Evita virar o cartão se clicar no áudio
    
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      // Define o sotaque correto
      utterance.lang = lang === 'it' ? 'it-IT' : 'ca-ES'; 
      utterance.rate = 0.9; // Um pouco mais lento para estudar
      window.speechSynthesis.speak(utterance);
    } else {
      alert("Seu navegador não suporta áudio.");
    }
  };

  // --- RENDERIZAÇÃO PRINCIPAL ---

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <div className="max-w-md mx-auto bg-white min-h-screen shadow-2xl flex flex-col relative overflow-hidden">
        
        {/* Top Bar */}
        <div className="p-6 pb-4 flex justify-between items-center bg-white z-10 sticky top-0 border-b border-gray-100">
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-blue-600 flex items-center gap-2">
              <Languages className="text-yellow-500" /> PolyGlot <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold border border-green-200">v2.2</span>
            </h1>
            <p className="text-xs text-gray-400 font-medium">Aprenda Rápido</p>
          </div>
          <button onClick={() => setView('settings')} className="p-2 bg-gray-100 rounded-full text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors">
            <Settings size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          
          {/* TELA: HOME */}
          {view === 'home' && (
            <div className="space-y-6 pb-20">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                  <div className="text-blue-600 font-semibold text-sm mb-1">Total de Palavras</div>
                  <div className="text-3xl font-bold text-blue-800">{cards.length}</div>
                </div>
                <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                  <div className="text-indigo-600 font-semibold text-sm mb-1">IT vs CA</div>
                  <div className="text-lg font-bold text-indigo-800">
                    {cards.filter(c => c.language === 'it').length} / {cards.filter(c => c.language === 'ca').length}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-gray-800 text-lg mb-3 flex items-center gap-2">
                  <BookOpen size={20} /> Adicionados Recentemente
                </h3>
                {cards.length === 0 ? (
                  <div className="text-center p-8 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                    <p className="text-gray-500">Nenhum cartão ainda.</p>
                    <p className="text-sm text-gray-400 mt-1">Comece adicionando palavras!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cards.slice(0, 5).map((card, idx) => (
                      <div key={idx} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${card.language === 'it' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {card.language}
                            </span>
                            <div className="font-bold text-gray-800">{card.front}</div>
                          </div>
                          <div className="text-gray-500 text-sm">{card.back}</div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          {/* Botão de Áudio na Home */}
                          <button 
                            onClick={(e) => speak(card.front, card.language, e)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                          >
                            <Volume2 size={18} />
                          </button>
                          
                          <button onClick={() => handleDelete(card.id || card.front)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TELA: ADICIONAR */}
          {view === 'add' && (
            <div className="max-w-md mx-auto">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Nova Palavra</h2>
              
              <div className="flex gap-2 mb-6">
                <button 
                  onClick={() => setSelectedLang('it')}
                  className={`flex-1 py-3 rounded-xl font-bold transition-all ${selectedLang === 'it' ? 'bg-green-500 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}
                >
                  🇮🇹 Italiano
                </button>
                <button 
                  onClick={() => setSelectedLang('ca')}
                  className={`flex-1 py-3 rounded-xl font-bold transition-all ${selectedLang === 'ca' ? 'bg-yellow-400 text-yellow-900 shadow-lg' : 'bg-gray-100 text-gray-400'}`}
                >
                  Catalão
                </button>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-600 mb-1 ml-1">Em Italiano/Catalão</label>
                  <input
                    type="text"
                    value={newFront}
                    onChange={(e) => setNewFront(e.target.value)}
                    placeholder="Ex: Sviluppo"
                    className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-600 mb-1 ml-1">Em Português</label>
                  <input
                    type="text"
                    value={newBack}
                    onChange={(e) => setNewBack(e.target.value)}
                    placeholder="Ex: Desenvolvimento"
                    className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white"
                  />
                </div>
              </div>

              <Button onClick={handleAddCard} disabled={loading} className="w-full shadow-xl">
                {loading ? 'Salvando...' : 'Adicionar ao Deck'}
              </Button>
            </div>
          )}

          {/* TELA: ESTUDAR */}
          {view === 'study' && (
            <>
              {cards.length === 0 ? (
                <div className="text-center mt-20">
                  <BrainCircuit size={64} className="mx-auto text-gray-300 mb-4" />
                  <h3 className="text-xl font-bold text-gray-700">Sem cartões para estudar</h3>
                  <p className="text-gray-500 mt-2">Adicione algumas palavras primeiro.</p>
                  <Button onClick={() => setView('add')} className="mt-6 mx-auto">Adicionar Agora</Button>
                </div>
              ) : !cards[studyIndex] ? (
                <div className="text-center mt-20">
                    <div className="text-6xl mb-4">🎉</div>
                    <h3 className="text-2xl font-bold text-green-600 mb-2">Sessão Concluída!</h3>
                    <p className="text-gray-500">Você revisou todos os cartões de hoje.</p>
                    <Button onClick={() => { setStudyIndex(0); setView('home'); }} className="mt-8 mx-auto" variant="secondary">Voltar ao Início</Button>
                </div>
              ) : (
                <div className="h-full flex flex-col justify-center max-w-md mx-auto pb-20">
                  <div className="text-center mb-4 text-gray-400 font-medium uppercase tracking-widest text-xs">
                    {cards[studyIndex].language === 'it' ? 'Italiano' : 'Catalão'}
                  </div>

                  <div 
                    onClick={() => setIsFlipped(!isFlipped)}
                    className="cursor-pointer perspective-1000 group relative h-80 w-full transition-all duration-500"
                  >
                    <div className={`w-full h-full absolute rounded-3xl shadow-2xl border border-gray-100 bg-white p-8 flex flex-col items-center justify-center transition-all duration-500 backface-hidden ${isFlipped ? 'opacity-0 rotate-y-180' : 'opacity-100 rotate-y-0'}`}>
                      
                      {/* Botão de Áudio GRANDE no Estudo */}
                      <button 
                         onClick={(e) => speak(cards[studyIndex].front, cards[studyIndex].language, e)}
                         className="mb-4 p-4 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 hover:scale-110 transition-all shadow-sm"
                      >
                        <Volume2 size={32} />
                      </button>

                      <span className="text-4xl font-bold text-gray-800 text-center">{cards[studyIndex].front}</span>
                      
                      <div className="mt-6 text-blue-500 text-sm font-medium flex items-center gap-1">
                        <RotateCw size={14} /> Toque para virar
                      </div>
                    </div>

                    <div className={`w-full h-full absolute rounded-3xl shadow-2xl border border-blue-100 bg-blue-50 p-8 flex flex-col items-center justify-center transition-all duration-500 backface-hidden ${isFlipped ? 'opacity-100 rotate-y-0' : 'opacity-0 -rotate-y-180'}`}>
                      <span className="text-3xl font-medium text-blue-900 text-center">{cards[studyIndex].back}</span>
                    </div>
                  </div>

                  {isFlipped && (
                    <div className="flex gap-3 mt-8">
                      <Button 
                        variant="danger" 
                        className="flex-1 py-4" 
                        onClick={handleNextCard}
                      >
                        <X size={20} /> Esqueci
                      </Button>
                      <Button 
                        variant="success" 
                        className="flex-1 py-4"
                        onClick={handleNextCard}
                      >
                        <Check size={20} /> Lembrei
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* TELA: CONFIGURAÇÕES */}
          {view === 'settings' && (
            <div className="max-w-md mx-auto">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Conexão Nuvem</h2>
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl mb-6 text-sm text-yellow-800">
                Para salvar seus dados permanentemente e acessar de qualquer lugar, conecte seu banco Supabase.
              </div>
              
              <div className="space-y-4">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-600 mb-1 ml-1">Supabase Project URL</label>
                  <input
                    type="text"
                    value={config.url}
                    onChange={(e) => setConfig({...config, url: e.target.value})}
                    placeholder="https://xyz.supabase.co"
                    className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-600 mb-1 ml-1">Supabase Anon Key</label>
                  <input
                    type="text"
                    value={config.key}
                    onChange={(e) => setConfig({...config, key: e.target.value})}
                    placeholder="eyJhbGciOiJIUzI1..."
                    className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white"
                  />
                </div>
              </div>

              <div className="mt-8 space-y-3">
                <Button onClick={handleSaveConfig} className="w-full">
                  <Save size={18} /> Salvar e Conectar
                </Button>
                
                {supabase ? (
                   <div className="p-3 bg-green-100 text-green-700 rounded-lg text-center text-sm font-bold">
                     ✓ Conectado ao Supabase
                   </div>
                ) : (
                   <div className="p-3 bg-gray-100 text-gray-500 rounded-lg text-center text-sm">
                     {isSupabaseLoaded ? "Biblioteca carregada. Insira as chaves para conectar." : "Carregando biblioteca..."}
                   </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Bottom Navigation */}
        <div className="p-4 bg-white border-t border-gray-100 flex justify-around items-center pb-8">
          <button 
            onClick={() => setView('home')}
            className={`flex flex-col items-center gap-1 ${view === 'home' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <BookOpen size={24} strokeWidth={view === 'home' ? 3 : 2} />
            <span className="text-[10px] font-bold">Início</span>
          </button>

          <button 
            onClick={() => setView('add')}
            className="bg-blue-600 text-white p-4 rounded-full shadow-lg shadow-blue-300 -mt-8 transform transition hover:scale-110 hover:bg-blue-700 active:scale-95"
          >
            <Plus size={28} strokeWidth={3} />
          </button>

          <button 
            onClick={() => setView('study')}
            className={`flex flex-col items-center gap-1 ${view === 'study' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <BrainCircuit size={24} strokeWidth={view === 'study' ? 3 : 2} />
            <span className="text-[10px] font-bold">Estudar</span>
          </button>
        </div>

      </div>
    </div>
  );
}
