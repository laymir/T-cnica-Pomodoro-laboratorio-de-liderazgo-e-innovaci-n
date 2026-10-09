import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  AlarmClock, ArrowRight, Award, BarChart3, BookOpen, Check, CheckCircle2,
  CircleHelp, ClipboardList, Clock, Coffee, Compass, Edit3, Flame,
  GraduationCap, Headphones, History, Layers, ListChecks, LogOut,
  Maximize2, Menu, Minimize2, Moon, Pause, Play, Plus, RotateCcw,
  Settings, ShieldCheck, Sparkles, Sun, Target, TimerReset, Trash2,
  TrendingUp, Volume2, VolumeX, X, Zap
} from 'lucide-react';
import { isSupabaseConfigured, supabase } from './supabaseClient';

// Matriz completa del Mapa de Experiencia del Usuario (Diego y Valeria)
const journeyPhases = [
  {
    id: 1,
    title: 'Identificar prioridades',
    need: 'Saber qué tarea debe realizar primero y evitar sentirse abrumado.',
    icon: Target,
    color: 'lavender',
    emoji: '😐',
    mood: 'Pensativo / Evaluando',
    activities: [
      'Hace una lista de tareas.',
      'Elige la más importante.',
      'Divide trabajos largos en pequeñas actividades.'
    ],
    channels: 'Agenda, lista de tareas y calendario digital.',
    expectations: 'Tener claro qué hacer primero y organizar sus prioridades.',
    quote: 'Ahora sé por dónde empezar.',
    opportunities: 'Incorporar una lista de prioridades sencilla y visual.'
  },
  {
    id: 2,
    title: 'Preparar la sesión',
    need: 'Estudiar con menos distracciones y estar preparado.',
    icon: ClipboardList,
    color: 'blue',
    emoji: '🙂',
    mood: 'Tranquilo / Preparado',
    activities: [
      'Silencia las notificaciones.',
      'Coloca el celular en modo concentración.',
      'Prepara materiales y agua.'
    ],
    channels: 'Celular, app Pomodoro, escritorio, audífonos.',
    expectations: 'Tener un ambiente adecuado y evitar interrupciones.',
    quote: 'Puedo concentrarme sin que el celular me distraiga.',
    opportunities: 'Incluir un modo de concentración y bloqueo de notificaciones.'
  },
  {
    id: 3,
    title: 'Iniciar Pomodoro',
    need: 'Concentrarse en una tarea concreta y comenzar sin postergar.',
    icon: AlarmClock,
    color: 'yellow',
    emoji: '😃',
    mood: 'Enfocado / Decidido',
    activities: [
      'Programar temporizador (25–30 min).',
      'Establecer un objetivo claro.',
      'Iniciar la actividad con intención.'
    ],
    channels: 'Temporizador, app móvil o alarma.',
    expectations: 'Mantener la atención durante el tiempo establecido.',
    quote: 'Solo necesito concentrarme en esta tarea durante unos minutos.',
    opportunities: 'Permitir elegir entre sesiones de 25 o 30 minutos según su necesidad.'
  },
  {
    id: 4,
    title: 'Trabajar y descansar',
    need: 'Mantener la concentración sin agotarse y sentirse motivado.',
    icon: Coffee,
    color: 'pink',
    emoji: '😆',
    mood: 'Animado / En ritmo',
    activities: [
      'Trabaja durante 25–30 min.',
      'Toma un descanso de 5 min (o adaptativo).',
      'Repite el ciclo según necesidad.'
    ],
    channels: 'Temporizador, celular y material de estudio.',
    expectations: 'Avanzar en las tareas sin sentirse demasiado cansado.',
    quote: 'Estoy avanzando poco a poco sin sentirme tan cansado.',
    opportunities: 'Adaptar los descansos según el nivel de cansancio del estudiante.'
  },
  {
    id: 5,
    title: 'Finalizar y revisar',
    need: 'Ver los avances y organizar lo pendiente.',
    icon: CheckCircle2,
    color: 'green',
    emoji: '😃',
    mood: 'Satisfecho / En control',
    activities: [
      'Revisa lo realizado.',
      'Marca las tareas terminadas.',
      'Planifica la siguiente sesión.'
    ],
    channels: 'Lista de tareas, calendario y notas personales.',
    expectations: 'Sentir que tiene mayor control de su tiempo y progreso.',
    quote: 'Terminé parte de mi trabajo y sé qué debo hacer después.',
    opportunities: 'Mostrar el progreso y las tareas completadas (carrusel o panel visual).'
  }
];

// Generador de sonidos zen y audio ambiental con Web Audio API nativa
function playAudioChime(type = 'finish', enabled = true) {
  if (!enabled) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;

    if (type === 'finish') {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + idx * 0.14);
        gain.gain.setValueAtTime(0, t + idx * 0.14);
        gain.gain.linearRampToValueAtTime(0.18, t + idx * 0.14 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + idx * 0.14 + 1.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t + idx * 0.14);
        osc.stop(t + idx * 0.14 + 1.25);
      });
    } else if (type === 'start') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.exponentialRampToValueAtTime(880, t + 0.12);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.15);
    }
  } catch (err) {
    console.warn('Audio no disponible:', err);
  }
}

// Generador de ruido ambiental blanco/lluvia suave para concentración
class AmbientNoiseGenerator {
  constructor() {
    this.ctx = null;
    this.source = null;
    this.gain = null;
    this.playing = false;
  }
  start() {
    if (this.playing) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      this.ctx = new AudioContextClass();
      if (this.ctx.state === 'suspended') this.ctx.resume();

      const bufferSize = 2 * this.ctx.sampleRate;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        output[i] = (b0 + b1 + b2) * 0.08;
      }
      this.source = this.ctx.createBufferSource();
      this.source.buffer = noiseBuffer;
      this.source.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(650, this.ctx.currentTime);

      this.gain = this.ctx.createGain();
      this.gain.gain.setValueAtTime(0.12, this.ctx.currentTime);

      this.source.connect(filter);
      filter.connect(this.gain);
      this.gain.connect(this.ctx.destination);
      this.source.start(0);
      this.playing = true;
    } catch (e) {
      console.warn('Ambient noise error:', e);
    }
  }
  stop() {
    if (!this.playing) return;
    try {
      if (this.source) {
        this.source.stop();
        this.source.disconnect();
      }
      if (this.ctx) this.ctx.close();
    } catch (e) {}
    this.playing = false;
  }
}

const ambientAudio = new AmbientNoiseGenerator();

function AuthScreen() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setMessage('');
    setError('');
    if (!isSupabaseConfigured) {
      setError('Primero configura las variables de Supabase en el archivo .env.local.');
      return;
    }
    setBusy(true);
    const result = mode === 'signup'
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (result.error) {
      setError(result.error.message);
    } else if (mode === 'signup') {
      setMessage('Cuenta creada con éxito. Si la confirmación está activa, revisa tu correo antes de iniciar sesión.');
    } else {
      setMessage('Inicio de sesión correcto.');
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-visual">
        <div className="brand">
          <span className="brand-mark"><GraduationCap size={22} /></span>
          <div className="brand-text">
            <span className="brand-main">Técnica Pomodoro</span>
            <span className="brand-sub">Laboratorio de liderazgo e innovación</span>
          </div>
        </div>
        <div className="auth-hero">
          <span className="eyebrow"><Sparkles size={15} /> ESTUDIA CON INTENCIÓN</span>
          <h1>Pequeños pasos.<br /><em>Grandes avances.</em></h1>
          <p>Más enfoque, menos estrés, mejores resultados. Adaptado para estudiantes con metas claras.</p>
          <div className="mini-map">
            {journeyPhases.map((p, i) => (
              <div className={`mini-phase ${p.color}`} key={p.title}>
                <span>{`0${i + 1}`}</span>
                <b>{p.title}</b>
              </div>
            ))}
          </div>
        </div>
        <div className="visual-footer"><ShieldCheck size={16} /> Tu espacio de estudio, a tu ritmo.</div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="mobile-brand brand">
            <span className="brand-mark"><GraduationCap size={22} /></span>
            <div className="brand-text">
              <span className="brand-main">Técnica Pomodoro</span>
              <span className="brand-sub">Laboratorio de liderazgo e innovación</span>
            </div>
          </div>
          <span className="eyebrow">TU ESPACIO DE CONCENTRACIÓN</span>
          <h2>{mode === 'login' ? 'Qué bueno verte.' : 'Crea tu cuenta.'}</h2>
          <p className="muted">
            {mode === 'login' ? 'Ingresa para continuar con tus objetivos.' : 'Empieza a construir hábitos de estudio saludables.'}
          </p>
          <form onSubmit={submit} className="auth-form">
            <label>
              Correo electrónico
              <input type="email" autoComplete="email" placeholder="tu@correo.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </label>
            <label>
              Contraseña
              <input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="Mínimo 6 caracteres" minLength={6} value={password} onChange={e => setPassword(e.target.value)} required />
            </label>
            <button className="button primary full" disabled={busy}>
              {busy ? 'Procesando…' : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'} <ArrowRight size={17} />
            </button>
          </form>
          {message && <div className="notice success">{message}</div>}
          {error && <div className="notice error">{error}</div>}
          <p className="switch-auth">
            {mode === 'login' ? '¿Todavía no tienes cuenta?' : '¿Ya tienes una cuenta?'}
            {' '}
            <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage(''); }}>
              {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
            </button>
          </p>
          <div className="privacy-note">
            <ShieldCheck size={16} /> Tus tareas están protegidas y cifradas de forma individual con RLS en Supabase.
          </div>
        </div>
      </section>
    </main>
  );
}

function Dashboard({ session }) {
  const userId = session.user.id;

  // Preferencias
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('pomodoro_ux_settings');
      return saved ? JSON.parse(saved) : { focusMinutes: 25, breakMinutes: 5, longBreakMinutes: 15, soundEnabled: true };
    } catch {
      return { focusMinutes: 25, breakMinutes: 5, longBreakMinutes: 15, soundEnabled: true };
    }
  });

  const [theme, setTheme] = useState(() => localStorage.getItem('pomodoro_ux_theme') || 'light');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('pomodoro_ux_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => (t === 'light' ? 'dark' : 'light'));

  const updateSettings = (key, value) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      localStorage.setItem('pomodoro_ux_settings', JSON.stringify(next));
      return next;
    });
  };

  // Navegación y estado general
  const [activeTab, setActiveTab] = useState('focus'); // 'focus' | 'stats' | 'settings'
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [zenMode, setZenMode] = useState(false);
  const [ambientActive, setAmbientActive] = useState(false);
  const [showMatrixModal, setShowMatrixModal] = useState(false);
  const [completedSessionModal, setCompletedSessionModal] = useState(null);

  // Tareas
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [priority, setPriority] = useState('Media');
  const [taskFilter, setTaskFilter] = useState('all');
  const [loadingTasks, setLoadingTasks] = useState(true);

  // Objetivo activo para el Pomodoro (Fase 1 y 3)
  const [targetTaskId, setTargetTaskId] = useState(null);

  // Edición de tarea
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPriority, setEditPriority] = useState('Media');

  // Subtareas locales en localStorage (Oportunidad Fase 1: dividir tareas largas)
  const [subtasksMap, setSubtasksMap] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('pomodoro_subtasks') || '{}');
    } catch {
      return {};
    }
  });

  const saveSubtasks = (taskId, newSubtasks) => {
    const updated = { ...subtasksMap, [taskId]: newSubtasks };
    setSubtasksMap(updated);
    localStorage.setItem('pomodoro_subtasks', JSON.stringify(updated));
  };

  const [expandedSubtaskId, setExpandedSubtaskId] = useState(null);
  const [newSubtaskInput, setNewSubtaskInput] = useState('');

  // Checklist de preparación (Fase 2)
  const [prepChecklist, setPrepChecklist] = useState({
    silenceNotifications: false,
    phoneFocusMode: false,
    materialsReady: false
  });

  const togglePrepItem = (key) => {
    setPrepChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Fases
  const [activePhaseIndex, setActivePhaseIndex] = useState(0);
  const currentPhase = journeyPhases[activePhaseIndex];

  // Temporizador
  const [timerMode, setTimerMode] = useState('focus'); // 'focus' | 'break' | 'longBreak'
  const [seconds, setSeconds] = useState(settings.focusMinutes * 60);
  const [running, setRunning] = useState(false);
  const [focusCount, setFocusCount] = useState(0);

  // Sesiones desde Supabase
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Duración según modo
  const currentDurationMinutes = useMemo(() => {
    if (timerMode === 'focus') return settings.focusMinutes;
    if (timerMode === 'break') return settings.breakMinutes;
    return settings.longBreakMinutes;
  }, [timerMode, settings]);

  // Audio ambiental toggle
  const toggleAmbientAudio = () => {
    if (ambientActive) {
      ambientAudio.stop();
      setAmbientActive(false);
    } else {
      ambientAudio.start();
      setAmbientActive(true);
    }
  };

  useEffect(() => {
    return () => ambientAudio.stop();
  }, []);

  // Cargar tareas de Supabase
  const loadTasks = useCallback(async () => {
    setLoadingTasks(true);
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (!error && data) {
      setTasks(data);
      if (data.length > 0 && !targetTaskId) {
        const firstUncompleted = data.find(t => !t.completed);
        if (firstUncompleted) setTargetTaskId(firstUncompleted.id);
      }
    }
    setLoadingTasks(false);
  }, [userId, targetTaskId]);

  // Cargar estadísticas
  const loadStats = useCallback(async () => {
    setLoadingSessions(true);
    const { data, error } = await supabase
      .from('pomodoro_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false });
    if (!error && data) {
      setSessions(data);
      const todayString = new Date().toDateString();
      const todayCount = data.filter(s => s.completed && new Date(s.started_at).toDateString() === todayString).length;
      setFocusCount(todayCount);
    }
    setLoadingSessions(false);
  }, [userId]);

  useEffect(() => {
    loadTasks();
    loadStats();
  }, [loadTasks, loadStats]);

  // Cambiar modo de temporizador manualmente
  const changeMode = (newMode, customMins = null) => {
    setRunning(false);
    setTimerMode(newMode);
    const mins = customMins || (newMode === 'focus' ? settings.focusMinutes : newMode === 'break' ? settings.breakMinutes : settings.longBreakMinutes);
    setSeconds(mins * 60);
  };

  // Preset rápido de minutos de enfoque (25 vs 30 min - Oportunidad Fase 3)
  const setQuickFocusDuration = (mins) => {
    updateSettings('focusMinutes', mins);
    if (timerMode === 'focus') {
      setRunning(false);
      setSeconds(mins * 60);
    }
    setNotice(`Duración de enfoque ajustada a ${mins} minutos.`);
  };

  // Guardar sesión en Supabase
  const saveSession = useCallback(async (duration) => {
    const { error } = await supabase.from('pomodoro_sessions').insert({
      user_id: userId,
      duration_minutes: duration,
      completed: true,
      finished_at: new Date().toISOString()
    });
    if (!error) {
      loadStats();
    }
  }, [userId, loadStats]);

  // Tarea objetivo actual
  const activeTask = tasks.find(t => t.id === targetTaskId);

  // Tiqueo del temporizador
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          window.clearInterval(timer);
          setRunning(false);

          playAudioChime('finish', settings.soundEnabled);

          if (timerMode === 'focus') {
            saveSession(settings.focusMinutes);
            setFocusCount(c => c + 1);

            // Abrir modal de revisión y carrusel de logros (Fase 5)
            setCompletedSessionModal({
              completedTask: activeTask,
              duration: settings.focusMinutes
            });

            // Si está en modo Zen, salir de él para revisar
            setZenMode(false);

            setTimerMode('break');
            return settings.breakMinutes * 60;
          } else {
            setTimerMode('focus');
            setNotice('Descanso terminado. ¿Listo para el siguiente Pomodoro?');
            return settings.focusMinutes * 60;
          }
        }
        return s - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [running, timerMode, settings, saveSession, activeTask]);

  const handleTogglePlay = () => {
    if (!running) {
      playAudioChime('start', settings.soundEnabled);
    }
    setRunning(v => !v);
  };

  const handleResetTimer = () => {
    setRunning(false);
    setSeconds(currentDurationMinutes * 60);
  };

  // Tareas: Crear
  async function addTask(e) {
    e.preventDefault();
    if (!newTask.trim()) return;
    const { data, error } = await supabase
      .from('tasks')
      .insert({ user_id: userId, title: newTask.trim(), priority })
      .select()
      .single();
    if (error) {
      setNotice('Error al guardar la tarea en Supabase.');
    } else {
      setTasks(old => [data, ...old]);
      if (!targetTaskId) setTargetTaskId(data.id);
      setNewTask('');
      setNotice('Tarea añadida con éxito.');
    }
  }

  // Tareas: Toggle completado
  async function toggleTask(task) {
    const { data, error } = await supabase
      .from('tasks')
      .update({ completed: !task.completed, updated_at: new Date().toISOString() })
      .eq('id', task.id)
      .select()
      .single();
    if (!error) {
      setTasks(old => old.map(t => (t.id === task.id ? data : t)));
    }
  }

  // Tareas: Iniciar edición
  function startEditing(task) {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditPriority(task.priority || 'Media');
  }

  // Tareas: Guardar edición
  async function saveEditedTask(taskId) {
    if (!editTitle.trim()) return;
    const { data, error } = await supabase
      .from('tasks')
      .update({ title: editTitle.trim(), priority: editPriority, updated_at: new Date().toISOString() })
      .eq('id', taskId)
      .select()
      .single();
    if (!error) {
      setTasks(old => old.map(t => (t.id === taskId ? data : t)));
      setEditingTaskId(null);
      setNotice('Tarea actualizada.');
    }
  }

  // Tareas: Eliminar
  async function deleteTask(id) {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (!error) {
      setTasks(old => old.filter(t => t.id !== id));
      if (targetTaskId === id) setTargetTaskId(null);
      setNotice('Tarea eliminada.');
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  // Subtareas (Oportunidad Fase 1: dividir tareas largas)
  const addSubtask = (taskId) => {
    if (!newSubtaskInput.trim()) return;
    const current = subtasksMap[taskId] || [];
    saveSubtasks(taskId, [...current, { id: Date.now(), title: newSubtaskInput.trim(), done: false }]);
    setNewSubtaskInput('');
  };

  const toggleSubtask = (taskId, subId) => {
    const current = subtasksMap[taskId] || [];
    saveSubtasks(taskId, current.map(st => st.id === subId ? { ...st, done: !st.done } : st));
  };

  // Métricas
  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  const progressPercent = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const totalFocusMinutes = useMemo(() => {
    return sessions.filter(s => s.completed).reduce((acc, s) => acc + (s.duration_minutes || 25), 0);
  }, [sessions]);

  const totalSessionsCount = useMemo(() => {
    return sessions.filter(s => s.completed).length;
  }, [sessions]);

  // Filtrado de tareas
  const filteredTasks = useMemo(() => {
    if (taskFilter === 'active') return tasks.filter(t => !t.completed);
    if (taskFilter === 'completed') return tasks.filter(t => t.completed);
    return tasks;
  }, [tasks, taskFilter]);

  const displayTime = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  const totalModeSeconds = currentDurationMinutes * 60;
  const timerProgress = totalModeSeconds > 0 ? (seconds / totalModeSeconds) * 100 : 0;

  return (
    <div className="app-shell">
      {/* VISTA MODO ZEN (PANTALLA LIMPIA - Oportunidad Fase 2) */}
      {zenMode && (
        <div className="zen-overlay">
          <div className="zen-header">
            <button
              className="button secondary"
              onClick={() => setZenMode(false)}
              title="Salir del Modo Concentración"
            >
              <Minimize2 size={16} /> Salir del Modo Zen
            </button>
          </div>

          <div className="zen-content">
            <span className="eyebrow"><Sparkles size={14} /> MODO CONCENTRACIÓN PURA</span>
            {activeTask ? (
              <div className="zen-objective-badge">
                🎯 {activeTask.title}
              </div>
            ) : (
              <p className="muted">Enfócate en tu objetivo actual</p>
            )}

            <div className="timer-ring" style={{ '--timer-progress': `${timerProgress}%`, width: 250, height: 250 }}>
              <div className="timer-inner">
                <span>{timerMode === 'focus' ? 'ENFOQUE INTENCIONAL' : 'PAUSA CONSCIENTE'}</span>
                <strong style={{ fontSize: 56 }}>{displayTime}</strong>
                <small>{running ? 'Flujo de estudio activo' : 'En pausa'}</small>
              </div>
            </div>

            <div className="timer-controls">
              <button className="button primary" onClick={handleTogglePlay} style={{ padding: '12px 24px', fontSize: 15 }}>
                {running ? <Pause size={18} /> : <Play size={18} />}
                {running ? 'Pausar' : 'Continuar'}
              </button>
              <button
                className={`button secondary ${ambientActive ? 'active' : ''}`}
                onClick={toggleAmbientAudio}
                title="Audio de lluvia suave para aislar distracciones"
              >
                <Headphones size={17} /> {ambientActive ? 'Audio ON' : 'Audio ambiental'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE FIN DE SESIÓN Y LOGROS (Oportunidad Fase 5) */}
      {completedSessionModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <span className="modal-badge"><Award size={15} /> ¡Pomodoro Completado!</span>
              <button className="icon-button" onClick={() => setCompletedSessionModal(null)}><X size={18} /></button>
            </div>

            <div className="celebration-box">
              <div className="celebration-emoji">🎉</div>
              <h3>¡Gran trabajo! Sesión terminada</h3>
              <p>Pequeños pasos, grandes avances. Completaste <b>{completedSessionModal.duration} min</b> de concentración.</p>
            </div>

            <div className="phase-quote-box">
              <Sparkles size={16} color="var(--purple)" />
              <em>"Terminé parte de mi trabajo y sé qué debo hacer después."</em>
            </div>

            {completedSessionModal.completedTask && (
              <div style={{ background: 'var(--bg-card-subtle)', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--line)' }}>
                <span className="eyebrow">OBJETIVO DE LA SESIÓN:</span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                  <b>{completedSessionModal.completedTask.title}</b>
                  <button
                    className="button-xs"
                    onClick={() => {
                      toggleTask(completedSessionModal.completedTask);
                      setCompletedSessionModal(prev => prev ? {
                        ...prev,
                        completedTask: { ...prev.completedTask, completed: !prev.completedTask.completed }
                      } : null);
                    }}
                  >
                    {completedSessionModal.completedTask.completed ? '✓ Terminada' : 'Marcar como terminada'}
                  </button>
                </div>
              </div>
            )}

            <div>
              <span className="eyebrow">ADAPTA TU DESCANSO SEGÚN TU CANSANCIO (FASE 4):</span>
              <div className="adaptive-breaks-grid" style={{ marginTop: 8 }}>
                <button
                  className="break-adaptive-btn"
                  onClick={() => { changeMode('break', 5); setCompletedSessionModal(null); }}
                >
                  <b>☕ Ligero (5m)</b>
                  <span>Estirarte y agua</span>
                </button>
                <button
                  className="break-adaptive-btn"
                  onClick={() => { changeMode('break', 10); setCompletedSessionModal(null); }}
                >
                  <b>🚶 Medio (10m)</b>
                  <span>Caminar un poco</span>
                </button>
                <button
                  className="break-adaptive-btn"
                  onClick={() => { changeMode('longBreak', 15); setCompletedSessionModal(null); }}
                >
                  <b>🌿 Profundo (15m)</b>
                  <span>Desconexión total</span>
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
              <button className="button primary full" onClick={() => setCompletedSessionModal(null)}>
                Continuar a mi espacio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MATRIZ COMPLETA DEL MAPA DE EXPERIENCIA (Diego y Valeria) */}
      {showMatrixModal && (
        <div className="modal-overlay">
          <div className="matrix-modal-card">
            <div className="modal-header">
              <div>
                <span className="eyebrow">DOCUMENTO PEDAGÓGICO</span>
                <h3 style={{ margin: '4px 0 0' }}>Mapa de Experiencia del Usuario (Diego y Valeria)</h3>
                <small className="muted">Técnica Pomodoro adaptada: pequeños pasos, grandes avances</small>
              </div>
              <button className="icon-button" onClick={() => setShowMatrixModal(false)}><X size={20} /></button>
            </div>

            <table className="matrix-table">
              <thead>
                <tr>
                  <th style={{ width: 110 }}>DIMENSIÓN</th>
                  {journeyPhases.map(p => (
                    <th key={p.id}>
                      <span style={{ fontSize: 10, opacity: 0.7 }}>0{p.id}</span><br />
                      {p.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="dim-label">🎯 Necesidades</td>
                  {journeyPhases.map(p => <td key={p.id}>{p.need}</td>)}
                </tr>
                <tr>
                  <td className="dim-label">📋 Actividades</td>
                  {journeyPhases.map(p => (
                    <td key={p.id}>
                      <ul style={{ margin: 0, paddingLeft: 14 }}>
                        {p.activities.map((a, i) => <li key={i}>{a}</li>)}
                      </ul>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="dim-label">📡 Canales</td>
                  {journeyPhases.map(p => <td key={p.id}>{p.channels}</td>)}
                </tr>
                <tr>
                  <td className="dim-label">🎯 Expectativas</td>
                  {journeyPhases.map(p => <td key={p.id}>{p.expectations}</td>)}
                </tr>
                <tr>
                  <td className="dim-label">🙂 Experiencia</td>
                  {journeyPhases.map(p => (
                    <td key={p.id}>
                      <span style={{ fontSize: 18 }}>{p.emoji}</span><br />
                      <small className="muted">{p.mood}</small>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="dim-label">⭐ Frase memorable</td>
                  {journeyPhases.map(p => <td key={p.id}><em>"{p.quote}"</em></td>)}
                </tr>
                <tr>
                  <td className="dim-label">💡 Oportunidades</td>
                  {journeyPhases.map(p => (
                    <td key={p.id} style={{ color: 'var(--purple)', fontWeight: 650 }}>
                      {p.opportunities}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* BARRA LATERAL */}
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="brand">
          <span className="brand-mark"><GraduationCap size={22} /></span>
          <div className="brand-text">
            <span className="brand-main">Técnica Pomodoro</span>
            <span className="brand-sub">Laboratorio de liderazgo e innovación</span>
          </div>
        </div>

        <div className="side-label">TU ESPACIO</div>
        <button
          className={`nav-item ${activeTab === 'focus' ? 'active' : ''}`}
          onClick={() => { setActiveTab('focus'); setMenuOpen(false); }}
        >
          <Target size={18} /> Mi enfoque
        </button>

        <button
          className="nav-item"
          onClick={() => {
            setActiveTab('focus');
            setMenuOpen(false);
            setTimeout(() => document.getElementById('tasks')?.scrollIntoView({ behavior: 'smooth' }), 50);
          }}
        >
          <ClipboardList size={18} /> Mis tareas
        </button>

        <button
          className={`nav-item ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => { setActiveTab('stats'); setMenuOpen(false); loadStats(); }}
        >
          <TrendingUp size={18} /> Mi progreso
        </button>

        <button
          className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => { setActiveTab('settings'); setMenuOpen(false); }}
        >
          <Settings size={18} /> Ajustes de tiempo
        </button>

        <div className="sidebar-bottom">
          <div className="tip-card">
            <span className="tip-icon"><Compass size={17} /></span>
            <b>Mapa pedagógico</b>
            <p>Descubre el proceso de Diego y Valeria paso a paso.</p>
            <button
              className="button-xs"
              style={{ marginTop: 8, width: '100%', justifyContent: 'center' }}
              onClick={() => setShowMatrixModal(true)}
            >
              Ver matriz completa
            </button>
          </div>

          <div className="user-chip">
            <div className="avatar">{(session.user.email || 'E').charAt(0).toUpperCase()}</div>
            <div className="user-info">
              <b>Mi cuenta</b>
              <span title={session.user.email}>{session.user.email}</span>
            </div>
            <button className="icon-button" title="Cerrar sesión" onClick={signOut}>
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="main-content">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMenuOpen(v => !v)}>
            <Menu size={20} />
          </button>

          <div>
            <span className="eyebrow">TU PANEL DE ESTUDIO</span>
            <h1>Hola, estudiante <span className="wave">✳</span></h1>
          </div>

          <div className="topbar-actions">
            <button
              className={`icon-button ${ambientActive ? 'active' : ''}`}
              onClick={toggleAmbientAudio}
              title={ambientActive ? 'Silenciar ruido ambiental de lluvia' : 'Activar audio ambiental relajante de concentración'}
            >
              <Headphones size={18} />
            </button>

            <button
              className="icon-button"
              onClick={() => updateSettings('soundEnabled', !settings.soundEnabled)}
              title={settings.soundEnabled ? 'Sonido de campana activado' : 'Sonido silenciado'}
            >
              {settings.soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>

            <button
              className="icon-button"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button
              className="button-xs"
              onClick={() => setZenMode(true)}
              title="Entrar en Modo Concentración / Pantalla limpia"
            >
              <Maximize2 size={13} /> Modo Zen
            </button>
          </div>
        </header>

        {/* Bienvenida y resumen */}
        <section className="welcome-row">
          <div>
            <p className="muted">Más enfoque, menos estrés, mejores resultados. Avanza a tu ritmo.</p>
            <h2>¿En qué te vas a enfocar hoy?</h2>
          </div>
          <div className="streak-pill">
            <Flame size={17} /> <b>{focusCount}</b> Pomodoros hoy
          </div>
        </section>

        {/* VISTA 1: ENFOQUE Y TAREAS */}
        {activeTab === 'focus' && (
          <>
            {/* MAPA DE EXPERIENCIA EDUCATIVA */}
            <section className="phase-section">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">TU MÉTODO, PASO A PASO</span>
                  <h3>Mapa de experiencia adaptado</h3>
                </div>
                <button className="button-xs" onClick={() => setShowMatrixModal(true)}>
                  <Layers size={13} /> Ver matriz de Diego y Valeria
                </button>
              </div>

              {/* Grid de 5 fases */}
              <div className="phase-grid">
                {journeyPhases.map((p, i) => {
                  const Icon = p.icon;
                  return (
                    <button
                      key={p.title}
                      onClick={() => {
                        setActivePhaseIndex(i);
                        document.getElementById('phase-detail-box')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                      }}
                      className={`phase-card ${p.color} ${activePhaseIndex === i ? 'selected' : ''}`}
                    >
                      <div className="phase-card-top">
                        <span className="phase-number">0{p.id}</span>
                        <span className="phase-emoji">{p.emoji}</span>
                        <Icon size={18} />
                      </div>
                      <b>{p.title}</b>
                      <span className="phase-link">
                        {activePhaseIndex === i ? 'Fase activa' : 'Ver detalle'} <ArrowRight size={12} />
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Detalle enriquecido de la fase seleccionada */}
              <div id="phase-detail-box" className="phase-detail-card">
                <div className="phase-detail-header">
                  <div className="phase-detail-lead">
                    <div className="detail-icon"><currentPhase.icon size={24} /></div>
                    <div>
                      <span className="eyebrow">FASE 0{currentPhase.id} · {currentPhase.mood} {currentPhase.emoji}</span>
                      <h4>{currentPhase.title}</h4>
                      <p>{currentPhase.need}</p>
                    </div>
                  </div>
                  <button
                    className="icon-button"
                    onClick={() => setActivePhaseIndex((activePhaseIndex + 1) % journeyPhases.length)}
                    title="Siguiente fase"
                  >
                    <ArrowRight size={18} />
                  </button>
                </div>

                <div className="phase-quote-box">
                  <Sparkles size={16} color="var(--purple)" />
                  <em>"{currentPhase.quote}"</em>
                </div>

                <div className="phase-columns">
                  <div className="phase-col">
                    <h5>Actividades clave</h5>
                    <ul>
                      {currentPhase.activities.map((a, idx) => <li key={idx}>{a}</li>)}
                    </ul>
                  </div>

                  <div className="phase-col">
                    <h5>Canales y Expectativa</h5>
                    <p><b>Canales:</b> {currentPhase.channels}</p>
                    <p style={{ marginTop: 4 }}><b>Expectativa:</b> {currentPhase.expectations}</p>
                  </div>

                  <div className="phase-col">
                    <h5>Oportunidad de diseño</h5>
                    <p style={{ color: 'var(--purple)', fontWeight: 600 }}>{currentPhase.opportunities}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* ESPACIO DE TRABAJO */}
            <section className="workspace-grid">
              {/* PANEL DE TEMPORIZADOR */}
              <div className="panel timer-panel">
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">MODO CONCENTRACIÓN</span>
                    <h3>Tu Pomodoro</h3>
                  </div>
                  <span className="small-muted">{ambientActive ? '🎧 Audio ambiental ON' : '💡 Concentración'}</span>
                </div>

                {/* Objetivo Activo del Pomodoro (Fase 1 & 3) */}
                <div className="active-objective-card">
                  <div className="objective-row">
                    <div>
                      <span className="eyebrow" style={{ fontSize: 9 }}>OBJETIVO DE ESTA SESIÓN:</span>
                      <div className="objective-title">
                        {activeTask ? `🎯 ${activeTask.title}` : 'Sin objetivo asignado'}
                      </div>
                    </div>

                    <select
                      className="objective-select"
                      value={targetTaskId || ''}
                      onChange={e => setTargetTaskId(e.target.value ? e.target.value : null)}
                      aria-label="Seleccionar objetivo activo"
                    >
                      <option value="">Seleccionar tarea...</option>
                      {tasks.filter(t => !t.completed).map(t => (
                        <option key={t.id} value={t.id}>{t.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Modos de temporizador */}
                <div className="timer-modes">
                  <button
                    className={`mode-pill ${timerMode === 'focus' ? 'active' : ''}`}
                    onClick={() => changeMode('focus')}
                  >
                    <Target size={13} /> Enfoque ({settings.focusMinutes}m)
                  </button>
                  <button
                    className={`mode-pill ${timerMode === 'break' ? 'active' : ''}`}
                    onClick={() => changeMode('break')}
                  >
                    <Coffee size={13} /> Pausa ({settings.breakMinutes}m)
                  </button>
                  <button
                    className={`mode-pill ${timerMode === 'longBreak' ? 'active' : ''}`}
                    onClick={() => changeMode('longBreak')}
                  >
                    <Sparkles size={13} /> Descanso ({settings.longBreakMinutes}m)
                  </button>
                </div>

                {/* Presets rápidos de 25m y 30m (Oportunidad Fase 3) */}
                {timerMode === 'focus' && (
                  <div className="quick-duration-presets">
                    <button
                      className={`duration-preset-btn ${settings.focusMinutes === 25 ? 'active' : ''}`}
                      onClick={() => setQuickFocusDuration(25)}
                    >
                      25 min estándar
                    </button>
                    <button
                      className={`duration-preset-btn ${settings.focusMinutes === 30 ? 'active' : ''}`}
                      onClick={() => setQuickFocusDuration(30)}
                    >
                      30 min extendido
                    </button>
                  </div>
                )}

                {/* Anillo del temporizador */}
                <div className="timer-ring" style={{ '--timer-progress': `${timerProgress}%` }}>
                  <div className="timer-inner">
                    <span>
                      {timerMode === 'focus' ? 'TIEMPO PARA TI' : timerMode === 'break' ? 'PAUSA BREVE' : 'DESCANSO LARGO'}
                    </span>
                    <strong>{displayTime}</strong>
                    <small>
                      {timerMode === 'focus' ? 'Un objetivo a la vez' : 'Respira y recarga energía'}
                    </small>
                  </div>
                </div>

                {/* Controles */}
                <div className="timer-controls">
                  <button className="button primary" onClick={handleTogglePlay}>
                    {running ? <Pause size={17} /> : <Play size={17} />}
                    {running ? 'Pausar' : 'Comenzar'}
                  </button>
                  <button className="button secondary" onClick={handleResetTimer}>
                    <RotateCcw size={16} /> Reiniciar
                  </button>
                </div>

                {/* Descansos Adaptativos según Cansancio (Oportunidad Fase 4) */}
                <div className="adaptive-breaks-box">
                  <div className="adaptive-breaks-title">
                    <Coffee size={13} />
                    <span>Descansos adaptativos según tu cansancio:</span>
                  </div>
                  <div className="adaptive-breaks-grid">
                    <button
                      className="break-adaptive-btn"
                      onClick={() => changeMode('break', 5)}
                      title="Pausa ligera de 5 min"
                    >
                      <b>☕ Ligero (5m)</b>
                      <span>Estirarte</span>
                    </button>
                    <button
                      className="break-adaptive-btn"
                      onClick={() => changeMode('break', 10)}
                      title="Recarga media de 10 min"
                    >
                      <b>🚶 Medio (10m)</b>
                      <span>Caminar / Agua</span>
                    </button>
                    <button
                      className="break-adaptive-btn"
                      onClick={() => changeMode('longBreak', 15)}
                      title="Descanso profundo de 15 min"
                    >
                      <b>🌿 Profundo (15m)</b>
                      <span>Desconexión</span>
                    </button>
                  </div>
                </div>

                <div className="timer-foot">
                  <TimerReset size={14} />
                  <span>Configuración: {settings.focusMinutes}m enfoque · {settings.breakMinutes}m pausa</span>
                </div>
              </div>

              {/* PANEL DE TAREAS */}
              <div className="panel tasks-panel" id="tasks">
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">ORGANIZA TUS PRIORIDADES</span>
                    <h3>Mis tareas <span className="count-badge">{totalTasks}</span></h3>
                  </div>
                  <span className="progress-label">{progressPercent}% completado</span>
                </div>

                <div className="progress-track">
                  <span style={{ width: `${progressPercent}%` }} />
                </div>

                {/* Checklist de Preparación de la Sesión (Fase 2) */}
                <div className="prep-checklist-box">
                  <div className="prep-header">
                    <b>Fase 02: Preparar la sesión</b>
                    <span className="small-muted">
                      {Object.values(prepChecklist).filter(Boolean).length}/3 listo
                    </span>
                  </div>
                  <label className={`prep-item ${prepChecklist.silenceNotifications ? 'checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={prepChecklist.silenceNotifications}
                      onChange={() => togglePrepItem('silenceNotifications')}
                    />
                    <span>Silenciar notificaciones y llamadas</span>
                  </label>
                  <label className={`prep-item ${prepChecklist.phoneFocusMode ? 'checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={prepChecklist.phoneFocusMode}
                      onChange={() => togglePrepItem('phoneFocusMode')}
                    />
                    <span>Colocar celular en modo concentración</span>
                  </label>
                  <label className={`prep-item ${prepChecklist.materialsReady ? 'checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={prepChecklist.materialsReady}
                      onChange={() => togglePrepItem('materialsReady')}
                    />
                    <span>Preparar materiales y vaso de agua</span>
                  </label>
                </div>

                {/* Filtros de tareas */}
                <div className="task-filters">
                  <button
                    className={`filter-btn ${taskFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setTaskFilter('all')}
                  >
                    Todas ({tasks.length})
                  </button>
                  <button
                    className={`filter-btn ${taskFilter === 'active' ? 'active' : ''}`}
                    onClick={() => setTaskFilter('active')}
                  >
                    Pendientes ({tasks.filter(t => !t.completed).length})
                  </button>
                  <button
                    className={`filter-btn ${taskFilter === 'completed' ? 'active' : ''}`}
                    onClick={() => setTaskFilter('completed')}
                  >
                    Completadas ({tasks.filter(t => t.completed).length})
                  </button>
                </div>

                {/* Formulario añadir tarea */}
                <form className="add-task-form" onSubmit={addTask}>
                  <input
                    value={newTask}
                    onChange={e => setNewTask(e.target.value)}
                    placeholder="¿Qué necesitas hacer? (ej. Leer capítulo 3)"
                    aria-label="Nueva tarea"
                    maxLength={160}
                  />
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value)}
                    aria-label="Prioridad"
                  >
                    <option>Alta</option>
                    <option>Media</option>
                    <option>Baja</option>
                  </select>
                  <button className="add-button" aria-label="Añadir tarea" title="Añadir tarea">
                    <Plus size={19} />
                  </button>
                </form>

                {/* Lista de tareas */}
                <div className="task-list">
                  {loadingTasks ? (
                    <p className="empty-state">Cargando tus tareas de Supabase…</p>
                  ) : filteredTasks.length === 0 ? (
                    <div className="empty-state">
                      <ClipboardList size={26} />
                      <b>No hay tareas en esta vista</b>
                      <span>{taskFilter === 'completed' ? 'Aún no has completado ninguna tarea.' : 'Añade una tarea para empezar.'}</span>
                    </div>
                  ) : (
                    filteredTasks.map(task => {
                      const isEditing = editingTaskId === task.id;
                      const isTarget = targetTaskId === task.id;
                      const subtasks = subtasksMap[task.id] || [];
                      const isSubtasksOpen = expandedSubtaskId === task.id;

                      return (
                        <div
                          className={`task-row ${task.completed ? 'done' : ''} ${isTarget ? 'is-target' : ''}`}
                          key={task.id}
                        >
                          {isEditing ? (
                            <div className="task-edit-box">
                              <input
                                autoFocus
                                value={editTitle}
                                onChange={e => setEditTitle(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') saveEditedTask(task.id);
                                  if (e.key === 'Escape') setEditingTaskId(null);
                                }}
                              />
                              <select value={editPriority} onChange={e => setEditPriority(e.target.value)}>
                                <option>Alta</option>
                                <option>Media</option>
                                <option>Baja</option>
                              </select>
                              <button className="icon-button" onClick={() => saveEditedTask(task.id)} title="Guardar">
                                <Check size={16} />
                              </button>
                              <button className="icon-button" onClick={() => setEditingTaskId(null)} title="Cancelar">
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            <div style={{ width: '100%' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <button
                                  className={`task-check ${task.completed ? 'checked' : ''}`}
                                  onClick={() => toggleTask(task)}
                                  aria-label={task.completed ? 'Marcar como pendiente' : 'Completar tarea'}
                                >
                                  {task.completed && <Check size={14} />}
                                </button>

                                <div className="task-copy">
                                  <span>{task.title}</span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <small className={`priority ${String(task.priority).toLowerCase()}`}>
                                      {task.priority || 'Media'}
                                    </small>
                                    {isTarget && (
                                      <span style={{ fontSize: 9, color: 'var(--purple)', fontWeight: 700 }}>
                                        🎯 Objetivo actual
                                      </span>
                                    )}
                                    {subtasks.length > 0 && (
                                      <span style={{ fontSize: 9, color: 'var(--muted)' }}>
                                        ({subtasks.filter(s => s.done).length}/{subtasks.length} pasos)
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="task-actions">
                                  <button
                                    className={`icon-button ${isTarget ? 'active' : ''}`}
                                    onClick={() => setTargetTaskId(isTarget ? null : task.id)}
                                    title={isTarget ? 'Quitar como objetivo' : 'Fijar como objetivo del Pomodoro'}
                                  >
                                    <Target size={15} />
                                  </button>

                                  <button
                                    className="icon-button"
                                    onClick={() => setExpandedSubtaskId(isSubtasksOpen ? null : task.id)}
                                    title="Dividir en subtareas (Fase 1)"
                                  >
                                    <ListChecks size={15} />
                                  </button>

                                  <button
                                    className="icon-button"
                                    onClick={() => startEditing(task)}
                                    title="Editar tarea"
                                  >
                                    <Edit3 size={15} />
                                  </button>

                                  <button
                                    className="icon-button"
                                    onClick={() => deleteTask(task.id)}
                                    title="Eliminar tarea"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </div>

                              {/* Acordeón de subtareas (Dividir trabajos largos - Oportunidad Fase 1) */}
                              {isSubtasksOpen && (
                                <div className="subtasks-box">
                                  <span className="eyebrow" style={{ fontSize: 9 }}>DIVIDIR EN PEQUEÑAS ACTIVIDADES:</span>
                                  {subtasks.map(st => (
                                    <div className={`subtask-row ${st.done ? 'checked' : ''}`} key={st.id}>
                                      <input
                                        type="checkbox"
                                        checked={st.done}
                                        onChange={() => toggleSubtask(task.id, st.id)}
                                      />
                                      <span>{st.title}</span>
                                    </div>
                                  ))}
                                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                                    <input
                                      style={{ flex: 1, padding: '4px 8px', fontSize: 11, borderRadius: 6, border: '1px solid var(--line)' }}
                                      placeholder="Añadir paso pequeño..."
                                      value={newSubtaskInput}
                                      onChange={e => setNewSubtaskInput(e.target.value)}
                                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubtask(task.id); } }}
                                    />
                                    <button className="button-xs" onClick={() => addSubtask(task.id)}>
                                      <Plus size={12} /> Paso
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="task-footer">
                  <CheckCircle2 size={15} />
                  <span>{completedTasks} de {totalTasks} tareas completadas</span>
                </div>
              </div>
            </section>
          </>
        )}

        {/* VISTA 2: ESTADÍSTICAS REALES (MI PROGRESO) */}
        {activeTab === 'stats' && (
          <div className="stats-view">
            <div className="section-heading">
              <div>
                <span className="eyebrow">HISTORIAL Y RENDIMIENTO</span>
                <h3>Mi progreso real</h3>
              </div>
              <button className="button secondary" onClick={loadStats}>
                <History size={16} /> Actualizar datos
              </button>
            </div>

            {/* Cuadrícula de métricas */}
            <div className="stats-cards-grid">
              <div className="stat-metric-card">
                <div className="stat-metric-header">
                  <span className="eyebrow">POMODOROS HOY</span>
                  <Flame size={20} />
                </div>
                <strong>{focusCount}</strong>
                <span>Sesiones terminadas hoy</span>
              </div>

              <div className="stat-metric-card">
                <div className="stat-metric-header">
                  <span className="eyebrow">TOTAL POMODOROS</span>
                  <Target size={20} />
                </div>
                <strong>{totalSessionsCount}</strong>
                <span>Registrados en Supabase</span>
              </div>

              <div className="stat-metric-card">
                <div className="stat-metric-header">
                  <span className="eyebrow">TIEMPO ENFOCADO</span>
                  <Clock size={20} />
                </div>
                <strong>{Math.floor(totalFocusMinutes / 60)}h {totalFocusMinutes % 60}m</strong>
                <span>Minutos de concentración</span>
              </div>

              <div className="stat-metric-card">
                <div className="stat-metric-header">
                  <span className="eyebrow">EFICACIA EN TAREAS</span>
                  <BarChart3 size={20} />
                </div>
                <strong>{progressPercent}%</strong>
                <span>{completedTasks} de {totalTasks} tareas hechas</span>
              </div>
            </div>

            {/* Historial de sesiones */}
            <div className="history-card">
              <div className="panel-heading" style={{ marginBottom: 16 }}>
                <div>
                  <span className="eyebrow">REGISTRO DE SESIONES</span>
                  <h4>Historial de concentración</h4>
                </div>
                <span className="small-muted">Guardado en Supabase</span>
              </div>

              {loadingSessions ? (
                <p className="empty-state">Consultando sesiones...</p>
              ) : sessions.length === 0 ? (
                <div className="empty-state">
                  <Clock size={28} />
                  <b>Sin sesiones registradas aún</b>
                  <span>Completa un Pomodoro para verlo reflejado aquí.</span>
                </div>
              ) : (
                <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                  {sessions.slice(0, 15).map(s => {
                    const date = new Date(s.started_at);
                    return (
                      <div className="session-item" key={s.id}>
                        <div className="session-left">
                          <span className="session-tag">Pomodoro</span>
                          <div>
                            <b>Sesión de estudio</b>
                            <span className="muted" style={{ display: 'block', fontSize: 11 }}>
                              {date.toLocaleDateString()} a las {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <b style={{ color: 'var(--purple)' }}>{s.duration_minutes || 25} min</b>
                          <span style={{ display: 'block', fontSize: 10, color: '#56be8b' }}>✓ Completado</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VISTA 3: AJUSTES */}
        {activeTab === 'settings' && (
          <div className="settings-view">
            <div>
              <span className="eyebrow">PERSONALIZACIÓN</span>
              <h3>Ajustes de tiempo y sonido</h3>
              <p className="muted">Personaliza la duración de tus ciclos de trabajo para adaptarlos a tu ritmo personal.</p>
            </div>

            <div className="settings-group">
              <h4>Duración de los intervalos</h4>

              <div className="settings-row">
                <div>
                  <span>Tiempo de Enfoque (minutos)</span>
                  <small>Por defecto 25 min (o 30 min según necesidad)</small>
                </div>
                <div className="settings-input-group">
                  <input
                    type="number"
                    min={5}
                    max={120}
                    value={settings.focusMinutes}
                    onChange={e => {
                      const val = Number(e.target.value) || 25;
                      updateSettings('focusMinutes', val);
                      if (timerMode === 'focus' && !running) setSeconds(val * 60);
                    }}
                  />
                  <small>min</small>
                </div>
              </div>

              <div className="settings-row">
                <div>
                  <span>Pausa corta (minutos)</span>
                  <small>Descanso breve tras cada Pomodoro (por defecto 5 min)</small>
                </div>
                <div className="settings-input-group">
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={settings.breakMinutes}
                    onChange={e => {
                      const val = Number(e.target.value) || 5;
                      updateSettings('breakMinutes', val);
                      if (timerMode === 'break' && !running) setSeconds(val * 60);
                    }}
                  />
                  <small>min</small>
                </div>
              </div>

              <div className="settings-row">
                <div>
                  <span>Descanso largo (minutos)</span>
                  <small>Pausa profunda cada 4 Pomodoros (por defecto 15 min)</small>
                </div>
                <div className="settings-input-group">
                  <input
                    type="number"
                    min={5}
                    max={60}
                    value={settings.longBreakMinutes}
                    onChange={e => {
                      const val = Number(e.target.value) || 15;
                      updateSettings('longBreakMinutes', val);
                      if (timerMode === 'longBreak' && !running) setSeconds(val * 60);
                    }}
                  />
                  <small>min</small>
                </div>
              </div>
            </div>

            <div className="settings-group">
              <h4>Audio y Notificaciones</h4>
              <div className="settings-row">
                <div>
                  <span>Campana Zen al terminar</span>
                  <small>Produce un tono armónico al finalizar cada sesión</small>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={settings.soundEnabled}
                    onChange={e => updateSettings('soundEnabled', e.target.checked)}
                  />
                  <span className="slider" />
                </label>
              </div>

              <div style={{ marginTop: 8 }}>
                <button
                  className="button secondary"
                  onClick={() => playAudioChime('finish', true)}
                >
                  <Volume2 size={16} /> Probar sonido de campana
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <button className="button primary" onClick={() => { setActiveTab('focus'); setNotice('Ajustes guardados.'); }}>
                Guardar y volver al enfoque
              </button>
            </div>
          </div>
        )}

        {/* Notificaciones flotantes */}
        {notice && (
          <div className="notice-bar">
            <CircleHelp size={17} />
            <span>{notice}</span>
            <button onClick={() => setNotice('')} title="Cerrar"><X size={16} /></button>
          </div>
        )}

        <footer className="app-footer">
          <span>Técnica Pomodoro · Laboratorio de liderazgo e innovación</span>
          <span>Diego y Valeria · Pequeños pasos, grandes avances.</span>
        </footer>
      </main>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setChecking(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (checking) {
    return (
      <div className="loading-screen">
        <div className="loading-mark"><GraduationCap /></div>
        <p>Preparando tu espacio…</p>
      </div>
    );
  }

  return session ? <Dashboard session={session} /> : <AuthScreen />;
}