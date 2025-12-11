import React, { useState, useMemo, useEffect } from 'react';
import { Plus, X, Calendar, ChevronLeft, ChevronRight, User, MoreHorizontal, Check, Pencil, FolderOpen } from 'lucide-react';

// --- DATA STORAGE (LOCAL STORAGE) ---
const STORAGE_KEYS = {
  tasks: 'task-manager-tasks',
  artists: 'task-manager-artists'
};

// --- HELPER FUNCTIONS ---

const normalizeDate = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatDateForInput = (date) => {
  if (!date) return '';
  return date.toISOString().split('T')[0];
};

const getRelativeDate = (daysOffset) => {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d;
};

const getPositionStyles = (startDate, endDate, viewStart, viewEnd) => {
  const start = normalizeDate(startDate).getTime();
  const end = normalizeDate(endDate).getTime();
  const vStart = normalizeDate(viewStart).getTime();
  const vEnd = normalizeDate(viewEnd).getTime();

  const totalDuration = vEnd - vStart;
  
  let relativeStart = (start - vStart) / totalDuration;
  let relativeDuration = (end - start) / totalDuration;

  if (relativeStart > 1 || (relativeStart + relativeDuration) < 0) {
     return { display: 'none' };
  }

  if (relativeStart < 0) {
    relativeDuration += relativeStart;
    relativeStart = 0;
  }

  const widthPercent = Math.max(0, relativeDuration * 100);
  
  return {
    left: `${relativeStart * 100}%`,
    width: `${widthPercent}%`
  };
};

// --- DATA & CONSTANTS ---

const COLOR_MAP = {
  green: { pale: 'bg-emerald-200', vivid: 'bg-emerald-500' },
  yellow: { pale: 'bg-amber-200', vivid: 'bg-amber-500' },
  red: { pale: 'bg-rose-200', vivid: 'bg-rose-600' },
  blue: { pale: 'bg-sky-200', vivid: 'bg-sky-500' },
  orange: { pale: 'bg-orange-200', vivid: 'bg-orange-500' },
  purple: { pale: 'bg-purple-200', vivid: 'bg-purple-500' },
};

const INITIAL_ARTISTS = ['Salini', 'Jeki'];

// Seed data for fresh users
const SEED_TASKS = [
  {
    id: 'seed-1',
    artist: 'Salini',
    name: 'Xmas Guide',
    briefing: 'Create the main visual guide for the Xmas campaign.',
    folderUrl: 'https://drive.google.com',
    startDate: getRelativeDate(-5),
    deadline: getRelativeDate(20),
    phases: [
      { id: 'p1', name: 'Draft', endDate: getRelativeDate(0), color: 'green', progress: 100 },
      { id: 'p2', name: 'Refine', endDate: getRelativeDate(10), color: 'yellow', progress: 40 },
      { id: 'p3', name: 'Final', endDate: getRelativeDate(20), color: 'red', progress: 0 },
    ]
  },
  {
    id: 'seed-2',
    artist: 'Jeki',
    name: 'Apparel',
    briefing: 'Winter clothing line showcase assets.',
    folderUrl: '',
    startDate: getRelativeDate(-2),
    deadline: getRelativeDate(15),
    phases: [
      { id: 'p1', name: 'Sketch', endDate: getRelativeDate(3), color: 'blue', progress: 80 },
      { id: 'p2', name: 'Vector', endDate: getRelativeDate(10), color: 'green', progress: 0 },
      { id: 'p3', name: 'Render', endDate: getRelativeDate(15), color: 'orange', progress: 0 },
    ]
  }
];

// --- COMPONENTS ---

const TaskForm = ({ isOpen, onClose, onSave, artists, onAddArtist, initialData }) => {
  const [formData, setFormData] = useState({
    artist: '',
    taskName: '',
    briefing: '',
    folderUrl: '',
    startDate: formatDateForInput(new Date()),
    deadline: '',
    phases: [{ endDate: '', name: 'Phase 1', progress: 0 }]
  });
  const [newArtistName, setNewArtistName] = useState('');
  const [isAddingArtist, setIsAddingArtist] = useState(false);

  // Initialize form when opening
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          artist: initialData.artist,
          taskName: initialData.name,
          briefing: initialData.briefing,
          folderUrl: initialData.folderUrl || '',
          startDate: formatDateForInput(initialData.startDate),
          deadline: formatDateForInput(initialData.deadline),
          phases: initialData.phases.map(p => ({
            ...p,
            endDate: formatDateForInput(p.endDate)
          }))
        });
      } else {
        // Default new task
        setFormData({
          artist: artists[0] || 'Artist',
          taskName: '',
          briefing: '',
          folderUrl: '',
          startDate: formatDateForInput(new Date()),
          deadline: '',
          phases: [{ endDate: '', name: 'Phase 1', progress: 0 }]
        });
      }
    }
  }, [isOpen, initialData, artists]);

  if (!isOpen) return null;

  const handleAddPhase = () => {
    setFormData(prev => ({
      ...prev,
      phases: [...prev.phases, { endDate: '', name: `Phase ${prev.phases.length + 1}`, progress: 0 }]
    }));
  };

  const handlePhaseChange = (idx, field, value) => {
    const newPhases = [...formData.phases];
    newPhases[idx][field] = value;
    setFormData(prev => ({ ...prev, phases: newPhases }));
  };

  const handleRemovePhase = (idx) => {
    const newPhases = formData.phases.filter((_, i) => i !== idx);
    setFormData(prev => ({ ...prev, phases: newPhases }));
  };

  const handleSubmit = () => {
    if (!formData.taskName || !formData.startDate) return;

    // Ensure phases are sorted by date
    const sortedPhases = [...formData.phases].sort((a, b) => {
        const dateA = new Date(a.endDate).getTime();
        const dateB = new Date(b.endDate).getTime();
        return dateA - dateB;
    });

    const newTask = {
      id: initialData ? initialData.id : String(Date.now()),
      artist: formData.artist,
      name: formData.taskName,
      briefing: formData.briefing,
      folderUrl: formData.folderUrl,
      startDate: new Date(formData.startDate),
      deadline: new Date(formData.deadline || sortedPhases[sortedPhases.length - 1]?.endDate || formData.startDate),
      phases: sortedPhases.map((p, idx) => ({
        id: p.id || `p-${Date.now()}-${idx}`,
        name: p.name,
        color: p.color || Object.keys(COLOR_MAP)[idx % Object.keys(COLOR_MAP).length],
        progress: p.progress || 0,
        endDate: new Date(p.endDate)
      }))
    };
    onSave(newTask);
    onClose();
  };

  const saveNewArtist = () => {
    if(newArtistName) {
      onAddArtist(newArtistName);
      setFormData({...formData, artist: newArtistName});
      setNewArtistName('');
      setIsAddingArtist(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-pink-100 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border-4 border-white max-h-[90vh] flex flex-col">
        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800 uppercase tracking-wider">
              {initialData ? 'Edit Task' : 'New Task'}
            </h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
              <X size={24} />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Artist:</label>
              <div className="flex gap-2">
                {!isAddingArtist ? (
                  <select 
                    className="flex-1 rounded-lg border-none p-2 shadow-sm focus:ring-2 focus:ring-pink-400"
                    value={formData.artist}
                    onChange={(e) => {
                      if (e.target.value === 'ADD_NEW') setIsAddingArtist(true);
                      else setFormData({...formData, artist: e.target.value});
                    }}
                  >
                    {artists.map(a => <option key={a} value={a}>{a}</option>)}
                    <option value="ADD_NEW">+ Add New Artist</option>
                  </select>
                ) : (
                  <div className="flex gap-2 flex-1">
                    <input 
                      autoFocus
                      type="text" 
                      placeholder="Name" 
                      className="flex-1 rounded-lg border-none p-2 shadow-sm"
                      value={newArtistName}
                      onChange={(e) => setNewArtistName(e.target.value)}
                    />
                    <button onClick={saveNewArtist} className="bg-white p-2 rounded-lg shadow-sm hover:bg-gray-50 text-green-600"><Check size={18} /></button>
                    <button onClick={() => setIsAddingArtist(false)} className="bg-white p-2 rounded-lg shadow-sm hover:bg-gray-50 text-red-500"><X size={18} /></button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Task Name:</label>
              <input 
                type="text" 
                className="w-full rounded-lg border-none p-2 shadow-sm focus:ring-2 focus:ring-pink-400"
                value={formData.taskName}
                onChange={(e) => setFormData({...formData, taskName: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Folder URL:</label>
              <input 
                type="url" 
                placeholder="https://drive.google.com/..."
                className="w-full rounded-lg border-none p-2 shadow-sm focus:ring-2 focus:ring-pink-400 text-sm"
                value={formData.folderUrl}
                onChange={(e) => setFormData({...formData, folderUrl: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Briefing:</label>
              <textarea 
                rows={3}
                className="w-full rounded-lg border-none p-2 shadow-sm focus:ring-2 focus:ring-pink-400 resize-none"
                value={formData.briefing}
                onChange={(e) => setFormData({...formData, briefing: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Start Date:</label>
                <input 
                  type="date" 
                  className="w-full rounded-lg border-none p-2 shadow-sm"
                  value={formData.startDate}
                  onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                />
              </div>
               <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Final Deadline:</label>
                <input 
                  type="date" 
                  className="w-full rounded-lg border-none p-2 shadow-sm"
                  value={formData.deadline}
                  onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                />
              </div>
            </div>

            <div className="bg-white/50 p-3 rounded-lg space-y-2">
              <label className="block text-xs font-bold uppercase text-gray-700">Phases:</label>
              {formData.phases.map((phase, idx) => (
                <div key={idx} className="flex gap-2 items-center group">
                  <span className="text-xs font-bold text-gray-500 w-6">{idx + 1}.</span>
                  <input 
                    type="date" 
                    className="flex-1 rounded border-none text-sm p-1 shadow-sm"
                    value={phase.endDate}
                    onChange={(e) => handlePhaseChange(idx, 'endDate', e.target.value)}
                  />
                  <input 
                    type="text" 
                    placeholder="Desc"
                    className="flex-1 rounded border-none text-sm p-1 shadow-sm"
                    value={phase.name}
                    onChange={(e) => handlePhaseChange(idx, 'name', e.target.value)}
                  />
                  <button 
                    onClick={() => handleRemovePhase(idx)}
                    className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button 
                onClick={handleAddPhase}
                className="text-xs font-bold text-pink-600 hover:text-pink-800 flex items-center gap-1 mt-2"
              >
                ADD PHASE <Plus size={14} />
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button 
              onClick={handleSubmit}
              className="flex-1 bg-white text-gray-900 font-bold py-2 rounded-lg shadow-sm hover:bg-gray-50 uppercase tracking-widest text-sm"
            >
              {initialData ? 'Update' : 'Accept'}
            </button>
            <button 
              onClick={onClose}
              className="flex-1 bg-transparent border-2 border-white text-gray-600 font-bold py-2 rounded-lg hover:bg-white/20 uppercase tracking-widest text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Timeline = ({ tasks, onUpdateProgress, onEditTask }) => {
  const [viewStart, setViewStart] = useState(getRelativeDate(-10));
  const daysToShow = 40; 
  
  const viewEnd = useMemo(() => {
    const end = new Date(viewStart);
    end.setDate(end.getDate() + daysToShow);
    return end;
  }, [viewStart]);

  const today = new Date();
  const [activePhase, setActivePhase] = useState(null); 

  const calendarDays = useMemo(() => {
    const days = [];
    let current = new Date(viewStart);
    for (let i = 0; i < daysToShow; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  }, [viewStart, daysToShow]);

  const handlePhaseClick = (taskId, phaseId, currentProgress, e) => {
    e.stopPropagation();
    setActivePhase({ taskId, phaseId, currentProgress, x: e.clientX, y: e.clientY });
  };

  const handleSliderChange = (e) => {
    if (!activePhase) return;
    const val = parseInt(e.target.value);
    setActivePhase(prev => ({ ...prev, currentProgress: val }));
    onUpdateProgress(activePhase.taskId, activePhase.phaseId, val);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full relative" onClick={() => setActivePhase(null)}>
      
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
        <h3 className="font-bold text-gray-500 text-sm tracking-widest">TIMELINE VIEW</h3>
        <div className="flex gap-2 items-center">
          <button 
            className="p-1 hover:bg-gray-200 rounded"
            onClick={() => {
              const d = new Date(viewStart);
              d.setDate(d.getDate() - 7);
              setViewStart(d);
            }}
          >
            <ChevronLeft size={20} />
          </button>
          
          <div className="flex gap-2 items-baseline">
            <span className="text-sm font-medium text-gray-600 w-24 text-center">
              {viewStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
            </span>
          </div>

          <button 
            className="p-1 hover:bg-gray-200 rounded"
            onClick={() => {
              const d = new Date(viewStart);
              d.setDate(d.getDate() + 7);
              setViewStart(d);
            }}
          >
            <ChevronRight size={20} />
          </button>

          <button 
            className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded font-bold text-gray-500 hover:bg-gray-200"
            onClick={() => setViewStart(getRelativeDate(-10))}
          >
            TODAY
          </button>
        </div>
      </div>

      <div className="flex border-b border-gray-200">
        <div className="w-48 flex-shrink-0 bg-white border-r border-gray-200 p-3"></div>
        <div className="flex-1 relative overflow-hidden h-14 bg-gray-50">
          <div className="absolute inset-0 flex">
            {calendarDays.map((day, i) => {
              const isFirst = day.getDate() === 1;
              const isMonthStart = i === 0 || isFirst;
              const isMilestone = day.getDate() % 5 === 0 || day.getDate() === 1; 
              return (
                <div key={i} className="flex-1 border-r border-gray-100 relative h-full flex flex-col justify-end pb-2 items-center">
                  {isMonthStart && (
                    <span className="absolute top-1 left-1 text-[10px] font-bold text-gray-400 uppercase">
                      {day.toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                  )}
                  {isMilestone && (
                    <span className="text-xs font-bold text-gray-600 z-10">{day.getDate()}</span>
                  )}
                  <div className={`w-px bg-gray-300 ${isMilestone ? 'h-3' : 'h-1'}`}></div>
                </div>
              );
            })}
          </div>

          <div 
            className="absolute top-0 bottom-0 z-20 pointer-events-none"
            style={{ 
              left: getPositionStyles(today, today, viewStart, viewEnd).left,
              transform: 'translateX(-50%)'
            }}
          >
            <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-black mx-auto"></div>
            <div className="w-px h-full bg-black/80 mx-auto"></div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto relative">
        <div className="absolute inset-0 pl-48 flex pointer-events-none">
           {calendarDays.map((_, i) => (
             <div key={i} className="flex-1 border-r border-gray-100 h-full"></div>
           ))}
        </div>

        {tasks.map(task => (
          <div key={task.id} className="flex h-24 border-b border-gray-100 relative group hover:bg-gray-50/50 transition-colors">
            
            <div className="w-48 flex-shrink-0 border-r border-gray-200 bg-white z-10 p-3 flex flex-col justify-center gap-2 group-hover:bg-gray-50/50">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase text-white tracking-wider bg-pink-400`}>
                  {task.artist}
                </span>
                {task.folderUrl && (
                  <a 
                    href={task.folderUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-1 text-gray-400 hover:text-blue-500 rounded transition-colors"
                    title="Open Task Folder"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <FolderOpen size={14} />
                  </a>
                )}
                <button 
                  onClick={(e) => { e.stopPropagation(); onEditTask(task); }}
                  className="p-1 text-gray-400 hover:text-pink-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Edit Task"
                >
                  <Pencil size={14} />
                </button>
              </div>
              <div>
                 <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-0.5">Task</div>
                 <div className="text-sm font-bold text-gray-800 leading-tight">"{task.name}"</div>
              </div>
            </div>

            <div className="flex-1 relative my-auto h-12">
              {task.phases.map((phase, idx) => {
                const pStart = idx === 0 ? task.startDate : task.phases[idx - 1].endDate;
                const pEnd = phase.endDate;

                const style = getPositionStyles(pStart, pEnd, viewStart, viewEnd);
                if (style.display === 'none') return null; 

                const colors = COLOR_MAP[phase.color] || COLOR_MAP.green;

                return (
                  <div 
                    key={phase.id}
                    className="absolute top-0 bottom-0 rounded-full overflow-hidden cursor-pointer transition-transform hover:scale-y-110 shadow-sm"
                    style={{
                      left: style.left,
                      width: style.width,
                      minWidth: '4px',
                      zIndex: 5
                    }}
                    onClick={(e) => handlePhaseClick(task.id, phase.id, phase.progress, e)}
                    title={`${phase.name}: ${phase.progress}%`}
                  >
                    <div className={`absolute inset-0 ${colors.pale}`}></div>
                    
                    <div 
                      className={`absolute left-0 top-0 bottom-0 ${colors.vivid} transition-all duration-75 ease-out`}
                      style={{ width: `${phase.progress}%` }}
                    ></div>

                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-700/70 truncate max-w-full pointer-events-none z-10 px-1">
                      {phase.name}
                    </span>

                    <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-white/50"></div>
                  </div>
                );
              })}
            </div>

          </div>
        ))}
      </div>

      {activePhase && (
        <div 
          className="absolute z-50 bg-white shadow-xl rounded-lg p-3 border border-gray-200 w-48 animate-in fade-in zoom-in duration-200"
          style={{ 
            left: Math.min(activePhase.x - 200, window.innerWidth - 300), 
            top: activePhase.y - 120 
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            onClick={() => setActivePhase(null)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          >
            <X size={14} />
          </button>

          <div className="text-xs font-bold text-gray-500 mb-2 uppercase pr-4">Update Progress</div>
          <input 
            type="range" 
            min="0" 
            max="100" 
            step="10"
            value={activePhase.currentProgress}
            onChange={handleSliderChange}
            className="w-full accent-pink-500 cursor-pointer h-2 bg-gray-200 rounded-lg appearance-none"
          />
          <div className="flex justify-between mt-2">
            <span className="text-xs font-medium text-gray-600">{activePhase.currentProgress}%</span>
            <button 
              onClick={() => {
                onUpdateProgress(activePhase.taskId, activePhase.phaseId, 100);
                setActivePhase(null);
              }}
              className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-bold hover:bg-green-200"
            >
              Done
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [artists, setArtists] = useState(INITIAL_ARTISTS);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // --- DATA LOADING FROM LOCAL STORAGE ---
  useEffect(() => {
    const savedTasks = localStorage.getItem(STORAGE_KEYS.tasks);
    const savedArtists = localStorage.getItem(STORAGE_KEYS.artists);

    if (savedTasks) {
      try {
        const parsedTasks = JSON.parse(savedTasks).map(task => ({
          ...task,
          startDate: new Date(task.startDate),
          deadline: new Date(task.deadline),
          phases: task.phases.map(p => ({
            ...p,
            endDate: new Date(p.endDate)
          }))
        }));
        setTasks(parsedTasks);
      } catch (e) {
        console.error("Error loading tasks from localStorage:", e);
      }
    } else {
      // Seed with initial data if no saved tasks
      setTasks(SEED_TASKS);
      localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(SEED_TASKS));
    }

    if (savedArtists) {
      try {
        setArtists(JSON.parse(savedArtists));
      } catch (e) {
        console.error("Error loading artists from localStorage:", e);
      }
    } else {
      localStorage.setItem(STORAGE_KEYS.artists, JSON.stringify(INITIAL_ARTISTS));
    }
  }, []);

  // --- HANDLERS (LOCAL STORAGE) ---
  const handleSaveTask = (taskData) => {
    const updatedTasks = editingTask
      ? tasks.map(t => t.id === taskData.id ? taskData : t)
      : [...tasks, taskData];

    setTasks(updatedTasks);
    localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(updatedTasks));
    setEditingTask(null);
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingTask(null);
  };

  const handleUpdateProgress = (taskId, phaseId, newProgress) => {
    const updatedTasks = tasks.map(task => {
      if (task.id !== taskId) return task;
      return {
        ...task,
        phases: task.phases.map(p => {
          if (p.id !== phaseId) return p;
          return { ...p, progress: newProgress };
        })
      };
    });

    setTasks(updatedTasks);
    localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(updatedTasks));
  };

  const handleAddArtist = (name) => {
    if (!artists.includes(name)) {
      const newArtists = [...artists, name];
      setArtists(newArtists);
      localStorage.setItem(STORAGE_KEYS.artists, JSON.stringify(newArtists));
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans text-gray-800">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Studio Schedule</h1>
            <p className="text-gray-500 mt-1">
              Changes are automatically saved locally.
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => { setEditingTask(null); setIsFormOpen(true); }}
              className="bg-black text-white px-5 py-2.5 rounded-full font-bold shadow-lg hover:bg-gray-800 transition-all flex items-center gap-2"
            >
              <Plus size={20} />
              New Task
            </button>
          </div>
        </div>

        <div className="h-[600px]">
          <Timeline 
            tasks={tasks} 
            onUpdateProgress={handleUpdateProgress}
            onEditTask={handleEditTask}
          />
        </div>
      </div>

      <TaskForm 
        isOpen={isFormOpen} 
        onClose={handleCloseForm} 
        onSave={handleSaveTask}
        artists={artists}
        onAddArtist={handleAddArtist}
        initialData={editingTask}
      />
    </div>
  );
}