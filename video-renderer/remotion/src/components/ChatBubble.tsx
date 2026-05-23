import React, { type ReactNode } from "react";
import { colors } from "../theme/tokens";

interface Props {
  type: "user" | "agent";
  children: ReactNode;
  style?: React.CSSProperties;
}

export const ChatBubble: React.FC<Props> = ({ type, children, style }) => (
  <div style={{
    alignSelf: type === "user" ? "flex-end" : "flex-start",
    background: type === "user" ? colors.userBubble : colors.agentBubble,
    border: `1px solid ${type === "user" ? colors.userBubbleBorder : colors.agentBubbleBorder}`,
    borderRadius: type === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
    padding: "10px 16px",
    maxWidth: "80%",
    fontSize: 14,
    lineHeight: 1.5,
    color: type === "user" ? colors.text : colors.textDim,
    fontFamily: "Inter, sans-serif",
    letterSpacing: "0.02em",
    ...style,
  }}>
    {children}
  </div>
);
