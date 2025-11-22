import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, Plus, Settings, RotateCw, Check, X, 
  Languages, Save, Trash2, BrainCircuit, Volume2, 
  Search, Edit2, Flame, Turtle, Send, Mic, Image as ImageIcon,
  Moon, Sun, Trophy, BarChart3, Sparkles, Camera, Gamepad2,
  MessageCircle, FileText, Download, Upload, Table, History, AlertCircle,
  LogOut, ArrowLeft, Palette, Bell, Loader2, Calendar
} from 'lucide-react';

// --- GOOGLE FONTS & ESTILOS GLOBAIS ---
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap');
    body { font-family: 'Outfit', sans-serif; }
    .glass { background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(10px); }
    .dark .glass { background: rgba(17, 24, 39, 0.7); }
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    .gradient-text { background-clip: text; -webkit-background-clip: text; color: transparent; }
  `}</style>
);

// --- UTILS ---
const formatDate = (date) => new Date(date).toISOString().split('T')[0];

// --- COMPONENTES UI ---
const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, loading = false }) => {
  const baseStyle = "px-4 py-3 rounded-2xl font-bold transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-blue-500/20 disabled:opacity-70 disabled:cursor-not-allowed disabled:shadow-none";
  const variants = {
    primary: "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 border-0",
    secondary: "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700",
    success: "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700",
    danger: "bg-gradient-to-r from-red-500 to-rose-600 text-white hover:from-red-600 hover:to-rose-700",
    warning: "bg-gradient-to-r from-amber-400 to-orange-500 text-white hover:from-amber-500 hover:to-orange-600",
    purple: "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700",
    ghost: "bg-transparent text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 shadow-none"
  };
  return (
    <button onClick={onClick} disabled={disabled || loading} className={`${baseStyle} ${variants[variant]} ${className}`}>
      {loading ? <Loader2 className="animate-spin" size={20} /> : children}
    </button>
  );
};

const CardSkeleton = () => (
  <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm animate-pulse flex gap-4">
    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
    <div className="flex-1 space-y-2 py-1">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
    </div>
  </div>
);

// --- APP ---
export default function App() {
  // Globais
  const [view, setView] = useState('home');
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [accentColor, setAccentColor] = useState('blue'); // blue, purple, orange, pink
  
  // Gamificação
  const [streak, setStreak] = useState(0);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [dailyGoal, setDailyGoal] = useState({ target: 10, current: 0 }); // Novo: Desafio Diário
  
  // Supabase & Config
  const [supabase, setSupabase] = useState(null);
  const [isSupabaseLoaded, setIsSupabaseLoaded] = useState(false);
  const [config, setConfig] = useState({ url: '', key: '', openaiKey: '' });

  // Estados Temporários
  const [formData, setFormData] = useState({ front: '', back: '', context: '', category: 'Geral', lang: 'it', image_url: '' });
  const [editingCard, setEditingCard] = useState(null);
  
  // Chatbot & AI
  const [chatMessages, setChatMessages] = useState([{role: 'system', content: 'Sou seu professor de idiomas. Vamos conversar!'}]);
  const [chatInput, setChatInput] = useState('');
  const [aiStory, setAiStory] = useState('');
  const [verbData, setVerbData] = useState(null);

  // Estudo & Game
  const [studyQueue, setStudyQueue] = useState([]);
  const [studyIndex, setStudyIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState(null);
  const [memoryGameCards, setMemoryGameCards] = useState([]);
  const [memoryFlipped, setMemoryFlipped] = useState([]);
  const [memoryMatched, setMemoryMatched] = useState([]);

  // Refs
  const audioSuccess = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3'));
  const audioFail = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3'));

  // --- INICIALIZAÇÃO ---
  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    script.async = true;
    script.onload = () => setIsSupabaseLoaded(true);
    document.body.appendChild(script);

    // Load LocalStorage
    const savedConfig = localStorage.getItem('polyglot_config');
    if (savedConfig) setConfig(JSON.parse(savedConfig));

    const savedXP = parseInt(localStorage.getItem('polyglot_xp') || '0');
    setXp(savedXP);
    setLevel(Math.floor(savedXP / 100) + 1);

    const savedDark = localStorage.getItem('polyglot_dark');
    if (savedDark === 'true') setDarkMode(true);

    const savedAccent = localStorage.getItem('polyglot_accent');
    if (savedAccent) setAccentColor(savedAccent);

    // Check Streak & Daily Goal
    const lastStudy = localStorage.getItem('polyglot_last_study');
    const savedStreak = parseInt(localStorage.getItem('polyglot_streak') || '0');
    const today = formatDate(new Date());
    
    if (lastStudy === today) {
      setStreak(savedStreak);
      const savedDaily = localStorage.getItem('polyglot_daily_progress');
      if (savedDaily) setDailyGoal(JSON.parse(savedDaily));
    } else {
      // Novo dia, reseta meta diária
      setDailyGoal({ target: 10, current: 0 });
      localStorage.setItem('polyglot_daily_progress', JSON.stringify({ target: 10, current: 0 }));
      
      if (new Date() - new Date(lastStudy) < 172800000) {
        setStreak(savedStreak);
      } else {
        setStreak(0);
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
          fetchData(client);
        }
      } catch (e) { console.error(e); }
    }
  }, [isSupabaseLoaded, config]);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('polyglot_dark', darkMode);
  }, [darkMode]);

  // --- API CALLS ---
  const fetchData = async (client) => {
    setLoading(true);
    const { data: cardsData } = await client.from('flashcards').select('*').order('created_at', { ascending: false });
    if (cardsData) setCards(cardsData);
    
    const { data: activityData } = await client.from('study_activity').select('*');
    if (activityData) setActivityLog(activityData);
    setLoading(false);
  };

  // FIX: Tratamento de erro robusto para a OpenAI
  const callOpenAI = async (endpoint, body) => {
    if (!config.openaiKey) {
      alert("⚠️ Configure a API Key da OpenAI nos Ajustes para usar IA!");
      return null;
    }
    try {
      const res = await fetch(`https://api.openai.com/v1/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.openaiKey}` },
        body: JSON.stringify(body)
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "Erro na API");
      }
      
      return await res.json();
    } catch (error) {
      console.error("OpenAI Error:", error);
      alert(`Erro na IA: ${error.message}. Verifique seus créditos ou chave.`);
      return null;
    }
  };

  // --- REGISTRO DE ATIVIDADE (HEATMAP & DAILY GOAL) ---
  const logActivity = async (count = 1) => {
    // Update Daily Goal
    const newDaily = { ...dailyGoal, current: dailyGoal.current + count };
    setDailyGoal(newDaily);
    localStorage.setItem('polyglot_daily_progress', JSON.stringify(newDaily));
    
    // Notificação de Meta
    if (newDaily.current === newDaily.target) {
      alert("🎉 Parabéns! Meta diária cumprida! +50 XP");
      addXp(50);
    }

    if (supabase) {
      await supabase.from('study_activity').insert([{ count }]);
      // Atualiza logs locais sem recarregar tudo para ser mais fluido
      setActivityLog([...activityLog, { count, created_at: new Date().toISOString() }]);
    }
  };

  // --- FUNÇÕES DE IA ---
  const sendChatMessage = async () => {
    if(!chatInput.trim()) return;
    const msgs = [...chatMessages, { role: 'user', content: chatInput }];
    setChatMessages(msgs);
    setChatInput('');
    setLoading(true);
    const data = await callOpenAI('chat/completions', { model: "gpt-4o-mini", messages: msgs });
    if (data?.choices?.[0]?.message) setChatMessages([...msgs, data.choices[0].message]);
    setLoading(false);
  };

  const explainGrammar = async (text) => {
    setLoading(true);
    const data = await callOpenAI('chat/completions', { model: "gpt-4o-mini", messages: [{ role: 'user', content: `Explique a gramática desta frase em português: "${text}"` }] });
    if (data) alert(data.choices[0].message.content);
    setLoading(false);
  };

  const generateStory = async () => {
    setLoading(true);
    const words = cards.slice(0, 10).map(c => c.front).join(', ');
    const data = await callOpenAI('chat/completions', { model: "gpt-4o-mini", messages: [{ role: 'user', content: `Crie uma história muito curta (50 palavras) em Italiano usando estas palavras: ${words}.` }] });
    if (data) setAiStory(data.choices[0].message.content);
    setLoading(false);
  };

  // FIX: Conjugação Segura
  const conjugateVerb = async () => {
    const verb = prompt("Digite o verbo (ex: Essere):");
    if (!verb) return;
    setLoading(true);
    const data = await callOpenAI('chat/completions', {
      model: "gpt-4o-mini",
      messages: [{ role: 'user', content: `Conjugue "${verb}" em Italiano (Presente, Passado, Futuro). Retorne APENAS JSON válido no formato: {"presente": "...", "passado": "...", "futuro": "..."}.` }],
      response_format: { type: "json_object" }
    });
    
    if (data && data.choices && data.choices[0].message.content) {
        try {
            const parsed = JSON.parse(data.choices[0].message.content);
            setVerbData(parsed);
        } catch (e) {
            alert("Erro ao ler resposta da IA. Tente novamente.");
        }
    }
    setLoading(false);
  };

  const speakAI = async (text, lang) => {
    if (!config.openaiKey) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang === 'it' ? 'it-IT' : 'ca-ES';
      window.speechSynthesis.speak(u);
      return;
    }
    try {
      const res = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${config.openaiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'tts-1', input: text, voice: 'alloy' })
      });
      if(!res.ok) throw new Error("Erro TTS");
      const blob = await res.blob();
      const audio = new Audio(URL.createObjectURL(blob));
      audio.play();
    } catch (e) { 
        // Fallback silencioso para navegador se der erro de cota
        const u = new SpeechSynthesisUtterance(text);
        u.lang = lang === 'it' ? 'it-IT' : 'ca-ES';
        window.speechSynthesis.speak(u);
    }
  };

  const generateImage = () => {
    if (!formData.front) return alert("Digite uma palavra!");
    setLoading(true);
    const safeText = encodeURIComponent(formData.front);
    // Usando Pollinations com seed aleatória para variar
    const seed = Math.floor(Math.random() * 1000);
    const url = `https://image.pollinations.ai/prompt/minimalist%20illustration%20of%20${safeText}%20flat%20design%20vector?width=400&height=400&nologo=true&seed=${seed}`;
    setFormData({...formData, image_url: url});
    setLoading(false);
  };

  const handleCamera = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      setLoading(true);
      const data = await callOpenAI('chat/completions', {
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: [{ type: "text", text: "Identifique a palavra, traduza e categorize. JSON: {front, back, category}" }, { type: "image_url", image_url: { url: reader.result } }] }],
        response_format: { type: "json_object" }
      });
      if (data) {
        const res = JSON.parse(data.choices[0].message.content);
        setFormData({ ...formData, front: res.front, back: res.back, category: res.category });
      }
      setLoading(false);
    };
  };

  // --- GAME & STUDY ---
  const startMemoryGame = () => {
    const pool = cards.length > 0 ? cards : [];
    if (pool.length < 2) return alert("Adicione mais cartas!");
    const selected = [...pool].sort(() => 0.5 - Math.random()).slice(0, 6);
    const shuffled = selected.map(c => ({ ...c, uid: Math.random(), type: 'front' }))
      .concat(selected.map(c => ({ ...c, uid: Math.random(), type: 'back' })))
      .sort(() => 0.5 - Math.random());
    setMemoryGameCards(shuffled);
    setMemoryFlipped([]);
    setMemoryMatched([]);
    setView('game');
  };

  const handleMemoryClick = (card) => {
    if (memoryFlipped.length >= 2 || memoryMatched.includes(card.id) || memoryFlipped.includes(card)) return;
    const newFlipped = [...memoryFlipped, card];
    setMemoryFlipped(newFlipped);
    if (newFlipped.length === 2) {
      if (newFlipped[0].id === newFlipped[1].id) {
        setMemoryMatched([...memoryMatched, card.id]);
        audioSuccess.current.play();
        addXp(5);
        logActivity(1);
      } else {
        audioFail.current.play();
      }
      setTimeout(() => setMemoryFlipped([]), 1000);
    }
  };

  const startEdit = (card) => {
    setEditingCard(card);
    setFormData({
      front: card.front || '', back: card.back || '', context: card.context || '',
      category: card.category || 'Geral', lang: card.language || 'it', image_url: card.image_url || ''
    });
    setView('add');
  };

  const handleSaveCard = async () => {
    if (!formData.front) return alert("Preencha a palavra");
    setLoading(true);
    const payload = { ...formData };
    if (supabase) {
      if (editingCard) await supabase.from('flashcards').update(payload).match({ id: editingCard.id });
      else { await supabase.from('flashcards').insert([payload]); addXp(10); logActivity(1); }
      await fetchData(supabase);
      setView('home');
      setFormData({ front: '', back: '', context: '', category: 'Geral', lang: 'it', image_url: '' });
      setEditingCard(null);
    }
    setLoading(false);
  };

  const addXp = (amount) => {
    const newXp = xp + amount;
    setXp(newXp);
    setLevel(Math.floor(newXp / 100) + 1);
    localStorage.setItem('polyglot_xp', newXp);
  };

  const startSession = (mode) => {
    if (mode === 'handsfree') { setView('handsfree'); return; }
    const now = new Date();
    const toStudy = cards.filter(c => !c.next_review || new Date(c.next_review) <= now);
    setStudyQueue(toStudy.length > 0 ? toStudy : cards.slice(0, 10));
    setStudyIndex(0);
    setIsFlipped(false);
    setView('study');
  };

  const checkAnswer = () => {
    setIsFlipped(true);
    if (studyQueue[studyIndex].front.toLowerCase().trim() === typedAnswer.toLowerCase().trim()) {
      setFeedbackStatus('correct'); audioSuccess.current.play(); addXp(5);
    } else {
      setFeedbackStatus('wrong'); audioFail.current.play();
    }
  };

  const processReview = async (quality) => {
    const card = studyQueue[studyIndex];
    if (quality >= 4) audioSuccess.current.play();
    if (quality > 0) addXp(quality * 2);
    
    logActivity(1); 

    let nextInterval = 1, nextEase = card.ease_factor || 2.5, reviewCount = (card.review_count || 0) + 1;
    if (quality === 0) { reviewCount = 0; nextInterval = 0; }
    else {
      if (reviewCount === 1) nextInterval = 1; else if (reviewCount === 2) nextInterval = 6;
      else nextInterval = Math.round((card.interval || 1) * nextEase);
    }
    nextEase = Math.max(1.3, nextEase + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
    const nextDate = new Date(); nextDate.setDate(nextDate.getDate() + nextInterval);

    if (supabase) supabase.from('flashcards').update({ next_review: nextDate.toISOString(), interval: nextInterval, ease_factor: nextEase, review_count: reviewCount }).match({ id: card.id }).then();

    if (studyIndex < studyQueue.length - 1) {
      setStudyIndex(studyIndex + 1); setIsFlipped(false); setTypedAnswer(''); setFeedbackStatus(null);
    } else {
      setView('home'); alert(`Sessão Concluída! 🚀`);
    }
  };

  const requestNotification = () => {
    Notification.requestPermission().then(perm => {
      if(perm === 'granted') new Notification("PolyGlot", { body: "Lembretes ativados!" });
    });
  };

  // --- RENDER ---
  return (
    <>
      <GlobalStyles />
      <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'dark bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
        <div className="max-w-md mx-auto bg-white dark:bg-gray-900 min-h-screen shadow-2xl flex flex-col relative overflow-hidden">
          
          {/* HEADER GLASSMORPHISM */}
          <div className="p-4 sticky top-0 z-30 glass border-b border-gray-100 dark:border-gray-800">
             <div className="flex justify-between items-center mb-3">
               <h1 className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
                 <Languages className="text-orange-500" strokeWidth={2.5} /> PolyGlot 
               </h1>
               <div className="flex gap-2">
                  <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">{darkMode ? <Sun size={20} /> : <Moon size={20} />}</button>
                  <button onClick={() => setView('settings')} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><Settings size={20} /></button>
               </div>
             </div>
             
             {/* STATUS BAR */}
             <div className="flex items-center gap-3 text-xs font-bold bg-gray-50 dark:bg-gray-800/50 p-2 rounded-2xl border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-1 text-orange-500"><Flame size={16} fill="currentColor" /> {streak} Dias</div>
                <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
                <div className="flex-1 flex flex-col gap-1">
                   <div className="flex justify-between text-[10px] uppercase text-gray-400"><span>Lvl {level}</span><span>{xp % 100}/100 XP</span></div>
                   <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden"><div className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-1000" style={{ width: `${xp % 100}%` }}></div></div>
                </div>
             </div>
          </div>

          {/* CONTENT AREA */}
          <div className="flex-1 overflow-y-auto p-4 pb-28 scrollbar-hide">
            
            {/* HOME */}
            {view === 'home' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                
                {/* Daily Goal */}
                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-5 text-white shadow-xl shadow-purple-500/20 relative overflow-hidden">
                   <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-white opacity-10 rounded-full blur-xl"></div>
                   <h3 className="font-bold text-lg mb-1 flex items-center gap-2"><Calendar size={18}/> Meta Diária</h3>
                   <p className="text-purple-100 text-sm mb-4">Revise {dailyGoal.target} cartões hoje.</p>
                   <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-black/20 rounded-full overflow-hidden"><div className="bg-white h-full transition-all" style={{ width: `${Math.min(100, (dailyGoal.current / dailyGoal.target) * 100)}%` }}></div></div>
                      <span className="text-xs font-bold">{dailyGoal.current}/{dailyGoal.target}</span>
                   </div>
                </div>

                <div className="grid grid-cols-4 gap-3">
                   {[
                     { id: 'chat', icon: MessageCircle, label: 'Chat', color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' },
                     { id: 'story', icon: FileText, label: 'Story', color: 'text-pink-500 bg-pink-50 dark:bg-pink-900/20' },
                     { id: 'verbs', icon: Table, label: 'Verbos', color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' },
                     { id: 'game', icon: Gamepad2, label: 'Game', color: 'text-orange-500 bg-orange-50 dark:bg-orange-900/20' }
                   ].map(item => (
                     <button key={item.id} onClick={() => { 
                        if(item.id === 'verbs') setVerbData(null);
                        if(item.id === 'game') startMemoryGame();
                        else setView(item.id); 
                     }} className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-transform active:scale-95 ${item.color}`}>
                        <item.icon size={22} />
                        <span className="text-[10px] font-bold uppercase">{item.label}</span>
                     </button>
                   ))}
                </div>

                <div className="relative group">
                  <Search className="absolute left-4 top-3.5 text-gray-400 transition-colors group-focus-within:text-blue-500" size={20} />
                  <input type="text" placeholder="Buscar no seu vocabulário..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all" />
                </div>

                <div className="space-y-3 pb-4">
                  {loading ? <div className="space-y-3"><CardSkeleton/><CardSkeleton/></div> : (
                    cards.filter(c => c.front.toLowerCase().includes(searchTerm.toLowerCase())).map((card, idx) => (
                      <div key={idx} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm p-4 rounded-2xl flex gap-4 items-center hover:shadow-md transition-shadow">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${card.language === 'it' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                           {card.language === 'it' ? 'IT' : 'CA'}
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-gray-800 dark:text-white text-lg">{card.front}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{card.back}</div>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => speakAI(card.front, card.language)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-full transition-colors"><Volume2 size={18}/></button>
                          <button onClick={() => startEdit(card)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-full transition-colors"><Edit2 size={18}/></button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ADD / EDIT */}
            {view === 'add' && (
              <div className="space-y-5 animate-in slide-in-from-bottom duration-300">
                <div className="flex justify-between items-center"><h2 className="text-2xl font-bold gradient-text bg-gradient-to-r from-blue-600 to-purple-600">{editingCard ? 'Editar' : 'Novo Card'}</h2><button onClick={() => setView('home')} className="flex items-center text-gray-500 gap-1 font-medium hover:text-gray-800"><ArrowLeft size={20}/> Voltar</button></div>
                
                <div className="relative group">
                   <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><span className="text-gray-400 font-bold">A</span></div>
                   <input type="text" placeholder="Palavra em Italiano/Catalão" value={formData.front} onChange={e => setFormData({...formData, front: e.target.value})} className="w-full pl-10 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500 outline-none transition-all font-bold text-lg" />
                   <button onClick={generateImage} className="absolute right-2 top-2 p-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50" disabled={loading}><Sparkles size={18} /></button>
                </div>

                {formData.image_url && (
                  <div className="relative w-full h-48 rounded-2xl overflow-hidden shadow-inner bg-gray-100">
                    <img src={formData.image_url} className="w-full h-full object-cover" alt="Preview" />
                    <button onClick={() => setFormData({...formData, image_url: ''})} className="absolute top-3 right-3 bg-black/50 hover:bg-red-500 text-white p-2 rounded-full backdrop-blur-sm transition-colors"><X size={16}/></button>
                  </div>
                )}

                <div className="relative group">
                   <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><span className="text-gray-400 font-bold">PT</span></div>
                   <input type="text" placeholder="Tradução em Português" value={formData.back} onChange={e => setFormData({...formData, back: e.target.value})} className="w-full pl-10 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-green-500 outline-none transition-all" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                   <button onClick={() => setFormData({...formData, lang: 'it'})} className={`p-4 rounded-2xl font-bold border-2 transition-all ${formData.lang === 'it' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-100 dark:border-gray-700 text-gray-400'}`}>🇮🇹 Italiano</button>
                   <button onClick={() => setFormData({...formData, lang: 'ca'})} className={`p-4 rounded-2xl font-bold border-2 transition-all ${formData.lang === 'ca' ? 'border-yellow-500 bg-yellow-50 text-yellow-700' : 'border-gray-100 dark:border-gray-700 text-gray-400'}`}>🟡 Catalão</button>
                </div>

                <textarea placeholder="Frase de contexto (opcional)" value={formData.context} onChange={e => setFormData({...formData, context: e.target.value})} className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-blue-500 outline-none h-24 resize-none" />

                <div className="pt-4 flex gap-3">
                   <Button onClick={() => setView('home')} variant="ghost" className="flex-1">Cancelar</Button>
                   <Button onClick={handleSaveCard} className="flex-1" loading={loading}>Salvar</Button>
                </div>
              </div>
            )}

            {/* CHAT, STORY, VERBS */}
            {(view === 'chat' || view === 'story' || view === 'verbs') && (
               <div className="h-full flex flex-col animate-in fade-in">
                 <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold capitalize">{view}</h2><button onClick={()=>setView('home')} className="flex items-center gap-1 text-gray-500"><ArrowLeft size={18}/> Voltar</button></div>
                 
                 {view === 'chat' && (
                   <>
                     <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border border-gray-100 dark:border-gray-700">
                        {chatMessages.filter(m=>m.role!=='system').map((m,i) => (
                          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                             <div className={`p-3.5 rounded-2xl text-sm max-w-[85%] shadow-sm ${m.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white dark:bg-gray-700 dark:text-gray-200 rounded-tl-none'}`}>{m.content}</div>
                          </div>
                        ))}
                        {loading && <div className="flex justify-start"><div className="bg-gray-200 dark:bg-gray-700 p-3 rounded-2xl rounded-tl-none animate-pulse w-12 h-8"></div></div>}
                     </div>
                     <div className="flex gap-2 bg-white dark:bg-gray-800 p-2 rounded-2xl border dark:border-gray-700 shadow-lg">
                        <input type="text" value={chatInput} onChange={e=>setChatInput(e.target.value)} className="flex-1 p-3 bg-transparent outline-none" placeholder="Digite em Italiano..." onKeyDown={e=>e.key==='Enter'&&sendChatMessage()}/>
                        <button onClick={sendChatMessage} className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"><Send size={20}/></button>
                     </div>
                   </>
                 )}

                 {view === 'verbs' && (
                   <div className="space-y-6">
                     {verbData ? (
                       <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg border dark:border-gray-700 overflow-hidden">
                          <div className="bg-indigo-600 text-white p-4 text-center font-bold text-lg">ConjugaAI</div>
                          <div className="grid grid-cols-3 text-center divide-x divide-gray-100 dark:divide-gray-700 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                             <div className="p-3 text-xs font-bold text-gray-500 uppercase">Passado</div>
                             <div className="p-3 text-xs font-bold text-indigo-600 uppercase">Presente</div>
                             <div className="p-3 text-xs font-bold text-gray-500 uppercase">Futuro</div>
                          </div>
                          <div className="grid grid-cols-3 text-center divide-x divide-gray-100 dark:divide-gray-700">
                             <div className="p-4 text-sm">{verbData.passado || "-"}</div>
                             <div className="p-4 text-sm font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20">{verbData.presente || "-"}</div>
                             <div className="p-4 text-sm">{verbData.futuro || "-"}</div>
                          </div>
                       </div>
                     ) : (
                       <div className="text-center py-10 opacity-50">
                         <Table size={64} className="mx-auto mb-4 text-indigo-300"/>
                         <p>Digite um verbo para ver a mágica.</p>
                       </div>
                     )}
                     <Button onClick={conjugateVerb} variant="purple" className="w-full shadow-xl shadow-purple-500/30" loading={loading}><Sparkles size={18}/> Conjugador Mágico</Button>
                   </div>
                 )}
               </div>
            )}

            {/* GAME & STUDY */}
            {(view === 'study' || view === 'game') && (
               <div className="h-full flex flex-col">
                  <div className="flex justify-between items-center mb-6">
                     <span className="text-xs font-bold uppercase tracking-widest text-gray-400">{view === 'game' ? 'Memória' : 'Revisão'}</span>
                     <button onClick={() => setView('home')} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500 hover:bg-gray-200"><X size={20}/></button>
                  </div>
                  
                  {view === 'game' && (
                    <div className="flex-1 grid grid-cols-3 gap-3 content-center">
                       {memoryGameCards.map((card, i) => (
                          <div key={i} onClick={() => handleMemoryClick(card)} className={`aspect-square rounded-2xl flex items-center justify-center text-center text-xs p-2 cursor-pointer transition-all duration-500 transform ${memoryFlipped.includes(card) || memoryMatched.includes(card.id) ? 'bg-blue-600 text-white rotate-y-180 shadow-lg scale-105' : 'bg-blue-50 dark:bg-gray-800 text-transparent hover:bg-blue-100'}`}>
                             <span className={memoryFlipped.includes(card) || memoryMatched.includes(card.id) ? 'block' : 'hidden'}>{card.type === 'front' ? card.front : card.back}</span>
                          </div>
                       ))}
                    </div>
                  )}

                  {view === 'study' && studyQueue.length > 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center relative">
                       <div className="w-full bg-white dark:bg-gray-800 rounded-[2rem] shadow-2xl shadow-blue-900/20 overflow-hidden border border-gray-100 dark:border-gray-700 relative min-h-[450px] flex flex-col">
                          {studyQueue[studyIndex].image_url && (<div className="h-48 w-full bg-gray-100 dark:bg-gray-700 relative"><img src={studyQueue[studyIndex].image_url} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-white dark:from-gray-800 to-transparent"></div></div>)}
                          <div className="p-8 flex-1 flex flex-col items-center text-center relative z-10">
                             <div className="text-4xl font-extrabold text-gray-800 dark:text-white mb-8 mt-4 tracking-tight">{studyQueue[studyIndex].front}</div>
                             <button onClick={() => speakAI(studyQueue[studyIndex].front, studyQueue[studyIndex].language)} className="p-4 rounded-full bg-blue-500 text-white shadow-lg shadow-blue-500/40 hover:scale-110 transition-transform mb-8"><Volume2 size={32}/></button>
                             
                             {!isFlipped ? (
                               <div className="w-full mt-auto relative">
                                  <input type="text" placeholder="Digite a tradução..." className="w-full p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl outline-none text-center dark:text-white font-bold border-2 border-transparent focus:border-blue-500 transition-all" value={typedAnswer} onChange={e => setTypedAnswer(e.target.value)} onKeyDown={e => e.key === 'Enter' && checkAnswer()} />
                                  <p className="text-xs text-gray-400 mt-2">Pressione Enter para verificar</p>
                               </div>
                             ) : (
                               <div className="w-full mt-auto animate-in slide-in-from-bottom-4 fade-in">
                                  <div className="text-2xl font-bold text-gray-600 dark:text-gray-300 border-t border-gray-100 dark:border-gray-700 pt-6">{studyQueue[studyIndex].back}</div>
                                  {studyQueue[studyIndex].context && <div className="text-sm text-blue-500 mt-2 font-medium bg-blue-50 dark:bg-blue-900/20 py-1 px-3 rounded-full inline-block">"{studyQueue[studyIndex].context}"</div>}
                               </div>
                             )}
                          </div>
                       </div>
                    </div>
                  )}

                  {view === 'study' && isFlipped && (
                     <div className="grid grid-cols-4 gap-3 mt-6">
                        {[
                          { val: 0, emoji: '😡', label: 'Errei', color: 'bg-red-100 text-red-600' },
                          { val: 3, emoji: '😬', label: 'Difícil', color: 'bg-orange-100 text-orange-600' },
                          { val: 4, emoji: '🙂', label: 'Bom', color: 'bg-blue-100 text-blue-600' },
                          { val: 5, emoji: '😎', label: 'Fácil', color: 'bg-green-100 text-green-600' }
                        ].map((btn) => (
                          <button key={btn.val} onClick={() => processReview(btn.val)} className={`p-3 ${btn.color} rounded-2xl font-bold flex flex-col items-center gap-1 transition-transform active:scale-95`}>
                             <span className="text-xl">{btn.emoji}</span><span className="text-[10px] uppercase">{btn.label}</span>
                          </button>
                        ))}
                     </div>
                  )}
                  {view === 'study' && !isFlipped && <Button onClick={checkAnswer} className="w-full mt-6 py-4 text-lg shadow-xl">Mostrar Resposta</Button>}
               </div>
            )}

            {/* SETTINGS */}
            {view === 'settings' && (
               <div className="space-y-6 animate-in slide-in-from-right">
                  <div className="flex justify-between items-center"><h2 className="text-2xl font-bold">Ajustes</h2><button onClick={()=>setView('home')}><X/></button></div>
                  
                  <div className="bg-gray-50 dark:bg-gray-800 p-5 rounded-3xl space-y-4 border border-gray-100 dark:border-gray-700">
                     <h3 className="font-bold text-sm uppercase text-gray-400 mb-2">Conexões</h3>
                     <div>
                        <label className="text-xs font-bold text-gray-500 ml-1">Supabase URL</label>
                        <input type="text" value={config.url} onChange={e => setConfig({...config, url: e.target.value})} className="w-full p-3 mt-1 rounded-xl bg-white dark:bg-gray-700 border-2 border-transparent focus:border-blue-500 outline-none text-sm" />
                     </div>
                     <div>
                        <label className="text-xs font-bold text-gray-500 ml-1">Supabase Anon Key</label>
                        <input type="password" value={config.key} onChange={e => setConfig({...config, key: e.target.value})} className="w-full p-3 mt-1 rounded-xl bg-white dark:bg-gray-700 border-2 border-transparent focus:border-blue-500 outline-none text-sm" />
                     </div>
                     <div className="pt-2">
                        <label className="text-xs font-bold text-green-600 ml-1 flex items-center gap-1"><Sparkles size={12}/> OpenAI Key (Premium)</label>
                        <input type="password" placeholder="sk-..." value={config.openaiKey} onChange={e => setConfig({...config, openaiKey: e.target.value})} className="w-full p-3 mt-1 rounded-xl bg-white dark:bg-gray-700 border-2 border-green-500/30 focus:border-green-500 outline-none text-sm" />
                     </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800 p-5 rounded-3xl flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-full"><Bell size={20}/></div>
                        <div className="text-sm font-bold">Notificações de Estudo</div>
                     </div>
                     <Button variant="secondary" className="py-2 px-4 text-xs" onClick={requestNotification}>Ativar</Button>
                  </div>

                  <Button onClick={() => { localStorage.setItem('polyglot_config', JSON.stringify(config)); window.location.reload(); }} className="w-full py-4 shadow-xl">Salvar Alterações</Button>
               </div>
            )}

          </div>

          {/* FAB */}
          {view === 'home' && (
             <div className="absolute bottom-6 right-6 flex flex-col gap-4 z-40">
               <button onClick={() => setView('handsfree')} className="bg-gray-900 dark:bg-gray-700 text-white p-3 rounded-full shadow-xl hover:scale-110 transition-transform"><Volume2/></button>
               <button onClick={() => startSession('review')} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-full shadow-2xl shadow-blue-500/40 hover:scale-105 transition-all flex items-center gap-2 pr-6">
                 <BrainCircuit size={24} /> <span className="font-bold">Estudar</span>
               </button>
               <button onClick={() => { setEditingCard(null); setFormData({ front: '', back: '', context: '', category: 'Geral', lang: 'it', image_url: '' }); setView('add'); }} className="bg-white text-blue-600 border border-blue-100 p-4 rounded-full shadow-xl hover:scale-105 transition-all self-end">
                 <Plus size={24} />
               </button>
             </div>
          )}

        </div>
      </div>
    </>
  );
}
