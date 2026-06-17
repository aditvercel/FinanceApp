"use client";

import { useState } from "react";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const AVATAR_COLORS = [
  "bg-blue-600",
  "bg-emerald-600",
  "bg-purple-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-cyan-600",
  "bg-indigo-600",
  "bg-teal-600",
];

function getColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

interface AvatarCircleProps {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "w-6 h-6 text-xs",
  md: "w-8 h-8 text-sm",
  lg: "w-10 h-10 text-base",
};

export function AvatarCircle({ name, avatarUrl, size = "md", className = "" }: AvatarCircleProps) {
  const [imgError, setImgError] = useState(false);
  const initials = getInitials(name);
  const color = getColor(name);
  const dim = sizeMap[size];

  if (avatarUrl && !imgError) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        onError={() => setImgError(true)}
        className={`${dim} rounded-full object-cover shrink-0 border-2 border-white ${className}`}
      />
    );
  }

  return (
    <div
      className={`${dim} ${color} rounded-full flex items-center justify-center text-white font-bold shrink-0 border-2 border-white ${className}`}
      title={name}
    >
      {initials}
    </div>
  );
}

interface AvatarUser {
  name: string;
  avatarUrl?: string | null;
}

interface AvatarStackProps {
  users: AvatarUser[];
  max?: number;
  size?: "sm" | "md" | "lg";
}

export function AvatarStack({ users, max = 3, size = "md" }: AvatarStackProps) {
  const visible = users.slice(0, max);
  const remaining = users.length - max;

  if (users.length === 0) return null;

  return (
    <div className="flex items-center">
      {visible.map((user, i) => (
        <div
          key={i}
          className="relative"
          style={{ marginLeft: i === 0 ? 0 : -8, zIndex: visible.length - i }}
        >
          <AvatarCircle name={user.name} avatarUrl={user.avatarUrl} size={size} />
        </div>
      ))}
      {remaining > 0 && (
        <div
          className={`${sizeMap[size]} bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-medium text-xs shrink-0 border-2 border-white`}
          style={{ marginLeft: -8 }}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}
