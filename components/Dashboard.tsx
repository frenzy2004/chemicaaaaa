import React, { useEffect, useState, useRef } from 'react';
import { ElementData } from '../types';
import { ELEMENTS, COMBINATIONS } from '../constants';
import { getMascotFact } from '../utils/mascot';
import MascotAvatar from './MascotAvatar';
import { TrackingData } from '../types';
import clickSound from '../assets/sounds/click.wav';

interface DashboardProps {
  isOpen: boolean;
  onClose: () => void;
  savedElements: ElementData[];
  labSlots: ElementData[];
  onStartQuiz: (difficulty: 'easy' | 'medium') => void;
}

const Dashboard: React.FC<DashboardProps> = ({ isOpen, onClose, savedElements, labSlots, onStartQuiz }) => {
  const [allDiscoverables, setAllDiscoverables] = useState<ElementData[]>([]);
  const [selectedInfo, setSelectedInfo] = useState<ElementData | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<ElementData[]>([]);
  const MAX_SLOTS = 8;

  // Click sound helper
  const playClickSound = () => {
    try {
      const audio = new Audio(clickSound);
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Ignore errors if audio fails to play (e.g., user hasn't interacted yet)
      });
    } catch (error) {
      // Ignore errors
    }
  };

  // Tracking Ref for the Dashboard Avatar
  const dashboardTrackingRef = useRef<TrackingData>({
    left: { 
      pinchDistance: 0, 
      isPinching: false, 
      isPointing: false, 
      position: {x: 0.5, y: 0.5, z: 0}, 
      indexPosition: {x: 0.5, y: 0.5, z: 0},
      isDetected: false,
      isPresent: false
    },
    right: { 
      pinchDistance: 0, 
      isPinching: false, 
      isPointing: false, 
      position: {x: 0.5, y: 0.5, z: 0}, 
      indexPosition: {x: 0.5, y: 0.5, z: 0},
      isDetected: false,
      isPresent: false
    },
    isClapping: false,
    isResetGesture: false,
    isClosedFist: false,
    isSixtySevenGesture: false,
    handDistance: 1000,
    cameraAspect: 1.77
  });

  // Sync selectedSlots with labSlots prop (which updates when new elements are created)
  useEffect(() => {
    setSelectedSlots(labSlots);
  }, [labSlots]); // Update whenever labSlots changes (including when new elements are created in lab)

  // Save slots to localStorage whenever they change
  useEffect(() => {
    if (selectedSlots.length > 0) {
      localStorage.setItem('labSlots', JSON.stringify(selectedSlots));
    }
  }, [selectedSlots]);

  useEffect(() => {
    // 1. Base elements (Level 1) - assign level 1 explicitly
    const baseElements = ELEMENTS.map(el => ({ ...el, level: 1 }));
    
    // 2. Get all unique combination results (Level 2) - assign level 2 explicitly
    const comboResults = COMBINATIONS.map(c => ({ ...c.result, level: 2 }));
    // Deduplicate by symbol
    const uniqueCombos = comboResults.filter((v, i, a) => a.findIndex(t => t.symbol === v.symbol) === i);
    
    // 3. Combine base elements + compounds
    const fullList = [...baseElements, ...uniqueCombos];
    setAllDiscoverables(fullList);
  }, []);

  // Effect to track selected element position
  useEffect(() => {
    if (selectedInfo && isOpen) {
        // Small delay to allow render
        setTimeout(() => {
            const el = document.getElementById(`dashboard-item-${selectedInfo.symbol}`);
            if (el) {
                const rect = el.getBoundingClientRect();
                // Calculate normalized center (0-1) relative to window
                const centerX = (rect.left + rect.width / 2) / window.innerWidth;
                const centerY = (rect.top + rect.height / 2) / window.innerHeight;
                
                // Update ref to simulate a "hand" at the element's position
                // We use the 'left' hand slot for this target
                dashboardTrackingRef.current.left.position.x = centerX;
                dashboardTrackingRef.current.left.position.y = centerY;
                dashboardTrackingRef.current.left.isDetected = true;
                dashboardTrackingRef.current.left.isPresent = true;
            }
        }, 50);
    } else {
        // Go back to idle look
        dashboardTrackingRef.current.left.isDetected = false;
        dashboardTrackingRef.current.left.isPresent = false;
    }
  }, [selectedInfo, isOpen]);

  // Calculate progress
  const unlockedCount = allDiscoverables.filter(d => 
    savedElements.some(s => s.symbol === d.symbol) || ELEMENTS.some(e => e.symbol === d.symbol)
  ).length;
  const totalDiscoverables = allDiscoverables.length || ELEMENTS.length;
  const progressPercent = totalDiscoverables > 0 ? Math.floor((unlockedCount / totalDiscoverables) * 100) : 0;
  
  const isUnlocked = (el: ElementData) => {
    // Base elements (Level 1, atomicNumber > 0) are always unlocked
    if (el.level === 1 && el.atomicNumber > 0) return true;
    // Compounds (Level 2+) need to be discovered/saved
    return savedElements.some(s => s.symbol === el.symbol);
  };

  // Group elements by Level and sort them
  const getElementsByLevel = (level: number) => {
      // Level 1: Only base elements (from ELEMENTS array, atomicNumber > 0)
      // Compounds (atomicNumber === 0) should NEVER appear in Level 1
      if (level === 1) {
          const baseElements = allDiscoverables.filter(el => 
              el.atomicNumber > 0 && (el.level === 1 || !el.level)
          );
          return baseElements.sort((a, b) => a.atomicNumber - b.atomicNumber);
      }
      
      // Level 2: Only compounds (from COMBINATIONS, atomicNumber === 0)
      // Base elements (atomicNumber > 0) should NEVER appear in Level 2
      if (level === 2) {
          const compounds = allDiscoverables.filter(el => 
              el.atomicNumber === 0 && (el.level === 2 || !el.level)
          );
          return compounds.sort((a, b) => a.symbol.localeCompare(b.symbol));
      }
      
      // Level 3+: Future complex compounds
      const filtered = allDiscoverables.filter(el => el.level === level);
      return filtered.sort((a, b) => a.symbol.localeCompare(b.symbol));
  };

  // Check if element is in selected slots
  const isInSlot = (el: ElementData) => {
    return selectedSlots.some(s => s.symbol === el.symbol);
  };

  // Toggle element in/out of slots
  const toggleSlot = (el: ElementData) => {
    if (isInSlot(el)) {
      // Remove from slots
      setSelectedSlots(prev => prev.filter(s => s.symbol !== el.symbol));
    } else {
      // Add to slots (if not at max)
      if (selectedSlots.length < MAX_SLOTS) {
        setSelectedSlots(prev => [...prev, el]);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-lg flex flex-col items-center justify-center text-white p-6 md:p-8 animate-fadeIn">
      
      {/* Header */}
      <div className="w-full max-w-6xl flex justify-between items-end gap-6 mb-6 border-b border-cyan-300/20 pb-4">
        <div>
          <h1 className="text-4xl md:text-6xl font-['Orbitron'] font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            ATOMIS LAB
          </h1>
          <p className="text-sm font-mono text-cyan-200/60 tracking-widest mt-2">RESEARCH & SYNTHESIS INTERFACE</p>
        </div>
        <div className="min-w-[12rem] rounded-xl border border-cyan-300/20 bg-cyan-950/10 px-4 py-3 shadow-[0_0_20px_rgba(34,211,238,0.06)]">
           <div className="flex items-center justify-between gap-4 text-[10px] text-cyan-100/60 font-mono uppercase tracking-widest">
              <span>Discovery Progress</span>
              <span>{unlockedCount}/{totalDiscoverables}</span>
           </div>
           <div className="mt-1 text-right text-2xl font-bold font-mono text-cyan-300">{progressPercent}%</div>
           <div className="mt-2 h-1.5 rounded-full bg-cyan-950/80 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-cyan-400 to-blue-400 transition-all duration-500 shadow-[0_0_14px_rgba(34,211,238,0.8)]" 
                style={{ width: `${progressPercent}%` }}
              ></div>
           </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="flex-1 w-full max-w-6xl flex gap-6 overflow-hidden">
          
          {/* Element Grid - Grouped by Level */}
          <div className="flex-1 overflow-y-auto pr-4 no-scrollbar flex flex-col gap-7 pb-20">
             
             {/* LEVEL 1: BASE ELEMENTS */}
             <div>
                <h3 className="text-sm font-mono text-cyan-400/80 tracking-widest mb-3 border-b border-cyan-500/20 pb-2">LEVEL 1 // BASE ELEMENTS</h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                    {getElementsByLevel(1).map(el => (
                        <DashboardItem 
                            key={el.symbol} 
                            el={el} 
                            unlocked={true} 
                            inSlot={isInSlot(el)}
                            onClick={() => setSelectedInfo(el)}
                            onToggleSlot={() => toggleSlot(el)}
                            canAdd={selectedSlots.length < MAX_SLOTS}
                        />
                    ))}
                </div>
             </div>

             {/* LEVEL 2: COMPOUNDS */}
             <div>
                <h3 className="text-sm font-mono text-purple-300/80 tracking-widest mb-3 border-b border-purple-400/20 pb-2">LEVEL 2 // COMPOUNDS</h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                    {getElementsByLevel(2).map(el => (
                        <DashboardItem 
                            key={el.symbol} 
                            el={el} 
                            unlocked={isUnlocked(el)} 
                            inSlot={isInSlot(el)}
                            onClick={() => isUnlocked(el) && setSelectedInfo(el)}
                            onToggleSlot={() => isUnlocked(el) && toggleSlot(el)}
                            canAdd={selectedSlots.length < MAX_SLOTS}
                        />
                    ))}
                </div>
             </div>

             {/* LEVEL 3: COMING SOON */}
             <div>
                <h3 className="text-sm font-mono text-yellow-300/40 tracking-widest mb-3 border-b border-yellow-500/10 pb-2">LEVEL 3 // COMPLEX (LOCKED)</h3>
                 <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 opacity-90">
                    <LockedPreviewCard label="CHAIN" />
                    <LockedPreviewCard label="CRYSTAL" />
                </div>
             </div>

          </div>

          {/* Mascot / Info Panel */}
          <div className="w-[19rem] flex-shrink-0 flex flex-col gap-3">
             
             {/* Quiz Section */}
             <div className="rounded-2xl bg-[radial-gradient(circle_at_50%_26%,rgba(168,85,247,0.20),transparent_62%),linear-gradient(to_bottom,rgba(88,28,135,0.18),rgba(0,0,0,0.52))] border border-purple-300/30 p-4 shadow-[0_0_24px_rgba(168,85,247,0.09)]">
                <div className="text-xs font-mono text-purple-400 uppercase tracking-widest mb-3">Training Modules</div>
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                          playClickSound();
                          onStartQuiz('easy');
                        }}
                        className="flex-1 rounded-xl bg-purple-950/45 hover:bg-purple-900/60 border border-purple-300/35 py-2.5 px-3 text-left transition-all interactable-btn shadow-[inset_0_0_16px_rgba(168,85,247,0.08)] hover:shadow-[0_0_14px_rgba(168,85,247,0.18),inset_0_0_16px_rgba(168,85,247,0.10)]"
                        id="dashboard-quiz-easy"
                    >
                        <div className="flex items-center justify-between text-[9px] text-purple-200 font-mono uppercase tracking-widest">
                            <span>Easy</span>
                            <span className="h-1.5 w-1.5 bg-cyan-300 shadow-[0_0_8px_rgba(103,232,249,0.9)]"></span>
                        </div>
                        <div className="mt-1 text-xs font-bold text-white">Create Water</div>
                    </button>
                    <button
                        onClick={() => {
                          playClickSound();
                          onStartQuiz('medium');
                        }}
                        className="flex-1 rounded-xl bg-purple-950/45 hover:bg-purple-900/60 border border-purple-300/35 py-2.5 px-3 text-left transition-all interactable-btn shadow-[inset_0_0_16px_rgba(168,85,247,0.08)] hover:shadow-[0_0_14px_rgba(168,85,247,0.18),inset_0_0_16px_rgba(168,85,247,0.10)]"
                         id="dashboard-quiz-medium"
                    >
                        <div className="flex items-center justify-between text-[9px] text-purple-200 font-mono uppercase tracking-widest">
                            <span>Medium</span>
                            <span className="h-1.5 w-1.5 bg-yellow-300 shadow-[0_0_8px_rgba(253,224,71,0.85)]"></span>
                        </div>
                        <div className="mt-1 text-xs font-bold text-white">Soda Water</div>
                    </button>
                </div>
             </div>

             {/* Slot Management Panel */}
             <div className="rounded-2xl bg-[radial-gradient(circle_at_50%_28%,rgba(34,211,238,0.16),transparent_62%),linear-gradient(to_bottom,rgba(8,145,178,0.16),rgba(0,0,0,0.54))] border border-cyan-300/30 p-4 shadow-[0_0_24px_rgba(34,211,238,0.08)]">
                <div className="flex items-center justify-between mb-3">
                    <div className="text-xs font-mono text-cyan-400 uppercase tracking-widest">Lab Slots</div>
                    <div className="text-sm font-bold font-mono text-cyan-300">
                        {selectedSlots.length} / {MAX_SLOTS}
                    </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                    {Array.from({ length: MAX_SLOTS }).map((_, i) => {
                        const slotElement = selectedSlots[i];
                        return (
                            <div
                                key={i}
                                className={`
                                    aspect-square rounded-xl flex items-center justify-center text-xs font-bold font-['Orbitron'] transition-colors
                                    ${slotElement 
                                        ? 'border-2 border-cyan-300 bg-cyan-950/35 shadow-[0_0_12px_rgba(34,211,238,0.22),inset_0_0_18px_rgba(34,211,238,0.10)]' 
                                        : 'border border-white/15 bg-black/35 border-dashed text-white/25'
                                    }
                                `}
                                style={slotElement ? { color: slotElement.color } : {}}
                            >
                                {slotElement ? slotElement.symbol : '+'}
                            </div>
                        );
                    })}
                </div>
                {selectedSlots.length === 0 && (
                    <div className="text-xs text-yellow-400/70 font-mono mt-2 text-center">
                        Select elements to add to lab slots
                    </div>
                )}
             </div>

             {/* Mascot Area */}
             <div className="rounded-2xl bg-gradient-to-b from-slate-900/75 to-black border border-slate-600/45 p-4 relative overflow-hidden flex flex-col shadow-[0_14px_34px_rgba(0,0,0,0.3)]">
                 {/* Background Element Symbol - Top Left, 50% space */}
                 {selectedInfo && (
                     <div 
                         className="absolute -top-5 -left-1 pointer-events-none"
                         style={{ 
                             width: '50%',
                             height: '50%',
                             fontSize: '7.5rem',
                             fontWeight: 'bold',
                             fontFamily: 'Orbitron, sans-serif',
                             color: selectedInfo.color,
                             opacity: 0.13,
                             zIndex: 0,
                             display: 'flex',
                             alignItems: 'flex-start',
                             justifyContent: 'flex-start',
                             padding: '1rem'
                         }}
                     >
                         {selectedInfo.symbol}
                     </div>
                 )}
                 {/* Mascot Graphic (Live 3D Render) */}
                 <div className="w-full h-32 relative mb-3 border-b border-white/10" style={{ zIndex: 1 }}>
                    {/* Glow */}
                    <div className="absolute bottom-3 right-4 w-24 h-16 bg-cyan-300/16 blur-3xl animate-pulse"></div>
                    {/* Avatar - Positioned bottom right */}
                    <div className="absolute bottom-0 right-1 w-32 h-32">
                        <MascotAvatar trackingData={dashboardTrackingRef} />
                    </div>
                 </div>

                 <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-cyan-500 rounded-full animate-ping"></div>
                        <div className="text-xs font-bold text-cyan-400 font-mono uppercase tracking-widest">Atom Analysis</div>
                    </div>
                    
                    <p className="text-xs text-cyan-50/80 leading-relaxed font-mono min-h-[88px]">
                        {selectedInfo 
                          ? getMascotFact(selectedInfo)
                          : "Select an element from the grid to view its properties. I'll analyze the chemical structure for you!"}
                    </p>
                 </div>
             </div>

             {/* Close Button */}
             <button 
                id="dashboard-close-btn"
                onClick={() => {
                  playClickSound();
                  onClose();
                }}
                disabled={selectedSlots.length === 0}
                className={`
                    interactable-btn mt-auto w-full rounded-xl py-4 font-bold font-['Orbitron'] tracking-widest transition-all
                    ${selectedSlots.length === 0
                        ? 'bg-slate-700/80 text-slate-400 cursor-not-allowed border border-white/10'
                        : 'bg-cyan-500 hover:bg-cyan-300 text-black shadow-[0_0_20px_rgba(8,145,178,0.4)] hover:shadow-[0_0_30px_rgba(34,211,238,0.6)]'
                    }
                `}
             >
                {selectedSlots.length === 0 ? 'SELECT SLOTS TO ENTER' : 'ENTER LABORATORY'}
             </button>
          </div>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};

const LockedQuestionMark = ({ color, caption }: { color: string; caption: string }) => (
  <div className="relative z-10 flex h-full w-full flex-col items-center justify-center">
    <div
      className="font-['Orbitron'] text-4xl font-bold leading-none"
      style={{
        color,
        textShadow: `0 0 18px ${color}66`,
      }}
    >
      ?
    </div>
    <div className="mt-3 text-[8px] font-mono uppercase tracking-widest text-white/30">{caption}</div>
  </div>
);

const LockedPreviewCard = ({ label }: { label: string }) => (
  <div className="aspect-square rounded-xl border border-yellow-300/15 bg-black/60 relative overflow-hidden cursor-not-allowed shadow-[inset_0_0_24px_rgba(253,224,71,0.03)]">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(253,224,71,0.12),transparent_58%)]"></div>
    <div className="absolute top-2 left-2 z-10 text-[9px] font-mono text-yellow-100/45 tracking-widest">LOCKED</div>
    <LockedQuestionMark color="#facc15" caption={label} />
  </div>
);

const DashboardItem = ({ 
    el, 
    unlocked, 
    inSlot, 
    onClick, 
    onToggleSlot, 
    canAdd 
}: { 
    el: ElementData, 
    unlocked: boolean, 
    inSlot: boolean,
    onClick: () => void,
    onToggleSlot: () => void,
    canAdd: boolean
}) => {
  // Click sound helper
  const playClickSound = () => {
    try {
      const audio = new Audio(clickSound);
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Ignore errors if audio fails to play (e.g., user hasn't interacted yet)
      });
    } catch (error) {
      // Ignore errors
    }
  };

  const handleClick = () => {
    if (!unlocked) return;
    playClickSound();
    onClick();
  };

  const handleDoubleClick = () => {
    if (unlocked) {
      playClickSound();
      onToggleSlot();
    }
  };

  return (
    <div 
    id={`dashboard-item-${el.symbol}`} // Hook for hit test
    className={`
        interactable-btn
        aspect-square rounded-xl border flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300
        ${unlocked 
            ? inSlot
                ? 'cursor-pointer border-2 border-cyan-300 bg-cyan-950/32 hover:bg-cyan-900/28 shadow-[0_0_18px_rgba(34,211,238,0.34)]'
                : 'cursor-pointer border-white/20 bg-white/5 hover:bg-white/10 hover:border-cyan-300/70 hover:-translate-y-0.5 hover:shadow-[0_0_16px_rgba(34,211,238,0.16)]' 
            : 'cursor-default border-purple-300/10 bg-black/70'}
    `}
    onClick={handleClick}
    onDoubleClick={handleDoubleClick}
    style={!unlocked ? { borderColor: `${el.color}22` } : {}}
    >
    {unlocked ? (
        <>
            {el.atomicNumber > 0 && (
                 <div className="absolute top-2 left-2 text-base font-mono text-white/50">{el.atomicNumber}</div>
            )}
            {inSlot && (
                <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.85)] border border-white/30"></div>
            )}
            {!inSlot && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_#00ff00]"></div>
            )}
            <div className="text-2xl md:text-3xl font-bold font-['Orbitron'] mb-1 drop-shadow-[0_0_10px_rgba(255,255,255,0.12)]" style={{color: el.color}}>{el.symbol}</div>
            <div className="text-[8px] md:text-[10px] font-mono text-cyan-50/50 uppercase tracking-wider text-center px-1">{el.name}</div>
            {unlocked && (
                <div className="absolute bottom-1 text-[8px] font-mono text-cyan-400/60">
                    {inSlot ? 'IN SLOT' : canAdd ? 'DBL-CLICK TO ADD' : 'SLOTS FULL'}
                </div>
            )}
        </>
    ) : (
        <>
            <div
                className="absolute inset-0 opacity-80"
                style={{ background: `radial-gradient(circle at 50% 45%, ${el.color}20, transparent 58%)` }}
            ></div>
            <div className="absolute top-2 left-2 z-10 text-[9px] font-mono text-white/40 tracking-widest">LOCKED</div>
            <div
                className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: `${el.color}55`, boxShadow: `0 0 10px ${el.color}77` }}
            ></div>
            <LockedQuestionMark color={el.color} caption="Unknown" />
        </>
    )}
    </div>
  );
};

export default Dashboard;
