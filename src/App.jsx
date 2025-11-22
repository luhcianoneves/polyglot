import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, Plus, Settings, RotateCw, Check, X, 
  Languages, Save, Trash2, BrainCircuit, Volume2, 
  Search, Edit2, Flame, Turtle, Send, Mic, Image as ImageIcon,
  Moon, Sun, Trophy, BarChart3, Sparkles, Camera, Gamepad2,
  MessageCircle, FileText, Download, Upload, Table, History, AlertCircle,
  LogOut
} from 'lucide-react';

// --- UTILS ---
const formatDate = (date) => new Date(date).toISOString().split('T')[0];

// --- COMPONENTES UI ---
const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, title = '' }) => {
  const baseStyle = "px-4 py-3 rounded-xl font-bold transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200 dark:shadow-none",
    secondary: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700",
    success: "bg-green-500 text-white hover:bg-green-600 shadow-green-200 dark:shadow-none",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-red-200 dark:shadow-none",
    warning: "bg-yellow-500 text-white hover:bg-yellow-600 shadow-yellow-200 dark:shadow-none",
    purple: "bg-purple-600 text-white hover:bg-purple-700 shadow-purple-200 dark:shadow-none",
    ghost: "text-gray-400 hover:bg-gray-100 hover:text-gray-700 bg-transparent shadow-none dark:hover:bg-gray-800 dark:text-gray-400"
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className}`} title={title}>
      {children}
    </button>
  );
};

// --- APP ---
export default function App() {
  // Globais
  const [view, setView] = useState('home');
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  
  // Gamificação
  const [streak, setStreak] = useState(0);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  
  // Supabase & Config
  const [supabase, setSupabase] = useState(null);
  const [isSupabaseLoaded, setIsSupabaseLoaded] = useState(false);
  const [config, setConfig] = useState({ url: '', key: '', openaiKey: '' });

  // Estados Temporários (Forms, Chat, Game)
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

    // Check Streak
    const lastStudy = localStorage.getItem('polyglot_last_study');
    const savedStreak = parseInt(localStorage.getItem('polyglot_streak') || '0');
    const today = formatDate(new Date());
    if (lastStudy === today || new Date() - new Date(lastStudy) < 172800000) {
      setStreak(savedStreak);
    } else {
      setStreak(0);
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

  const callOpenAI = async (endpoint, body) => {
    if (!config.openaiKey) {
      alert("Adicione sua API Key da OpenAI nas Configurações!");
      return null;
    }
    try {
      const res = await fetch(`https://api.openai.com/v1/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.openaiKey}`
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      return data;
    } catch (error) {
      alert("Erro na OpenAI: " + error.message);
      return null;
    }
  };

  // --- FUNÇÕES RESTAURADAS (IA) ---
  
  const sendChatMessage = async () => {
    if(!chatInput.trim()) return;
    const msgs = [...chatMessages, { role: 'user', content: chatInput }];
    setChatMessages(msgs);
    setChatInput('');
    setLoading(true);
    
    const data = await callOpenAI('chat/completions', {
      model: "gpt-4o-mini",
      messages: msgs
    });
    
    if (data?.choices?.[0]?.message) {
      setChatMessages([...msgs, data.choices[0].message]);
    }
    setLoading(false);
  };

  const explainGrammar = async (text) => {
    setLoading(true);
    const data = await callOpenAI('chat/completions', {
      model: "gpt-4o-mini",
      messages: [{ role: 'user', content: `Explique a gramática desta frase em português curto: "${text}"` }]
    });
    if (data) alert(data.choices[0].message.content);
    setLoading(false);
  };

  const generateStory = async () => {
    setLoading(true);
    const words = cards.slice(0, 10).map(c => c.front).join(', ');
    const data = await callOpenAI('chat/completions', {
      model: "gpt-4o-mini",
      messages: [{ role: 'user', content: `Crie uma história muito curta (50 palavras) em Italiano usando estas palavras: ${words}. Inclua tradução PT.` }]
    });
    if (data) setAiStory(data.choices[0].message.content);
    setLoading(false);
  };

  const conjugateVerb = async () => {
    const verb = prompt("Digite o verbo (ex: Essere):");
    if (!verb) return;
    setLoading(true);
    const data = await callOpenAI('chat/completions', {
      model: "gpt-4o-mini",
      messages: [{ role: 'user', content: `Conjugue "${verb}" em Italiano (Presente, Passado, Futuro). Retorne APENAS JSON formato: {presente: string, passado: string, futuro: string}.` }],
      response_format: { type: "json_object" }
    });
    if (data) setVerbData(JSON.parse(data.choices[0].message.content));
    setLoading(false);
  };

  // --- VOZ & AI ---
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
      const blob = await res.blob();
      const audio = new Audio(URL.createObjectURL(blob));
      audio.play();
    } catch (e) { console.error(e); }
  };

  // --- OCR & IMAGEM ---
  const generateImage = () => {
    if (!formData.front) return alert("Digite uma palavra primeiro!");
    setLoading(true);
    const safeText = encodeURIComponent(formData.front);
    const url = `https://image.pollinations.ai/prompt/minimalist%20illustration%20of%20${safeText}?width=400&height=400&nologo=true`;
    setFormData({...formData, image_url: url});
    setLoading(false);
  };

  const handleCamera = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64 = reader.result;
      setLoading(true);
      const data = await callOpenAI('chat/completions', {
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: [{ type: "text", text: "Identifique a palavra/frase, traduza e categorize. JSON: {front, back, category}" }, { type: "image_url", image_url: { url: base64 } }] }],
        response_format: { type: "json_object" }
      });
      if (data) {
        const res = JSON.parse(data.choices[0].message.content);
        setFormData({ ...formData, front: res.front, back: res.back, category: res.category });
      }
      setLoading(false);
    };
  };

  // --- GAME LOGIC ---
  const startMemoryGame = () => {
    const pool = cards.length > 0 ? cards : [];
    if (pool.length < 2) return alert("Adicione mais cartas para jogar!");
    
    const selected = [...pool].sort(() => 0.5 - Math.random()).slice(0, 6);
    
    const shuffled = selected.map(c => ({ ...c, uniqueId: Math.random(), type: 'front' }))
      .concat(selected.map(c => ({ ...c, uniqueId: Math.random(), type: 'back' })))
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
      } else {
        audioFail.current.play();
      }
      setTimeout(() => setMemoryFlipped([]), 1000);
    }
  };

  // --- CRUD HELPER ---
  const startEdit = (card) => {
    setEditingCard(card);
    setFormData({
      front: card.front || '',
      back: card.back || '',
      context: card.context || '',
      category: card.category || 'Geral',
      lang: card.language || 'it',
      image_url: card.image_url || ''
    });
    setView('add');
  };

  const handleSaveCard = async () => {
    if (!formData.front || !formData.back) return alert("Preencha os campos principais");
    setLoading(true);
    const payload = { front: formData.front, back: formData.back, context: formData.context, category: formData.category, language: formData.lang, image_url: formData.image_url };
    if (supabase) {
      if (editingCard) await supabase.from('flashcards').update(payload).match({ id: editingCard.id });
      else { await supabase.from('flashcards').insert([payload]); addXp(10); }
      await fetchData(supabase);
      setView('home');
      setFormData({ front: '', back: '', context: '', category: 'Geral', lang: 'it', image_url: '' });
      setEditingCard(null);
    }
    setLoading(false);
  };

  // --- GAMIFICAÇÃO & ESTUDO ---
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

  // --- RENDER ---
  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${darkMode ? 'dark bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-md mx-auto bg-white dark:bg-gray-900 min-h-screen shadow-2xl flex flex-col relative">
        
        {/* HEADER */}
        <div className="p-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800 sticky top-0 z-30">
           <div className="flex justify-between items-center mb-2">
             <h1 className="text-xl font-black text-blue-600 dark:text-blue-400 flex items-center gap-2">
               <Languages className="text-yellow-500" /> PolyGlot <span className="text-[10px] bg-green-600 text-white px-2 py-1 rounded-full">v5.2</span>
             </h1>
             <div className="flex gap-2">
                <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full bg-gray-100 dark:bg-gray-800">{darkMode ? <Sun size={18} /> : <Moon size={18} />}</button>
                <button onClick={() => setView('settings')} className="p-2 rounded-full bg-gray-100 dark:bg-gray-800"><Settings size={18} /></button>
             </div>
           </div>
           <div className="flex items-center gap-3 text-xs font-bold">
              <div className="flex items-center gap-1 text-orange-500 bg-orange-50 dark:bg-orange-900/30 px-2 py-1 rounded-lg"><Flame size={14} /> {streak}</div>
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 h-2 rounded-full"><div className="bg-green-500 h-full" style={{ width: `${xp % 100}%` }}></div></div>
              <div className="text-blue-500">Lvl {level}</div>
           </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 pb-24 scrollbar-hide">
          
          {/* HOME */}
          {view === 'home' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="grid grid-cols-2 gap-3">
                 <div onClick={() => setView('dashboard')} className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg cursor-pointer active:scale-95 transition-transform">
                    <div className="text-xs opacity-80 uppercase font-bold">Perfil & Stats</div>
                    <div className="text-2xl font-black flex items-center gap-2"><Trophy size={24}/> {xp} XP</div>
                 </div>
                 <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-2xl flex flex-col justify-center border dark:border-gray-700">
                    <div className="text-xs font-bold mb-1">Total: {cards.length}</div>
                    <div className="text-xs text-gray-500">🇮🇹 {cards.filter(c=>c.language==='it').length} • 🟡 {cards.filter(c=>c.language==='ca').length}</div>
                 </div>
              </div>

              <h3 className="font-bold text-gray-500 text-xs uppercase tracking-widest">AI Laboratory</h3>
              <div className="grid grid-cols-4 gap-2">
                 <button onClick={() => setView('chat')} className="flex flex-col items-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-purple-600 dark:text-purple-400"><MessageCircle size={20}/><span className="text-[10px] mt-1">Chat</span></button>
                 <button onClick={() => setView('story')} className="flex flex-col items-center p-3 bg-pink-50 dark:bg-pink-900/20 rounded-xl text-pink-600 dark:text-pink-400"><FileText size={20}/><span className="text-[10px] mt-1">Story</span></button>
                 <button onClick={() => { setView('verbs'); setVerbData(null); }} className="flex flex-col items-center p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-indigo-600 dark:text-indigo-400"><Table size={20}/><span className="text-[10px] mt-1">Verbos</span></button>
                 <button onClick={startMemoryGame} className="flex flex-col items-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl text-orange-600 dark:text-orange-400"><Gamepad2 size={20}/><span className="text-[10px] mt-1">Game</span></button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                <input type="text" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" />
              </div>

              <div className="space-y-3">
                {cards.filter(c => c.front.toLowerCase().includes(searchTerm.toLowerCase())).map((card, idx) => (
                  <div key={idx} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm p-3 rounded-xl flex gap-3 items-center">
                    <div className="flex-1">
                      <div className="font-bold text-gray-800 dark:text-white">{card.front}</div>
                      <div className="text-xs text-gray-500">{card.back}</div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => speakAI(card.front, card.language)} className="p-2 text-blue-500 bg-blue-50 dark:bg-blue-900/30 rounded-full"><Volume2 size={16}/></button>
                      <button onClick={() => startEdit(card)} className="p-2 text-gray-400"><Edit2 size={16}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ADD / EDIT */}
          {view === 'add' && (
            <div className="space-y-4 animate-in slide-in-from-bottom">
              <div className="flex justify-between"><h2 className="text-xl font-bold">{editingCard ? 'Editar' : 'Novo'}</h2><button onClick={() => setView('home')}><X/></button></div>
              <div className="relative">
                 <input type="text" placeholder="Palavra (Front)" value={formData.front} onChange={e => setFormData({...formData, front: e.target.value})} className="w-full p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none" />
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
              <input type="text" placeholder="Tradução" value={formData.back} onChange={e => setFormData({...formData, back: e.target.value})} className="w-full p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none" />
              <input type="text" placeholder="Contexto" value={formData.context} onChange={e => setFormData({...formData, context: e.target.value})} className="w-full p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none" />
              <Button onClick={handleSaveCard} className="w-full mt-4">Salvar</Button>
            </div>
          )}

          {/* STUDY MODE */}
          {view === 'study' && studyQueue.length > 0 && (
            <div className="h-full flex flex-col">
              {/* FIX: Botão de Voltar no topo do modo Estudo */}
              <div className="flex justify-between items-center mb-4">
                 <div className="text-xs uppercase font-bold text-gray-400">Revisão</div>
                 <button onClick={() => setView('home')} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500"><X size={20}/></button>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center relative">
                 <div className="w-full bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700 relative min-h-[400px] flex flex-col">
                    {studyQueue[studyIndex].image_url && (
                      <div className="h-40 w-full bg-gray-100 dark:bg-gray-700 relative">
                        <img src={studyQueue[studyIndex].image_url} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="p-6 flex-1 flex flex-col items-center text-center">
                       <div className="text-4xl font-black text-gray-800 dark:text-white mb-6">{studyQueue[studyIndex].front}</div>
                       <div className="flex gap-4 mb-6">
                          <button onClick={() => speakAI(studyQueue[studyIndex].front, studyQueue[studyIndex].language)} className="p-3 rounded-full bg-blue-500 text-white shadow-lg"><Volume2 size={24}/></button>
                       </div>
                       {!isFlipped ? (
                         <div className="w-full relative mt-auto">
                            <input type="text" placeholder="Escreva..." className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl outline-none text-center dark:text-white" value={typedAnswer} onChange={e => setTypedAnswer(e.target.value)} onKeyDown={e => e.key === 'Enter' && checkAnswer()} />
                         </div>
                       ) : (
                         <div className="w-full mt-auto">
                            <div className="text-2xl font-bold text-gray-700 dark:text-gray-300 border-t dark:border-gray-700 pt-4">{studyQueue[studyIndex].back}</div>
                            {studyQueue[studyIndex].context && <div className="text-sm italic text-gray-500 mt-2">"{studyQueue[studyIndex].context}"</div>}
                         </div>
                       )}
                    </div>
                 </div>
              </div>
              {isFlipped ? (
                 <div className="grid grid-cols-4 gap-2 mt-4">
                    <button onClick={() => processReview(0)} className="p-3 bg-red-100 text-red-600 rounded-xl font-bold flex flex-col items-center"><X size={20}/><span className="text-[10px]">Errei</span></button>
                    <button onClick={() => processReview(3)} className="p-3 bg-orange-100 text-orange-600 rounded-xl font-bold flex flex-col items-center">😬</button>
                    <button onClick={() => processReview(4)} className="p-3 bg-blue-100 text-blue-600 rounded-xl font-bold flex flex-col items-center">🙂</button>
                    <button onClick={() => processReview(5)} className="p-3 bg-green-100 text-green-600 rounded-xl font-bold flex flex-col items-center"><Check size={20}/><span className="text-[10px]">Fácil</span></button>
                 </div>
              ) : <Button onClick={() => checkAnswer()} className="w-full mt-4 bg-gray-800 dark:bg-gray-700 text-white py-4">Revelar</Button>}
            </div>
          )}

          {/* HANDS FREE */}
          {view === 'handsfree' && (
            <div className="h-full flex flex-col items-center justify-center space-y-8 text-center relative">
               <button onClick={()=>setView('home')} className="absolute top-0 right-0 p-2 text-gray-400"><X/></button>
               <div className="animate-pulse p-8 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600"><Volume2 size={64}/></div>
               <h2 className="text-2xl font-bold">Modo Hands-Free</h2>
               <p className="text-gray-500">Ouvindo e repetindo suas palavras...</p>
               <Button onClick={()=>setView('home')} variant="danger">Parar</Button>
            </div>
          )}

          {/* MEMORY GAME */}
          {view === 'game' && (
             <div className="space-y-4 h-full flex flex-col">
                <div className="flex justify-between"><h2 className="font-bold">Memória</h2><button onClick={()=>setView('home')}><X/></button></div>
                <div className="grid grid-cols-3 gap-2 flex-1 content-start">
                   {memoryGameCards.map((card, i) => (
                      <div key={i} onClick={() => handleMemoryClick(card)} 
                           className={`aspect-square rounded-xl flex items-center justify-center text-center text-xs p-1 cursor-pointer transition-all duration-300 ${
                              memoryFlipped.includes(card) || memoryMatched.includes(card.id) 
                              ? 'bg-blue-600 text-white rotate-y-180' 
                              : 'bg-blue-100 dark:bg-gray-800 text-transparent'
                           }`}>
                           {(memoryFlipped.includes(card) || memoryMatched.includes(card.id)) && (card.type === 'front' ? card.front : card.back)}
                      </div>
                   ))}
                </div>
             </div>
          )}

          {/* CHAT, STORY, VERBS, SETTINGS, DASHBOARD */}
          {(view === 'chat' || view === 'story' || view === 'verbs' || view === 'settings' || view === 'dashboard') && (
             <div className="h-full flex flex-col">
               <div className="flex justify-between items-center mb-4">
                 <h2 className="font-bold capitalize">{view === 'dashboard' ? 'Perfil' : view}</h2>
                 <button onClick={()=>setView('home')}><X/></button>
               </div>
               
               {view === 'chat' && (
                 <>
                   <div className="flex-1 overflow-y-auto space-y-3 mb-4 p-2 bg-gray-50 dark:bg-gray-800 rounded-xl">
                      {chatMessages.filter(m=>m.role!=='system').map((m,i) => <div key={i} className={`p-3 rounded-xl text-sm max-w-[80%] ${m.role === 'user' ? 'bg-blue-600 text-white ml-auto' : 'bg-white dark:bg-gray-700 border dark:border-gray-600'}`}>{m.content}</div>)}
                   </div>
                   <div className="flex gap-2">
                      <input type="text" value={chatInput} onChange={e=>setChatInput(e.target.value)} className="flex-1 p-3 rounded-xl border dark:bg-gray-800 dark:border-gray-700 outline-none" onKeyDown={e=>e.key==='Enter'&&sendChatMessage()}/>
                      <button onClick={sendChatMessage} className="p-3 bg-blue-600 text-white rounded-xl"><Send size={20}/></button>
                   </div>
                 </>
               )}

               {view === 'story' && (
                 <>
                   <div className="p-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800 text-lg font-serif leading-relaxed">
                      {aiStory || "Clique abaixo para gerar uma história..."}
                   </div>
                   <Button onClick={generateStory} disabled={loading} variant="warning" className="w-full mt-4"><Sparkles size={18}/> Gerar História</Button>
                 </>
               )}

               {view === 'verbs' && (
                 <>
                   {verbData ? (
                     <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden mb-4">
                        <div className="grid grid-cols-3 bg-gray-100 dark:bg-gray-700 p-2 font-bold text-xs uppercase"><div>Passado</div><div>Presente</div><div>Futuro</div></div>
                        <div className="grid grid-cols-3 p-4 text-sm gap-4"><div>{verbData.passado}</div><div className="font-bold text-blue-600">{verbData.presente}</div><div>{verbData.futuro}</div></div>
                     </div>
                   ) : <div className="text-center py-10 text-gray-400">Carregando...</div>}
                   <Button onClick={conjugateVerb} variant="secondary" className="w-full">Conjugador</Button>
                 </>
               )}

               {view === 'settings' && (
                 <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-xl space-y-3">
                   <label className="text-xs font-bold text-gray-500 uppercase">Supabase</label>
                   <input type="text" placeholder="Project URL" value={config.url} onChange={e => setConfig({...config, url: e.target.value})} className="w-full p-2 rounded dark:bg-gray-700 dark:text-white text-sm" />
                   <input type="password" placeholder="Anon Key" value={config.key} onChange={e => setConfig({...config, key: e.target.value})} className="w-full p-2 rounded dark:bg-gray-700 dark:text-white text-sm" />
                   <label className="text-xs font-bold text-green-600 uppercase flex items-center gap-1"><Sparkles size={12}/> OpenAI Key</label>
                   <input type="password" placeholder="sk-..." value={config.openaiKey} onChange={e => setConfig({...config, openaiKey: e.target.value})} className="w-full p-2 rounded border-green-200 dark:bg-gray-700 dark:text-white text-sm" />
                   <Button onClick={() => { localStorage.setItem('polyglot_config', JSON.stringify(config)); window.location.reload(); }} className="w-full mt-2">Salvar Tudo</Button>
                 </div>
               )}

               {view === 'dashboard' && (
                 <>
                   <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border dark:border-gray-700 mb-4">
                     <h3 className="font-bold mb-4 flex items-center gap-2"><BarChart3 size={18}/> Atividade Recente</h3>
                     <div className="flex gap-1 h-24 items-end justify-between">
                        {[...Array(7)].map((_, i) => {
                           const day = new Date(); day.setDate(day.getDate() - (6 - i));
                           const dayStr = formatDate(day);
                           const act = activityLog.find(a => new Date(a.created_at).toISOString().split('T')[0] === dayStr);
                           const height = act ? Math.min(100, act.count * 5) : 5;
                           return <div key={i} className="w-8 bg-blue-100 dark:bg-gray-700 rounded-t-lg relative group"><div className="absolute bottom-0 w-full bg-blue-500 rounded-t-lg" style={{ height: `${height}%` }}></div></div>
                        })}
                     </div>
                   </div>
                   <Button onClick={exportData} variant="secondary" className="w-full"><Download size={18}/> Backup</Button>
                 </>
               )}
             </div>
          )}

        </div>

        {/* FAB */}
        {view === 'home' && (
           <div className="absolute bottom-6 right-6 flex flex-col gap-4">
             <button onClick={() => setView('handsfree')} className="bg-gray-800 text-white p-3 rounded-full shadow-lg"><Volume2/></button>
             <button onClick={() => startSession('review')} className="bg-blue-600 text-white p-4 rounded-full shadow-2xl hover:scale-105 transition-all flex items-center gap-2 pr-6">
               <BrainCircuit size={24} /> <span className="font-bold">Estudar</span>
             </button>
             <button onClick={() => { setEditingCard(null); setFormData({ front: '', back: '', context: '', category: 'Geral', lang: 'it', image_url: '' }); setView('add'); }} className="bg-white text-blue-600 border border-blue-100 p-4 rounded-full shadow-xl hover:scale-105 transition-all self-end">
               <Plus size={24} />
             </button>
           </div>
        )}

      </div>
    </div>
  );
}
