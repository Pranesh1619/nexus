"use client";

import React, { useState } from "react";
import { updateCallStage } from "../actions";

const stages = [
  "New Lead",
  "Attempted Contact",
  "Connected",
  "Enquiry",
  "Engaged",
  "Interested",
  "Desire",
  "Qualified",
  "Follow-up Needed",
  "Closed"
];

interface CallProgressionProps {
  callId: string;
  currentStage: string;
  aiScore: number;
  analysis: string;
  leadId?: string;
}

export default function CallProgression({ callId, currentStage, aiScore, analysis, leadId }: CallProgressionProps) {
  const getInitialIndex = () => {
    const idx = stages.indexOf(currentStage);
    return idx === -1 ? 0 : idx;
  };

  const [selectedStageIndex, setSelectedStageIndex] = useState(getInitialIndex());
  const maxStageIndex = getInitialIndex();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showSympathy, setShowSympathy] = useState(false);

  const handleStageClick = (index: number) => {
    setSelectedStageIndex(index);
  };

  const handleUpdatePermanent = async () => {
    if (stages[selectedStageIndex] === "Closed") {
      setShowOutcomeModal(true);
      return;
    }
    
    setIsUpdating(true);
    try {
      await updateCallStage(callId, stages[selectedStageIndex]);
    } catch (error) {
      console.error("Failed to update stage:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmOutcome = async (finalOutcome: "WON" | "LOST") => {
    setShowOutcomeModal(false);
    if (finalOutcome === "WON") {
      setShowCelebration(true);
    } else {
      setShowSympathy(true);
    }
    
    setIsUpdating(true);
    setTimeout(async () => {
      try {
        await updateCallStage(callId, "Closed", finalOutcome);
        setShowCelebration(false);
        setShowSympathy(false);
      } catch (error) {
        console.error("Failed to update closed stage:", error);
      } finally {
        setIsUpdating(false);
      }
    }, 3200);
  };

  return (
    <div className="w-100">
      {/* 1. Choice Modal */}
      {showOutcomeModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate-fade" style={{ zIndex: 1050, backgroundColor: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}>
          <div className="card border-0 shadow-lg p-4 bg-white position-relative" style={{ maxWidth: "420px", width: "90%", borderRadius: "16px" }}>
            
            {/* Absolute Close Button */}
            <button 
              onClick={() => setShowOutcomeModal(false)}
              className="position-absolute border-0 bg-transparent text-secondary p-1"
              style={{ top: "16px", right: "16px", outline: "none", cursor: "pointer" }}
              title="Close"
            >
              <i className="bi bi-x-lg" style={{ fontSize: "16px" }}></i>
            </button>

            <div className="text-center">
              <div className="display-4 mb-2">🤝</div>
              <h5 className="fw-bold text-dark">Close Deal Outcome</h5>
              <p className="text-secondary small mb-4">Please select the final outcome of this sales interaction to proceed.</p>
              
              <div className="d-flex gap-3 justify-content-center">
                <button 
                  onClick={() => handleConfirmOutcome("WON")}
                  className="btn btn-success px-4 py-2 fw-bold d-flex align-items-center gap-2"
                  style={{ borderRadius: "50px" }}
                >
                  🏆 Deal Won
                </button>
                <button 
                  onClick={() => handleConfirmOutcome("LOST")}
                  className="btn btn-outline-danger px-4 py-2 fw-bold d-flex align-items-center gap-2"
                  style={{ borderRadius: "50px" }}
                >
                  ❌ Deal Lost
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Celebration Screen */}
      {showCelebration && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center text-center animate-fade" style={{ zIndex: 9999, backgroundColor: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}>
          {/* Pure CSS Confetti Particles */}
          {Array.from({ length: 60 }).map((_, idx) => {
            const pseudoRandom = (seed: number) => {
              const x = Math.sin(seed) * 10000;
              return x - Math.floor(x);
            };
            const left = pseudoRandom(idx + 1) * 100;
            const delay = pseudoRandom(idx + 2) * 2.5;
            const size = pseudoRandom(idx + 3) * 8 + 6;
            const colorsList = ["#00A76F", "#ffc107", "#0d6efd", "#e91e63", "#9c27b0"];
            const color = colorsList[Math.floor(pseudoRandom(idx + 4) * colorsList.length)];
            return (
              <div 
                key={idx} 
                className="confetti-particle" 
                style={{ 
                  left: `${left}%`, 
                  animationDelay: `${delay}s`, 
                  backgroundColor: color,
                  width: `${size}px`,
                  height: `${size}px`
                }} 
              />
            );
          })}
          
          <div className="card border-0 shadow-lg p-5 bg-white text-center animate-fade position-relative" style={{ maxWidth: "450px", width: "90%", borderRadius: "20px" }}>
            {/* Absolute Close Button */}
            <button 
              onClick={() => setShowCelebration(false)}
              className="position-absolute border-0 bg-transparent text-secondary p-1"
              style={{ top: "16px", right: "16px", outline: "none", cursor: "pointer" }}
              title="Close"
            >
              <i className="bi bi-x-lg" style={{ fontSize: "16px" }}></i>
            </button>

            <div className="display-3 mb-3 animate-bounce">🎉 🏆 🎉</div>
            <h2 className="fw-bold text-dark mb-2">Congratulations!</h2>
            <p className="lead fw-semibold text-success mb-3" style={{ fontSize: "1.3rem" }}>This Deal is officially WON! 🚀</p>
            <p className="text-secondary small mb-0">Updating lead status and syncing dashboard performance records...</p>
          </div>
        </div>
      )}

      {/* 3. Sympathy Screen */}
      {showSympathy && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center text-center animate-fade" style={{ zIndex: 9999, backgroundColor: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}>
          <div className="card border-0 shadow-lg p-5 bg-white text-center animate-fade position-relative" style={{ maxWidth: "450px", width: "90%", borderRadius: "20px" }}>
            {/* Absolute Close Button */}
            <button 
              onClick={() => setShowSympathy(false)}
              className="position-absolute border-0 bg-transparent text-secondary p-1"
              style={{ top: "16px", right: "16px", outline: "none", cursor: "pointer" }}
              title="Close"
            >
              <i className="bi bi-x-lg" style={{ fontSize: "16px" }}></i>
            </button>

            <div className="display-3 mb-3 animate-bounce">💪 ❤️ 🤝</div>
            <h2 className="fw-bold text-dark mb-2">Keep Pushing!</h2>
            <p className="lead fw-semibold text-danger mb-3" style={{ fontSize: "1.3rem" }}>{"Every 'No' brings us closer to a 'Yes'!"}</p>
            <p className="text-secondary small mb-0">{"Recording outcome and updating sales logs. We'll win the next one!"}</p>
          </div>
        </div>
      )}

      {/* Premium Bubble-Step Pipeline */}
      <div className="card mb-4 border-0 shadow-sm overflow-hidden">
        <div className="card-header bg-white border-0 pt-4 px-4 pb-0 d-flex justify-content-between align-items-center">
          <div>
            <h6 className="fw-bold mb-0 x-small uppercase text-secondary">Progression Timeline</h6>
            <p className="text-dark small mb-0 fw-bold">Current Phase: <span className="text-primary">{stages[selectedStageIndex]}</span></p>
          </div>
          {selectedStageIndex !== maxStageIndex && (
            <button 
              onClick={handleUpdatePermanent}
              disabled={isUpdating}
              className="btn btn-sm btn-outline-primary px-3 py-1 x-small fw-bold"
            >
              {isUpdating ? "Syncing..." : `Set as Current Status`}
            </button>
          )}
        </div>
        
        <div className="p-4 p-md-5">
          <div className="position-relative pb-4">
            {/* The Horizontal Path */}
            <div className="progress position-absolute w-100" style={{ height: "2px", top: "28px", backgroundColor: "#f0f0f0" }}>
              <div 
                className="progress-bar bg-success" 
                role="progressbar" 
                style={{ 
                  width: `${(maxStageIndex / (stages.length - 1)) * 100}%`,
                  transition: 'width 0.5s ease-in-out'
                }}
              ></div>
            </div>
            
            {/* Bubble Steps */}
            <div className="d-flex justify-content-between position-relative z-1">
              {stages.map((stage, index) => {
                const isReached = index <= maxStageIndex;
                const isSelected = index === selectedStageIndex;
                
                return (
                  <div key={stage} className="text-center" style={{ width: "60px" }}>
                    <div 
                      onClick={() => handleStageClick(index)}
                      className={`bubble-step ${isSelected ? 'active' : ''} ${isReached ? 'reached' : ''}`}
                    >
                      <div className="bubble-box shadow-sm">
                        {index + 1}
                        <div className="bubble-pointer"></div>
                      </div>
                      <div className="bubble-dot"></div>
                      <div className={`bubble-label mt-2 x-small fw-bold transition-all ${isSelected ? 'text-primary' : isReached ? 'text-success' : 'text-secondary opacity-50'}`}>
                        {stage}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>



      <style jsx>{`
        .bubble-step {
          position: relative;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .bubble-box {
          width: 38px;
          height: 28px;
          background: #fff;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 800;
          color: #637381;
          margin: 0 auto 12px;
          position: relative;
          transition: all 0.3s ease;
        }
        .bubble-pointer {
          position: absolute;
          bottom: -5px;
          left: 50%;
          transform: translateX(-50%) rotate(45deg);
          width: 8px;
          height: 8px;
          background: #fff;
          border-right: 1px solid #e0e0e0;
          border-bottom: 1px solid #e0e0e0;
        }
        .bubble-dot {
          width: 12px;
          height: 12px;
          background: #fff;
          border: 2px solid #e0e0e0;
          border-radius: 50%;
          margin: 0 auto;
          position: relative;
          z-index: 2;
          transition: all 0.3s ease;
        }
        .bubble-step.reached .bubble-box {
          background: #00A76F;
          color: #fff;
          border-color: #00A76F;
        }
        .bubble-step.reached .bubble-pointer {
          background: #00A76F;
          border-color: #00A76F;
        }
        .bubble-step.reached .bubble-dot {
          background: #00A76F;
          border-color: #fff;
        }
        .bubble-step.active .bubble-box {
          background: #0d6efd;
          color: #fff;
          border-color: #0d6efd;
        }
        .bubble-step.active .bubble-pointer {
          background: #0d6efd;
          border-color: #0d6efd;
        }
        .bubble-step.active .bubble-dot {
          background: #0d6efd;
          border-color: #fff;
        }
        .bubble-label {
          font-size: 10.5px;
          text-transform: none;
          letter-spacing: 0.2px;
          max-width: 75px;
          margin: 0 auto;
          line-height: 1.25;
        }
        @keyframes confetti-fall {
          0% { transform: translateY(-100%) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
        }
        .confetti-particle {
          position: fixed;
          top: -20px;
          z-index: 9999;
          border-radius: 50%;
          animation: confetti-fall 3.5s linear infinite;
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        .animate-bounce {
          animation: bounce 1.5s infinite ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}


