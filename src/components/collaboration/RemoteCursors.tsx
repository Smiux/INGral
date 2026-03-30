import React from 'react';
import { useLocation } from 'react-router-dom';
import { useCollaboration, type Collaborator } from '../collaboration';

interface RemoteCursorProps {
  collaborator: Collaborator;
}

const RemoteCursor: React.FC<RemoteCursorProps> = ({ collaborator }) => {
  if (!collaborator.mousePosition) {
    return null;
  }

  return (
    <div
      className="fixed pointer-events-none z-[9999] transition-all duration-75 ease-out"
      style={{
        'left': collaborator.mousePosition.x,
        'top': collaborator.mousePosition.y,
        'transform': 'translate(-2px, -2px)'
      }}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        className="drop-shadow-md"
      >
        <path
          d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.48 0 .72-.58.38-.92L5.88 2.87a.5.5 0 0 0-.38.34z"
          fill={collaborator.color}
          stroke="white"
          strokeWidth="1.5"
        />
      </svg>
      <div
        className="absolute left-5 top-4 px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap"
        style={{
          'backgroundColor': collaborator.color,
          'color': 'white'
        }}
      >
        {collaborator.name}
      </div>
    </div>
  );
};

export const RemoteCursors: React.FC = () => {
  const { collaborators } = useCollaboration();
  const location = useLocation();

  const samePageCollaborators = collaborators.filter(
    (collaborator) => collaborator.currentPath === location.pathname
  );

  return (
    <>
      {samePageCollaborators.map((collaborator) => (
        <RemoteCursor
          key={collaborator.id}
          collaborator={collaborator}
        />
      ))}
    </>
  );
};
