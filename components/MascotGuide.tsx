import React, { useEffect, useState, useRef } from 'react';
import MascotAvatar from './MascotAvatar';
import { getSystemMessage } from '../utils/mascot';
import { getElementExplanation } from '../utils/gemini';
import { TrackingData, ElementData } from '../types';

interface MascotGuideProps {
  message: string; // System message from App
  isDashboardOpen: boolean;
  trackingData: React.MutableRefObject<TrackingData>;
  combinedElement: ElementData | null; // New element that was just created
}

const MascotGuide: React.FC<MascotGuideProps> = ({ message, isDashboardOpen, trackingData, combinedElement }) => {
  const [mascotText, setMascotText] = useState("Welcome to the Lab! I'm Atom.");
  const [isVisible, setIsVisible] = useState(true);
  
  // Track the current Gemini explanation
  const [geminiExplanation, setGeminiExplanation] = useState<string | null>(null);
  const [explanationStartTime, setExplanationStartTime] = useState<number | null>(null);
  const lastCombinedElementRef = useRef<string | null>(null);
  const geminiLoadingRef = useRef(false);

  // Track when the current text was actually displayed
  const lastUpdateRef = useRef<number>(Date.now());
  // Track the timeout to allow cleanup
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Handle new element creation - call Gemini API
  useEffect(() => {
    // Only trigger when a new element is successfully created (not errors like BOOM or X)
    if (combinedElement && 
        combinedElement.symbol !== 'BOOM' && 
        combinedElement.symbol !== 'X' &&
        combinedElement.symbol !== lastCombinedElementRef.current &&
        (message.includes('FUSION SUCCESS') || message.includes('QUIZ SUCCESS'))) {
      
      // If we have a previous explanation, ensure it was shown for at least 8 seconds
      if (geminiExplanation && explanationStartTime) {
        const timeShown = Date.now() - explanationStartTime;
        const minDisplayTime = 8000; // 8 seconds minimum
        
        if (timeShown < minDisplayTime) {
          // Wait until minimum time is reached before loading new explanation
          const remainingTime = minDisplayTime - timeShown;
          setTimeout(() => {
            // Now load the new explanation
            geminiLoadingRef.current = true;
            lastCombinedElementRef.current = combinedElement.symbol;
            
            getElementExplanation(combinedElement).then((explanation) => {
              setGeminiExplanation(explanation);
              setExplanationStartTime(Date.now());
              geminiLoadingRef.current = false;
            }).catch((error) => {
              console.error('Failed to get Gemini explanation:', error);
              geminiLoadingRef.current = false;
              setGeminiExplanation(`Amazing! You've created ${combinedElement.name}! This is a fascinating compound with unique properties.`);
              setExplanationStartTime(Date.now());
            });
          }, remainingTime);
          return;
        }
      }
      
      // Mark that we're loading a new explanation
      geminiLoadingRef.current = true;
      lastCombinedElementRef.current = combinedElement.symbol;
      
      // Call Gemini API to get explanation
      getElementExplanation(combinedElement).then((explanation) => {
        setGeminiExplanation(explanation);
        setExplanationStartTime(Date.now());
        geminiLoadingRef.current = false;
      }).catch((error) => {
        console.error('Failed to get Gemini explanation:', error);
        geminiLoadingRef.current = false;
        // Use fallback
        setGeminiExplanation(`Amazing! You've created ${combinedElement.name}! This is a fascinating compound with unique properties.`);
        setExplanationStartTime(Date.now());
      });
    }
    
    // Clear explanation when combinedElement is cleared (user resets/clears)
    // But ensure it was shown for at least 8 seconds
    if (!combinedElement && geminiExplanation && explanationStartTime) {
      const timeShown = Date.now() - explanationStartTime;
      const minDisplayTime = 8000; // 8 seconds minimum
      
      if (timeShown < minDisplayTime) {
        // Wait until minimum time is reached
        const timeoutId = setTimeout(() => {
          setGeminiExplanation(null);
          setExplanationStartTime(null);
          lastCombinedElementRef.current = null;
        }, minDisplayTime - timeShown);
        return () => clearTimeout(timeoutId);
      } else {
        setGeminiExplanation(null);
        setExplanationStartTime(null);
        lastCombinedElementRef.current = null;
      }
    }
  }, [combinedElement, message, geminiExplanation, explanationStartTime]);

  // Update text immediately when Gemini explanation is ready or changes
  useEffect(() => {
    if (geminiExplanation) {
      setMascotText(geminiExplanation);
      lastUpdateRef.current = Date.now();
      return; // Don't show system message when Gemini explanation is active
    }
  }, [geminiExplanation]);

  // Sync system message to mascot speech with smart timing
  // BUT: Don't show system message if we have an active Gemini explanation
  useEffect(() => {
    // If we have an active Gemini explanation, prioritize it over system messages
    if (geminiExplanation && explanationStartTime) {
      // Keep showing Gemini explanation as long as combinedElement exists
      // or until minimum 8 seconds have passed
      const timeShown = Date.now() - explanationStartTime;
      if (combinedElement || timeShown < 8000) {
        // Still showing combined element or haven't reached 8 seconds yet
        setMascotText(geminiExplanation);
        return;
      }
      // After 8 seconds and combinedElement is cleared, allow system messages
    }
    
    // Only show system messages if no active Gemini explanation
    if (!geminiExplanation) {
      const nextText = getSystemMessage(message);
      const isIdle = message.includes("LAB READY");
      
      const scheduleUpdate = () => {
          const now = Date.now();
          // How long has the *current* message been visible?
          const timeVisible = now - lastUpdateRef.current;
          
          // Default reaction delay
          let delay = 500; 
          
          if (isIdle) {
              // If switching back to Idle, ensure the previous message 
              // was shown for at least 3 seconds.
              const minDuration = 3000;
              if (timeVisible < minDuration) {
                  delay = minDuration - timeVisible;
              }
          }
          
          // Clear previous pending update
          if (timeoutRef.current) clearTimeout(timeoutRef.current);

          timeoutRef.current = setTimeout(() => {
              setMascotText(nextText);
              lastUpdateRef.current = Date.now(); // Reset timer upon actual update
          }, delay);
      };

      scheduleUpdate();

      return () => {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };
    }
  }, [message, geminiExplanation, explanationStartTime, combinedElement]);

  // Hide mascot when dashboard is open (since dashboard has its own)
  useEffect(() => {
    setIsVisible(!isDashboardOpen);
  }, [isDashboardOpen]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end pointer-events-none overflow-visible">
       {/* Speech Bubble */}
       <div className="relative mb-0 max-w-[18.5rem] bg-slate-950/85 backdrop-blur-xl border border-cyan-300/35 px-4 py-3 rounded-2xl rounded-br-md text-left shadow-[0_14px_38px_rgba(0,0,0,0.34),0_0_20px_rgba(95,244,241,0.14)] animate-bounce-slight origin-bottom-right transform transition-all">
          <span className="absolute left-3 top-3 h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(95,244,241,0.9)]"></span>
          <p className="pl-4 text-cyan-50 font-mono text-[12px] leading-relaxed">
            {mascotText}
          </p>
          <div className="absolute -bottom-2 right-7 h-4 w-4 rotate-45 border-b border-r border-cyan-300/35 bg-slate-950/85"></div>
       </div>

       {/* 3D Avatar Container */}
       <div className="w-36 h-36 relative group pointer-events-auto overflow-visible">
          {/* Glow Effect */}
          <div className="absolute inset-x-4 bottom-2 top-10 bg-cyan-300/20 rounded-full blur-2xl group-hover:bg-cyan-300/30 transition-all duration-500"></div>
          <div className="absolute bottom-3 left-1/2 h-5 w-20 -translate-x-1/2 rounded-full bg-black/45 blur-md"></div>
          
          {/* Container */}
          <div className="w-full h-full relative z-10 pointer-events-auto drop-shadow-[0_14px_22px_rgba(0,0,0,0.4)]">
             <MascotAvatar trackingData={trackingData} />
          </div>
       </div>

       <style>{`
         @keyframes bounce-slight {
           0%, 100% { transform: translateY(0); }
           50% { transform: translateY(-5px); }
         }
         .animate-bounce-slight {
           animation: bounce-slight 3s ease-in-out infinite;
         }
       `}</style>
    </div>
  );
};

export default MascotGuide;
