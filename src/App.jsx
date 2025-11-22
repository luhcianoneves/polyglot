import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, Plus, Settings, RotateCw, Check, X, 
  Languages, Save, Trash2, BrainCircuit, Volume2, 
  Search, Edit2, Flame, Turtle, Send, Mic, Image as ImageIcon,
  Moon, Sun, Trophy, BarChart3, Sparkles
} from 'lucide-react';

// --- COMPONENTES UI ---
const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false }) => {
  const baseStyle = "px-4 py-3 rounded-xl font-bold transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200 dark:shadow-none",
    secondary: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700",
    success: "bg-green-500 text-white hover:bg-green-600 shadow-green-200 dark:shadow-none",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-red-200 dark:shadow-none",
    warning: "bg-yellow-500 text-white hover:bg-yellow-600 shadow-yellow-200 dark:shadow-none",
    ghost: "text-gray-400 hover:bg-gray-100 hover:text-gray-700 bg-transparent shadow-none dark:hover:bg-gray-800 dark:text-gray-400"
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

// --- LÓGICA DO APP ---
export default function App() {
  // Estados Globais
  const [view, setView] = useState('home');
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  
  // Gamificação
  const [streak, setStreak] = useState(0);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  
  // Supabase
  const [supabase, setSupabase] = useState(null);
  const [isSupabaseLoaded, setIsSupabaseLoaded] = useState(false);
  const [config, setConfig] = useState({ url: '', key: '' });

  // Edição
  const [editingCard, setEditingCard] = useState(null);
  const [formData, setFormData] = useState({ front: '', back: '', context: '', category: 'Geral', lang: 'it', image_url: '' });

  // Estudo
  const [studyQueue, setStudyQueue] = useState([]);
  const [studyIndex, setStudyIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState(null); // 'correct', 'wrong', 'listening'
  
  // Referências para Áudio (Efeitos Sonoros)
  const audioSuccess = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3'));
  const audioFail = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3'));

  // --- INICIALIZAÇÃO ---
  useEffect(() => {
    // Carrega Script Supabase
    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    script.async = true;
    script.onload = () => setIsSupabaseLoaded(true);
    document.body.appendChild(script);

    // Carrega Dados Locais
    const savedConfig = localStorage.getItem('polyglot_config');
    const savedStreak = localStorage.getItem('polyglot_streak');
    const lastStudyDate = localStorage.getItem('polyglot_last_study');
    const savedXP = localStorage.getItem('polyglot_xp');
    const savedDark = localStorage.getItem('polyglot_dark');
    
    if (savedConfig) setConfig(JSON.parse(savedConfig));
    if (savedXP) {
      const totalXP = parseInt(savedXP);
      setXp(totalXP);
      setLevel(Math.floor(totalXP / 100) + 1);
    }
    if (savedDark === 'true') setDarkMode(true);
    
    // Lógica Streak
    if (savedStreak && lastStudyDate) {
      const today = new Date().toDateString();
      const last = new Date(lastStudyDate).toDateString();
      if (today === last || new Date() - new Date(lastStudyDate) < 172800000) {
        setStreak(parseInt(savedStreak));
      } else {
        setStreak(0);
      }
    }

    return () => { if(document.body.contains(script)) document.body.removeChild(script); }
  }, []);

  // Conecta Supabase
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

  // Alterna Tema
  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('polyglot_dark', darkMode);
  }, [darkMode]);

  // --- FUNÇÕES DO BANCO ---
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
      language: formData.lang,
      image_url: formData.image_url
    };

    if (supabase) {
      if (editingCard) {
        await supabase.from('flashcards').update(payload).match({ id: editingCard.id });
      } else {
        await supabase.from('flashcards').insert([payload]);
        // XP Bonus por criar
        addXp(10);
      }
      await fetchCards(supabase);
      setView('home');
      resetForm();
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

  // --- GAMIFICAÇÃO ---
  const addXp = (amount) => {
    const newXp = xp + amount;
    setXp(newXp);
    setLevel(Math.floor(newXp / 100) + 1);
    localStorage.setItem('polyglot_xp', newXp);
  };

  // --- INTELIGÊNCIA (Voz e Imagem) ---
  const generateImage = () => {
    if (!formData.front) return alert("Digite uma palavra primeiro!");
    setLoading(true);
    // Usa Pollinations AI para gerar imagem gratuita baseada no texto
    const url = `https://image.pollinations.ai/prompt/minimalist illustration of ${formData.front}?width=400&height=400&nologo=true`;
    setFormData({...formData, image_url: url});
    setLoading(false);
  };

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window)) return alert("Navegador sem suporte a voz.");
    
    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = studyQueue[studyIndex].language === 'it' ? 'it-IT' : 'ca-ES';
    recognition.start();
    setFeedbackStatus('listening');

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setTypedAnswer(transcript);
      checkAnswer(transcript);
      setFeedbackStatus(null);
    };

    recognition.onerror = () => {
      alert("Erro ao ouvir. Tente de novo.");
      setFeedbackStatus(null);
    };
  };

  // --- ESTUDO ---
  const startSession = () => {
    const now = new Date();
    const toStudy = cards.filter(c => !c.next_review || new Date(c.next_review) <= now);
    
    if (toStudy.length === 0) {
      if(confirm("Tudo em dia! Quer fazer uma revisão extra para ganhar XP?")) {
        setStudyQueue(cards.sort(() => 0.5 - Math.random()).slice(0, 10)); // Pega 10 aleatórios
      } else {
        return;
      }
    } else {
      setStudyQueue(toStudy);
    }
    
    setStudyIndex(0);
    setIsFlipped(false);
    setTypedAnswer('');
    setFeedbackStatus(null);
    
    // Streak Update
    const today = new Date().toDateString();
    if (localStorage.getItem('polyglot_last_study') !== today) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      localStorage.setItem('polyglot_streak', newStreak);
      localStorage.setItem('polyglot_last_study', today);
    }
    
    setView('study');
  };

  const processReview = async (quality) => {
    const card = studyQueue[studyIndex];
    
    // Som de Feedback
    if (quality >= 4) audioSuccess.current.play();
    
    // XP Calculation
    if (quality > 0) addXp(quality * 2);

    // Algoritmo SRS Simplificado
    let nextInterval = 1;
    let nextEase = card.ease_factor || 2.5;
    let reviewCount = (card.review_count || 0) + 1;

    if (quality === 0) {
      reviewCount = 0;
      nextInterval = 0;
    } else {
      if (reviewCount === 1) nextInterval = 1;
      else if (reviewCount === 2) nextInterval = 6;
      else nextInterval = Math.round((card.interval || 1) * nextEase);
    }

    nextEase = Math.max(1.3, nextEase + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + nextInterval);

    if (supabase) {
      supabase.from('flashcards').update({
        next_review: nextDate.toISOString(),
        interval: nextInterval,
        ease_factor: nextEase,
        review_count: reviewCount
      }).match({ id: card.id }).then();
    }

    if (studyIndex < studyQueue.length - 1) {
      setStudyIndex(studyIndex + 1);
      setIsFlipped(false);
      setTypedAnswer('');
      setFeedbackStatus(null);
    } else {
      setView('home');
      alert(`Sessão Concluída! Você ganhou XP! 🚀`);
    }
  };

  const checkAnswer = (spokenText = null) => {
    setIsFlipped(true);
    const correct = studyQueue[studyIndex].front.toLowerCase().trim();
    const userTyped = (spokenText || typedAnswer).toLowerCase().trim();
    
    if (correct === userTyped) {
      setFeedbackStatus('correct');
      audioSuccess.current.play();
      addXp(5); // Bonus por acertar escrevendo/falando
    } else {
      setFeedbackStatus('wrong');
      audioFail.current.play();
    }
  };

  const speak = (text, lang, rate = 1.0, e) => {
    if (e) e.stopPropagation();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang === 'it' ? 'it-IT' : 'ca-ES';
      u.rate = rate;
      window.speechSynthesis.speak(u);
    }
  };

  const resetForm = () => {
    setFormData({ front: '', back: '', context: '', category: 'Geral', lang: 'it', image_url: '' });
    setEditingCard(null);
  };

  const startEdit = (card) => {
    setEditingCard(card);
    setFormData({
      front: card.front, back: card.back, context: card.context || '',
      category: card.category || 'Geral', lang: card.language, image_url: card.image_url || ''
    });
    setView('add');
  };

  // --- RENDERIZAÇÃO ---
  const filteredCards = cards.filter(c => 
    c.front.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.back.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${darkMode ? 'dark bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-md mx-auto bg-white dark:bg-gray-900 min-h-screen shadow-2xl flex flex-col relative">
        
        {/* HEADER */}
        <div className="p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 sticky top-0 z-30">
           <div className="flex justify-between items-center mb-2">
             <h1 className="text-xl font-black text-blue-600 dark:text-blue-400 flex items-center gap-2">
               <Languages className="text-yellow-500" /> PolyGlot <span className="text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200 px-2 py-1 rounded-full">v4.0</span>
             </h1>
             <div className="flex gap-2">
                <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full bg-gray-100 dark:bg-gray-800">
                  {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <button onClick={() => setView('settings')} className="p-2 rounded-full bg-gray-100 dark:bg-gray-800">
                  <Settings size={18} />
                </button>
             </div>
           </div>
           
           {/* BARRA DE XP E NÍVEL */}
           <div className="flex items-center gap-3 text-xs font-bold">
              <div className="flex items-center gap-1 text-orange-500 bg-orange-50 dark:bg-orange-900/30 px-2 py-1 rounded-lg">
                 <Flame size={14} /> {streak} Dias
              </div>
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 h-3 rounded-full overflow-hidden relative">
                 <div className="bg-green-500 h-full transition-all duration-1000" style={{ width: `${xp % 100}%` }}></div>
              </div>
              <div className="text-blue-600 dark:text-blue-400">Lvl {level}</div>
           </div>
        </div>

        {/* CONTEÚDO */}
        <div className="flex-1 p-4 overflow-y-auto scrollbar-hide pb-24">
          
          {/* HOME */}
          {view === 'home' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              {/* Status Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-2xl shadow-lg">
                  <div className="opacity-80 text-xs font-bold uppercase mb-1">Total Aprendido</div>
                  <div className="text-3xl font-black">{cards.length}</div>
                </div>
                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 flex flex-col justify-center">
                   <div className="flex justify-between text-sm font-bold mb-2">
                      <span className="text-green-600">🇮🇹 IT: {cards.filter(c=>c.language==='it').length}</span>
                      <span className="text-yellow-600">🟡 CA: {cards.filter(c=>c.language==='ca').length}</span>
                   </div>
                   <div className="w-full bg-gray-300 dark:bg-gray-600 h-2 rounded-full overflow-hidden">
                      <div className="bg-green-500 h-full" style={{ width: `${(cards.filter(c=>c.language==='it').length / (cards.length || 1)) * 100}%` }}></div>
                   </div>
                </div>
              </div>

              {/* Busca */}
              <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar..." 
                  className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Lista */}
              <div className="space-y-3">
                {filteredCards.map((card, idx) => (
                  <div key={idx} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm p-3 rounded-xl flex gap-3 items-center group">
                    {card.image_url && (
                      <img src={card.image_url} alt={card.front} className="w-12 h-12 rounded-lg object-cover bg-gray-100" />
                    )}
                    <div className="flex-1">
                      <div className="font-bold text-gray-800 dark:text-white text-lg leading-tight">{card.front}</div>
                      <div className="text-gray-500 dark:text-gray-400 text-sm">{card.back}</div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={(e) => speak(card.front, card.language, 1, e)} className="p-2 text-blue-500 bg-blue-50 dark:bg-blue-900/30 rounded-full">
                        <Volume2 size={16} />
                      </button>
                      <button onClick={() => startEdit(card)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(card.id)} className="p-2 text-red-400 hover:text-red-600">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ADD / EDIT */}
          {view === 'add' && (
            <div className="space-y-4 animate-in slide-in-from-bottom-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold dark:text-white">{editingCard ? 'Editar' : 'Criar'}</h2>
                <button onClick={() => setView('home')} className="text-gray-400"><X/></button>
              </div>

              <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                <button onClick={() => setFormData({...formData, lang: 'it'})} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${formData.lang === 'it' ? 'bg-white dark:bg-gray-600 shadow text-green-600 dark:text-green-400' : 'text-gray-400'}`}>Italiano</button>
                <button onClick={() => setFormData({...formData, lang: 'ca'})} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${formData.lang === 'ca' ? 'bg-white dark:bg-gray-600 shadow text-yellow-600 dark:text-yellow-400' : 'text-gray-400'}`}>Catalão</button>
              </div>

              <div className="space-y-3">
                <div className="relative">
                   <input type="text" placeholder="Palavra (Front)" className="w-full p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" value={formData.front} onChange={e => setFormData({...formData, front: e.target.value})} />
                   <button onClick={generateImage} className="absolute right-2 top-2 p-2 bg-purple-100 text-purple-600 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-purple-200" disabled={loading}>
                     <Sparkles size={14} /> {loading ? '...' : 'Gerar Imagem'}
                   </button>
                </div>
                
                {formData.image_url && (
                  <div className="relative w-full h-40 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                    <img src={formData.image_url} className="w-full h-full object-cover" alt="Preview" />
                    <button onClick={() => setFormData({...formData, image_url: ''})} className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full"><X size={14}/></button>
                  </div>
                )}

                <input type="text" placeholder="Tradução (Back)" className="w-full p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" value={formData.back} onChange={e => setFormData({...formData, back: e.target.value})} />
                <input type="text" placeholder="Contexto / Exemplo" className="w-full p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" value={formData.context} onChange={e => setFormData({...formData, context: e.target.value})} />
                <input type="text" placeholder="Categoria" className="w-full p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
              </div>

              <Button onClick={handleSaveCard} className="w-full mt-4" disabled={loading}>
                {loading ? 'Salvando...' : <><Save size={18} /> Salvar Cartão</>}
              </Button>
            </div>
          )}

          {/* STUDY MODE */}
          {view === 'study' && studyQueue.length > 0 && (
            <div className="h-full flex flex-col">
              <div className="flex-1 flex flex-col items-center justify-center relative">
                 
                 {/* CARD */}
                 <div className="w-full bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700 relative min-h-[400px] flex flex-col">
                    
                    {/* Imagem Hero */}
                    {studyQueue[studyIndex].image_url && (
                      <div className="h-40 w-full bg-gray-100 dark:bg-gray-700 relative">
                        <img src={studyQueue[studyIndex].image_url} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-gray-800 to-transparent"></div>
                      </div>
                    )}

                    <div className="p-6 flex-1 flex flex-col items-center text-center">
                       <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
                         {studyQueue[studyIndex].category} • {studyQueue[studyIndex].language.toUpperCase()}
                       </div>

                       <div className="text-4xl font-black text-gray-800 dark:text-white mb-6">
                         {studyQueue[studyIndex].front}
                       </div>

                       {/* Audio Controls */}
                       <div className="flex gap-4 mb-6">
                          <button onClick={() => speak(studyQueue[studyIndex].front, studyQueue[studyIndex].language, 0.5)} className="p-3 rounded-full bg-gray-100 dark:bg-gray-700 text-blue-500"><Turtle size={24}/></button>
                          <button onClick={() => speak(studyQueue[studyIndex].front, studyQueue[studyIndex].language, 1)} className="p-3 rounded-full bg-blue-500 text-white shadow-lg shadow-blue-500/30"><Volume2 size={24}/></button>
                       </div>

                       {/* Interactive Input */}
                       {!isFlipped ? (
                         <div className="w-full relative mt-auto">
                            <input 
                              type="text" 
                              placeholder="Escreva ou Fale..." 
                              className="w-full p-3 pl-4 pr-12 bg-gray-50 dark:bg-gray-700 rounded-xl border-2 border-transparent focus:border-blue-500 outline-none text-center dark:text-white"
                              value={typedAnswer}
                              onChange={e => setTypedAnswer(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && checkAnswer()}
                            />
                            {/* Microfone */}
                            <button onClick={startListening} className={`absolute right-2 top-2 p-1.5 rounded-lg ${feedbackStatus === 'listening' ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:text-blue-500'}`}>
                               <Mic size={20} />
                            </button>
                         </div>
                       ) : (
                         <div className="w-full mt-auto animate-in slide-in-from-bottom-2">
                            <div className={`p-3 rounded-xl mb-4 text-sm font-bold ${feedbackStatus === 'correct' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : feedbackStatus === 'wrong' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                               {feedbackStatus === 'correct' ? '🎯 Resposta Correta!' : feedbackStatus === 'wrong' ? `❌ Era: "${studyQueue[studyIndex].front}"` : 'Resposta Revelada'}
                            </div>
                            <div className="text-2xl font-bold text-gray-700 dark:text-gray-300 border-t dark:border-gray-700 pt-4">
                              {studyQueue[studyIndex].back}
                            </div>
                            {studyQueue[studyIndex].context && <div className="text-sm italic text-gray-500 mt-2">"{studyQueue[studyIndex].context}"</div>}
                         </div>
                       )}
                    </div>
                 </div>
              </div>

              {/* SRS Actions */}
              {isFlipped ? (
                 <div className="grid grid-cols-4 gap-2 mt-4">
                    <button onClick={() => processReview(0)} className="p-3 bg-red-100 text-red-600 rounded-xl font-bold flex flex-col items-center"><X size={20}/><span className="text-[10px] mt-1">Errei</span></button>
                    <button onClick={() => processReview(3)} className="p-3 bg-orange-100 text-orange-600 rounded-xl font-bold flex flex-col items-center"><span className="text-lg">😬</span><span className="text-[10px] mt-1">Difícil</span></button>
                    <button onClick={() => processReview(4)} className="p-3 bg-blue-100 text-blue-600 rounded-xl font-bold flex flex-col items-center"><span className="text-lg">🙂</span><span className="text-[10px] mt-1">Bom</span></button>
                    <button onClick={() => processReview(5)} className="p-3 bg-green-100 text-green-600 rounded-xl font-bold flex flex-col items-center"><Check size={20}/><span className="text-[10px] mt-1">Fácil</span></button>
                 </div>
              ) : (
                <Button onClick={() => checkAnswer()} className="w-full mt-4 bg-gray-800 dark:bg-gray-700 text-white py-4">Revelar</Button>
              )}
            </div>
          )}

          {/* SETTINGS */}
          {view === 'settings' && (
            <div className="space-y-4">
               <h2 className="text-2xl font-bold dark:text-white">Ajustes</h2>
               <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-xl space-y-2">
                 <label className="text-sm font-bold text-gray-500">Supabase URL</label>
                 <input type="text" value={config.url} onChange={e => setConfig({...config, url: e.target.value})} className="w-full p-2 rounded dark:bg-gray-700 dark:text-white" />
                 <label className="text-sm font-bold text-gray-500">Anon Key</label>
                 <input type="password" value={config.key} onChange={e => setConfig({...config, key: e.target.value})} className="w-full p-2 rounded dark:bg-gray-700 dark:text-white" />
                 <Button onClick={() => { localStorage.setItem('polyglot_config', JSON.stringify(config)); window.location.reload(); }} className="w-full mt-2">Salvar</Button>
               </div>
               <Button onClick={() => setView('home')} variant="ghost">Voltar</Button>
            </div>
          )}

        </div>

        {/* Floating Menu */}
        {view === 'home' && (
           <div className="absolute bottom-6 right-6 flex flex-col gap-4">
             <button onClick={startSession} className="bg-gray-900 dark:bg-blue-600 text-white p-4 rounded-full shadow-2xl hover:scale-105 transition-all flex items-center gap-2 pr-6">
               <BrainCircuit size={24} /> <span className="font-bold">Estudar</span>
             </button>
             <button onClick={() => { resetForm(); setView('add'); }} className="bg-blue-600 dark:bg-gray-700 text-white p-4 rounded-full shadow-xl hover:scale-105 transition-all self-end">
               <Plus size={24} />
             </button>
           </div>
        )}

      </div>
    </div>
  );
}
