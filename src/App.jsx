import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Plus, Settings, RotateCw, Check, X, 
  Languages, Save, Trash2, BrainCircuit, Volume2, 
  Search, Edit2, Flame, Turtle, Send
} from 'lucide-react';

// --- COMPONENTES UI ---
const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false }) => {
  const baseStyle = "px-4 py-3 rounded-xl font-bold transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200",
    secondary: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50",
    success: "bg-green-500 text-white hover:bg-green-600 shadow-green-200",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-red-200",
    warning: "bg-yellow-500 text-white hover:bg-yellow-600 shadow-yellow-200",
    ghost: "text-gray-400 hover:bg-gray-100 hover:text-gray-700 bg-transparent shadow-none"
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

// --- LÓGICA DO APP ---
export default function App() {
  const [view, setView] = useState('home');
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [streak, setStreak] = useState(0);
  
  // Estado do Supabase
  const [supabase, setSupabase] = useState(null);
  const [isSupabaseLoaded, setIsSupabaseLoaded] = useState(false);
  const [config, setConfig] = useState({ url: '', key: '' });

  // Estado de Edição/Criação
  const [editingCard, setEditingCard] = useState(null); // Se null, é criação. Se tiver obj, é edição.
  const [formData, setFormData] = useState({ front: '', back: '', context: '', category: 'Geral', lang: 'it' });

  // Estado de Estudo
  const [studyQueue, setStudyQueue] = useState([]);
  const [studyIndex, setStudyIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [showFeedback, setShowFeedback] = useState(false); // Para mostrar se acertou digitação

  // --- INICIALIZAÇÃO ---
  useEffect(() => {
    // Carrega Supabase
    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    script.async = true;
    script.onload = () => setIsSupabaseLoaded(true);
    document.body.appendChild(script);

    // Carrega Streak e Configs Locais
    const savedConfig = localStorage.getItem('polyglot_config');
    const savedStreak = localStorage.getItem('polyglot_streak');
    const lastStudyDate = localStorage.getItem('polyglot_last_study');
    
    if (savedConfig) setConfig(JSON.parse(savedConfig));
    
    // Lógica simples de Streak
    if (savedStreak && lastStudyDate) {
      const today = new Date().toDateString();
      const last = new Date(lastStudyDate).toDateString();
      if (today === last) {
        setStreak(parseInt(savedStreak));
      } else if (new Date() - new Date(lastStudyDate) < 172800000) { // Menos de 48h (ontem)
        // Mantém streak, não incrementa aqui, só quando estudar
        setStreak(parseInt(savedStreak));
      } else {
        setStreak(0); // Quebrou a corrente
      }
    }

    return () => { if(document.body.contains(script)) document.body.removeChild(script); }
  }, []);

  useEffect(() => {
    if (isSupabaseLoaded && config.url && config.key) {
      try {
        if (window.supabase) {
          const client = window.supabase.createClient(config.url, config.key);
          setSupabase(client);
          fetchCards(client);
        }
      } catch (e) { console.error(e); }
    }
  }, [isSupabaseLoaded, config]);

  // --- CRUD ---
  const fetchCards = async (client) => {
    setLoading(true);
    const { data, error } = await client.from('flashcards').select('*').order('created_at', { ascending: false });
    if (!error && data) setCards(data);
    setLoading(false);
  };

  const handleSaveCard = async () => {
    if (!formData.front || !formData.back) return alert("Preencha os campos principais");
    setLoading(true);

    const payload = {
      front: formData.front,
      back: formData.back,
      context: formData.context,
      category: formData.category,
      language: formData.lang
    };

    if (supabase) {
      if (editingCard) {
        // UPDATE
        await supabase.from('flashcards').update(payload).match({ id: editingCard.id });
      } else {
        // INSERT
        await supabase.from('flashcards').insert([payload]);
      }
      await fetchCards(supabase);
      setView('home');
      setFormData({ front: '', back: '', context: '', category: 'Geral', lang: 'it' });
      setEditingCard(null);
    } else {
      alert("Conecte ao Supabase primeiro!");
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if(!confirm("Deletar este cartão?")) return;
    if (supabase) {
      await supabase.from('flashcards').delete().match({ id });
      fetchCards(supabase);
    }
  };

  const startEdit = (card) => {
    setEditingCard(card);
    setFormData({
      front: card.front,
      back: card.back,
      context: card.context || '',
      category: card.category || 'Geral',
      lang: card.language
    });
    setView('add');
  };

  // --- LÓGICA DE ESTUDO & SRS ---
  const startSession = () => {
    // Filtra cartões que precisam de revisão (data <= hoje ou novos)
    const now = new Date();
    const toStudy = cards.filter(c => !c.next_review || new Date(c.next_review) <= now);
    
    if (toStudy.length === 0) {
      alert("Tudo em dia! Você pode adicionar mais palavras ou revisar tudo forçadamente.");
      // Opcional: permitir revisar tudo mesmo assim
      setStudyQueue(cards); 
    } else {
      setStudyQueue(toStudy);
    }
    
    setStudyIndex(0);
    setIsFlipped(false);
    setTypedAnswer('');
    setShowFeedback(false);
    
    // Atualiza Streak se for a primeira vez hoje
    const today = new Date().toDateString();
    const last = localStorage.getItem('polyglot_last_study');
    if (last !== today) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      localStorage.setItem('polyglot_streak', newStreak);
      localStorage.setItem('polyglot_last_study', today); // Salva data completa
    }
    
    setView('study');
  };

  const processReview = async (quality) => {
    // quality: 0 (Errei), 3 (Difícil), 4 (Bom), 5 (Fácil)
    const card = studyQueue[studyIndex];
    
    // Algoritmo SM-2 Simplificado
    let nextInterval;
    let nextEase = card.ease_factor || 2.5;
    let reviewCount = (card.review_count || 0) + 1;

    if (quality === 0) {
      reviewCount = 0;
      nextInterval = 0; // Repete hoje/amanhã
    } else {
      if (reviewCount === 1) nextInterval = 1;
      else if (reviewCount === 2) nextInterval = 6;
      else nextInterval = Math.round((card.interval || 1) * nextEase);
    }

    // Ajuste de facilidade
    nextEase = nextEase + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (nextEase < 1.3) nextEase = 1.3;

    // Calcula data
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + nextInterval);

    // Atualiza no banco (Background)
    if (supabase) {
      supabase.from('flashcards').update({
        next_review: nextDate.toISOString(),
        interval: nextInterval,
        ease_factor: nextEase,
        review_count: reviewCount
      }).match({ id: card.id }).then(() => {}); // Fire and forget
    }

    // Próximo cartão
    if (studyIndex < studyQueue.length - 1) {
      setStudyIndex(studyIndex + 1);
      setIsFlipped(false);
      setTypedAnswer('');
      setShowFeedback(false);
    } else {
      setView('home'); // Fim da sessão
      alert("Sessão Concluída! 🚀");
    }
  };

  // --- UTILITÁRIOS ---
  const speak = (text, lang, rate = 1.0, e) => {
    if (e) e.stopPropagation();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Para áudio anterior
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang === 'it' ? 'it-IT' : 'ca-ES';
      u.rate = rate;
      window.speechSynthesis.speak(u);
    }
  };

  const checkAnswer = () => {
    setIsFlipped(true);
    const correct = studyQueue[studyIndex].front.toLowerCase().trim();
    const userTyped = typedAnswer.toLowerCase().trim();
    // Lógica simples de comparação (pode melhorar com Levenshtein distance)
    if (correct === userTyped) setShowFeedback('correct');
    else setShowFeedback('wrong');
  };

  // --- RENDERIZAÇÃO ---
  const filteredCards = cards.filter(c => 
    c.front.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.back.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.category && c.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-20">
      <div className="max-w-md mx-auto bg-white min-h-screen shadow-2xl flex flex-col relative">
        
        {/* Header Fixo */}
        <div className="p-4 bg-white border-b border-gray-100 sticky top-0 z-20 flex justify-between items-center">
           <div>
             <h1 className="text-xl font-black text-blue-600 flex items-center gap-2">
               <Languages size={24} className="text-yellow-500" /> PolyGlot <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-1 rounded-full">v3.0</span>
             </h1>
           </div>
           <div className="flex items-center gap-3">
             <div className="flex items-center gap-1 text-orange-500 font-bold bg-orange-50 px-2 py-1 rounded-lg">
               <Flame size={16} fill="currentColor" /> {streak}
             </div>
             <button onClick={() => setView('settings')} className="p-2 bg-gray-100 rounded-full text-gray-600">
               <Settings size={18} />
             </button>
           </div>
        </div>

        {/* ÁREA DE CONTEÚDO */}
        <div className="flex-1 p-4 overflow-y-auto scrollbar-hide">
          
          {/* HOME */}
          {view === 'home' && (
            <div className="space-y-6">
              {/* Dashboard Rápido */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-blue-50 p-3 rounded-xl text-center">
                  <div className="text-xs text-blue-500 font-bold uppercase">Total</div>
                  <div className="text-xl font-bold text-blue-800">{cards.length}</div>
                </div>
                <div className="bg-green-50 p-3 rounded-xl text-center">
                  <div className="text-xs text-green-500 font-bold uppercase">Italiano</div>
                  <div className="text-xl font-bold text-green-800">{cards.filter(c=>c.language==='it').length}</div>
                </div>
                <div className="bg-yellow-50 p-3 rounded-xl text-center">
                  <div className="text-xs text-yellow-500 font-bold uppercase">Catalão</div>
                  <div className="text-xl font-bold text-yellow-800">{cards.filter(c=>c.language==='ca').length}</div>
                </div>
              </div>

              {/* Busca */}
              <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar palavras ou categorias..." 
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Lista de Cartões */}
              <div className="space-y-3">
                {filteredCards.map((card, idx) => (
                  <div key={idx} className="bg-white border border-gray-100 shadow-sm p-4 rounded-xl flex justify-between items-start group hover:border-blue-200 transition-all">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${card.language === 'it' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {card.language}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                          {card.category || 'Geral'}
                        </span>
                      </div>
                      <div className="font-bold text-gray-800 text-lg">{card.front}</div>
                      <div className="text-gray-500 text-sm">{card.back}</div>
                      {card.context && <div className="text-xs text-gray-400 mt-1 italic">"{card.context}"</div>}
                    </div>
                    
                    <div className="flex flex-col gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => speak(card.front, card.language, 1, e)} className="p-2 text-blue-500 bg-blue-50 rounded-full hover:bg-blue-100">
                        <Volume2 size={16} />
                      </button>
                      <button onClick={() => startEdit(card)} className="p-2 text-gray-500 bg-gray-50 rounded-full hover:bg-gray-100">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(card.id)} className="p-2 text-red-500 bg-red-50 rounded-full hover:bg-red-100">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                {filteredCards.length === 0 && <div className="text-center text-gray-400 py-10">Nenhum cartão encontrado.</div>}
              </div>
            </div>
          )}

          {/* ADD / EDIT */}
          {view === 'add' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">{editingCard ? 'Editar' : 'Novo'} Cartão</h2>
                <button onClick={() => setView('home')} className="text-gray-400 hover:text-gray-600"><X/></button>
              </div>

              <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                <button onClick={() => setFormData({...formData, lang: 'it'})} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${formData.lang === 'it' ? 'bg-white shadow text-green-600' : 'text-gray-400'}`}>Italiano</button>
                <button onClick={() => setFormData({...formData, lang: 'ca'})} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${formData.lang === 'ca' ? 'bg-white shadow text-yellow-600' : 'text-gray-400'}`}>Catalão</button>
              </div>

              <div className="space-y-3">
                <input type="text" placeholder="Palavra em Italiano/Catalão" className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.front} onChange={e => setFormData({...formData, front: e.target.value})} />
                <input type="text" placeholder="Tradução em Português" className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.back} onChange={e => setFormData({...formData, back: e.target.value})} />
                <textarea placeholder="Frase de Exemplo (Contexto)" className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" rows="2" value={formData.context} onChange={e => setFormData({...formData, context: e.target.value})} />
                <input type="text" placeholder="Categoria (Ex: Verbos, Comida)" className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
              </div>

              <Button onClick={handleSaveCard} className="w-full mt-4" disabled={loading}>
                {loading ? 'Salvando...' : <><Save size={18} /> Salvar Cartão</>}
              </Button>
            </div>
          )}

          {/* ESTUDO (MODO POWER) */}
          {view === 'study' && studyQueue.length > 0 && (
            <div className="h-full flex flex-col">
              <div className="flex-1 flex flex-col justify-center items-center relative">
                {/* Cartão Frente */}
                <div className="w-full text-center space-y-6">
                  <div className="text-sm text-gray-400 uppercase tracking-widest font-bold">{studyQueue[studyIndex].category || 'Geral'}</div>
                  
                  {/* Botões de Áudio */}
                  <div className="flex justify-center gap-4">
                    <button onClick={() => speak(studyQueue[studyIndex].front, studyQueue[studyIndex].language, 0.5)} className="p-3 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100" title="Modo Tartaruga (Lento)">
                      <Turtle size={24} />
                    </button>
                    <button onClick={() => speak(studyQueue[studyIndex].front, studyQueue[studyIndex].language, 1)} className="p-3 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100" title="Normal">
                      <Volume2 size={24} />
                    </button>
                  </div>

                  <div className="text-4xl font-black text-gray-800 py-4">{studyQueue[studyIndex].front}</div>

                  {/* Input Ativo (Só aparece se não virou) */}
                  {!isFlipped && (
                    <div className="w-full max-w-xs mx-auto relative">
                      <input 
                        type="text" 
                        placeholder="Digite a palavra..."
                        className="w-full p-3 bg-gray-50 border-b-2 border-gray-200 focus:border-blue-500 outline-none text-center"
                        value={typedAnswer}
                        onChange={(e) => setTypedAnswer(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && checkAnswer()}
                      />
                      <button onClick={checkAnswer} className="absolute right-2 top-3 text-gray-400 hover:text-blue-600">
                        <Send size={18} />
                      </button>
                    </div>
                  )}

                  {/* Feedback e Verso */}
                  {isFlipped && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-4">
                       {/* Feedback Digitação */}
                       {typedAnswer && (
                         <div className={`text-sm font-bold ${showFeedback === 'correct' ? 'text-green-500' : 'text-red-500'}`}>
                           {showFeedback === 'correct' ? '✨ Você acertou a escrita!' : `Você escreveu: "${typedAnswer}"`}
                         </div>
                       )}

                       <div className="text-xl text-gray-600 border-t border-gray-100 pt-4">
                         {studyQueue[studyIndex].back}
                       </div>
                       
                       {studyQueue[studyIndex].context && (
                         <div className="bg-yellow-50 p-3 rounded-lg text-yellow-800 text-sm italic">
                           "{studyQueue[studyIndex].context}"
                         </div>
                       )}
                    </div>
                  )}
                </div>
              </div>

              {/* Controles SRS */}
              {isFlipped ? (
                <div className="grid grid-cols-4 gap-2 mt-auto pt-6 border-t border-gray-50">
                   <button onClick={() => processReview(0)} className="flex flex-col items-center p-2 rounded-lg hover:bg-red-50 text-red-500">
                     <span className="text-xl mb-1">😡</span>
                     <span className="text-xs font-bold">Errei</span>
                     <span className="text-[10px] opacity-60">Hoje</span>
                   </button>
                   <button onClick={() => processReview(3)} className="flex flex-col items-center p-2 rounded-lg hover:bg-orange-50 text-orange-500">
                     <span className="text-xl mb-1">😬</span>
                     <span className="text-xs font-bold">Difícil</span>
                     <span className="text-[10px] opacity-60">2d</span>
                   </button>
                   <button onClick={() => processReview(4)} className="flex flex-col items-center p-2 rounded-lg hover:bg-blue-50 text-blue-500">
                     <span className="text-xl mb-1">🙂</span>
                     <span className="text-xs font-bold">Bom</span>
                     <span className="text-[10px] opacity-60">4d</span>
                   </button>
                   <button onClick={() => processReview(5)} className="flex flex-col items-center p-2 rounded-lg hover:bg-green-50 text-green-500">
                     <span className="text-xl mb-1">😎</span>
                     <span className="text-xs font-bold">Fácil</span>
                     <span className="text-[10px] opacity-60">7d</span>
                   </button>
                </div>
              ) : (
                <Button onClick={checkAnswer} className="mt-auto w-full bg-gray-800 text-white">
                  Mostrar Resposta
                </Button>
              )}
            </div>
          )}

          {/* SETTINGS */}
          {view === 'settings' && (
            <div className="space-y-4">
               <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Configurações</h2>
                <button onClick={() => setView('home')} className="text-gray-400 hover:text-gray-600"><X/></button>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                <h3 className="font-bold text-purple-800 mb-2">Dados do Supabase</h3>
                <input type="text" placeholder="Project URL" value={config.url} onChange={e => setConfig({...config, url: e.target.value})} className="w-full p-2 mb-2 rounded border text-sm" />
                <input type="password" placeholder="Anon Key" value={config.key} onChange={e => setConfig({...config, key: e.target.value})} className="w-full p-2 rounded border text-sm" />
                <Button onClick={() => { localStorage.setItem('polyglot_config', JSON.stringify(config)); alert("Salvo!"); window.location.reload(); }} className="w-full mt-2 text-sm py-2">
                   Salvar Conexão
                </Button>
              </div>
              <div className="text-center text-xs text-gray-400 mt-10">PolyGlot v3.0 - Build for Speed Learning</div>
            </div>
          )}

        </div>

        {/* Menu Flutuante (Botão Principal) */}
        {view === 'home' && (
           <div className="absolute bottom-6 right-6 flex flex-col gap-4">
             <button onClick={startSession} className="bg-gray-900 text-white p-4 rounded-full shadow-xl hover:bg-black hover:scale-105 transition-all flex items-center gap-2 pr-6">
               <BrainCircuit size={24} /> <span className="font-bold">Estudar</span>
             </button>
             <button onClick={() => { setEditingCard(null); setView('add'); }} className="bg-blue-600 text-white p-4 rounded-full shadow-xl shadow-blue-300 hover:bg-blue-700 hover:scale-105 transition-all self-end">
               <Plus size={24} />
             </button>
           </div>
        )}

      </div>
    </div>
  );
}
