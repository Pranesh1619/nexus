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
}

export default function CallProgression({ callId, currentStage, aiScore, analysis }: CallProgressionProps) {
  const getInitialIndex = () => {
    const idx = stages.indexOf(currentStage);
    return idx === -1 ? 0 : idx;
  };

  const [selectedStageIndex, setSelectedStageIndex] = useState(getInitialIndex());
  const maxStageIndex = getInitialIndex();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStageClick = (index: number) => {
    setSelectedStageIndex(index);
  };

  const handleUpdatePermanent = async () => {
    setIsUpdating(true);
    try {
      await updateCallStage(callId, stages[selectedStageIndex]);
    } catch (error) {
      console.error("Failed to update stage:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="w-100">
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

      {/* Analysis Grid */}
      <div className="row g-4 mb-4">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h6 className="fw-bold mb-0 x-small uppercase text-secondary">
                  <i className="bi bi-cpu text-primary"></i> AI Analysis for {stages[selectedStageIndex]}
                </h6>
                <div className="d-flex align-items-center gap-2 bg-light px-3 py-1 rounded-pill">
                  <span className="x-small text-secondary fw-bold">PROBABILITY:</span>
                  <span className="fw-bold text-success small">{calculateDynamicScore(selectedStageIndex, aiScore)}%</span>
                </div>
              </div>
              <div className="p-3 bg-light rounded-3 border-start border-primary border-4 mb-3">
                <p className="mb-0 text-dark small" style={{ lineHeight: '1.6' }}>
                  {getMockedAnalysis(selectedStageIndex, analysis)}
                </p>
              </div>

              <div className="row g-3">
                <div className="col-md-6">
                  <div className="p-2 px-3 border rounded-3 bg-white">
                    <h6 className="x-small fw-bold text-secondary text-uppercase mb-1">Status Summary</h6>
                    <div className="x-small text-dark fw-bold">Positive Sentiment Detected</div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="p-2 px-3 border rounded-3 bg-white">
                    <h6 className="x-small fw-bold text-secondary text-uppercase mb-1">Key Signals</h6>
                    <div className="d-flex flex-wrap gap-1 mt-1">
                      <span className="badge bg-primary bg-opacity-10 text-primary x-small fw-normal">Engaged</span>
                      <span className="badge bg-success bg-opacity-10 text-success x-small fw-normal">Verified</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body p-4">
              <h6 className="fw-bold mb-3 x-small uppercase text-secondary">Signal Analysis</h6>
              <div className="space-y-3">
                <div className="p-2 px-3 border rounded-3 mb-3 bg-light bg-opacity-50">
                  <div className="text-secondary x-small fw-bold uppercase mb-1">Sentiment</div>
                  <div className={`small fw-bold ${selectedStageIndex > 3 ? 'text-success' : 'text-warning'}`}>
                    {selectedStageIndex > 3 ? 'Highly Positive' : 'Neutral'} 
                  </div>
                </div>
                <div className="p-2 px-3 border rounded-3">
                  <div className="text-secondary x-small fw-bold uppercase mb-1">Buying Intensity</div>
                  <div className="progress" style={{ height: '4px' }}>
                    <div 
                      className={`progress-bar ${selectedStageIndex > 6 ? 'bg-success' : selectedStageIndex > 3 ? 'bg-primary' : 'bg-warning'}`} 
                      style={{ width: `${(selectedStageIndex + 1) * 10}%` }}
                    ></div>
                  </div>
                </div>
              </div>
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
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          max-width: 60px;
          margin: 0 auto;
        }
      `}</style>
    </div>
  );
}

function getMockedAnalysis(index: number, baseAnalysis: string) {
  const mockData = [
    "New Lead record identified. System awaiting initial interaction.",
    "First touchpoint attempted. Awaiting response from lead.",
    "Call successfully connected. Identity and intent verified.",
    "Lead raised an Enquiry regarding specific business solutions and service availability.",
    "Lead engaged in active dialogue, asking deep technical questions and requirement gathering.",
    "Lead expressed strong Interest in our managed services and core platform features.",
    "Lead showed high Desire to implement the solution, requesting specific ROI documentation.",
    "Lead Qualified for next steps. Budget and decision-makers identified.",
    "Follow-up scheduled. Draft contract and proposal shared for review.",
    "DEAL CLOSED. Lead converted to client. Onboarding process initiated."
  ];
  return mockData[index] || baseAnalysis;
}

function calculateDynamicScore(index: number, baseScore: number) {
  const stageWeight = (index / (stages.length - 1)) * 40; 
  const fixedScore = 50; 
  return Math.min(100, Math.floor(fixedScore + stageWeight + (baseScore / 10)));
}
