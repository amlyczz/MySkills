import React from 'react';
import { AbsoluteFill } from 'remotion';

export const LayoutDispatcher: React.FC<{ segment: any }> = ({ segment }) => {
  const { layout } = segment;
  const layoutId = layout?.layout_id || 'hero-center';

  // Basic implementation to prove architecture works
  // We will build out robust layouts later
  return (
    <AbsoluteFill style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: 80,
      color: '#fff'
    }}>
      <h1 style={{ fontSize: 60, marginBottom: 20 }}>Layout: {layoutId}</h1>
      <p style={{ fontSize: 40, textAlign: 'center' }}>{segment.voiceover?.text || "No voiceover"}</p>
    </AbsoluteFill>
  );
};
